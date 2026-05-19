
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { employeeAssessmentService } from '../../services/employeeAssessmentService';
import { signatureService } from '../../services/signatureService';
import SignatureModal from '../../components/signature/SignatureModal';
import type { Signature } from '../../types/signature';
import type {
  AssessmentItem, AssessmentRequest, AssessmentScoreBand,
  AssessmentStatus, EmployeeAssessment,
} from '../../types/employeeAssessment';
import './employee-self-assessment.css';

const LOCKED: AssessmentStatus[] = [
  'SUBMITTED','PENDING_MANAGER','PENDING_DEPARTMENT_HEAD','PENDING_HR','APPROVED','DECLINED','REJECTED',
];
const RATINGS = [1, 2, 3, 4, 5];
type Toast = { id: number; type: 'success' | 'error' | 'info'; msg: string };
let toastSeq = 0;

const errMsg = (e: unknown, fb: string) => {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const r = (e as any).response;
    return r?.data?.message || r?.data?.error || fb;
  }
  return e instanceof Error ? e.message || fb : fb;
};

const flat = (a: EmployeeAssessment): AssessmentItem[] =>
  a.sections.flatMap(s => s.items.map(i => ({ ...i, sectionTitle: i.sectionTitle || s.title })));

const needsYN = (i: AssessmentItem) => { const t = i.responseType ?? 'YES_NO_RATING'; return t === 'YES_NO' || t === 'YES_NO_RATING'; };
const needsR = (i: AssessmentItem) => { const t = i.responseType ?? 'YES_NO_RATING'; return t === 'RATING' || t === 'YES_NO_RATING'; };

const missing = (i: AssessmentItem) => {
  if (i.isRequired === false) return false;
  const t = i.responseType ?? 'YES_NO_RATING';
  if (t === 'TEXT') return !i.comment?.trim();
  if (t === 'YES_NO') return i.yesNoAnswer == null;
  if (t === 'YES_NO_RATING') return i.yesNoAnswer == null || i.rating == null;
  return i.rating == null;
};

const payload = (a: EmployeeAssessment): AssessmentRequest => ({
  formId: a.formId ?? a.assessmentFormId ?? null,
  assessmentFormId: a.assessmentFormId ?? a.formId ?? null,
  period: a.period, remarks: a.remarks || '',
  items: flat(a).map(i => ({
    id: i.id ?? null, questionId: i.questionId ?? null,
    sectionTitle: i.sectionTitle, questionText: i.questionText,
    itemOrder: i.itemOrder, rating: i.rating ?? null,
    comment: i.comment || '', responseType: i.responseType ?? 'YES_NO_RATING',
    yesNoAnswer: i.yesNoAnswer ?? null,
  })),
});

const sigSrc = (d?: string | null, t?: string | null) =>
  !d ? '' : d.startsWith('data:') ? d : `data:${t || 'image/png'};base64,${d}`;

const fmtDate = (d?: string | null) => {
  if (!d) return '-';
  const p = new Date(d);
  return isNaN(p.getTime()) ? d : p.toLocaleDateString();
};

const bandCls = (l?: string) => {
  if (l === 'Outstanding') return 'ess-band-outstanding';
  if (l === 'Good') return 'ess-band-good';
  if (l === 'Meet Requirement') return 'ess-band-meet';
  if (l === 'Need Improvement') return 'ess-band-improve';
  if (l === 'Unsatisfactory') return 'ess-band-unsat';
  return 'ess-band-none';
};

const stepIdx = (s: AssessmentStatus) => {
  const m: Record<string, number> = { DRAFT: 0, SUBMITTED: 1, PENDING_MANAGER: 1, PENDING_DEPARTMENT_HEAD: 2, PENDING_HR: 3, APPROVED: 4, DECLINED: 4, REJECTED: 4 };
  return m[s] ?? 0;
};
const STEPS = ['Draft', 'Submitted', 'Dept Head', 'HR Review', 'Final'];

const BANNERS: Record<string, { cls: string; icon: string; title: string; msg: string }> = {
  SUBMITTED: { cls: 'info', icon: '📨', title: 'Submitted', msg: 'Awaiting department head signature.' },
  PENDING_MANAGER: { cls: 'info', icon: '⏳', title: 'Awaiting Review', msg: 'Your manager can add remarks.' },
  PENDING_DEPARTMENT_HEAD: { cls: 'warning', icon: '🔄', title: 'Awaiting Dept Head', msg: 'Department head needs to sign.' },
  PENDING_HR: { cls: 'info', icon: '📋', title: 'Awaiting HR', msg: 'HR is reviewing.' },
  APPROVED: { cls: 'success', icon: '✅', title: 'Approved', msg: 'Assessment approved by HR.' },
  DECLINED: { cls: 'danger', icon: '❌', title: 'Declined', msg: '' },
  REJECTED: { cls: 'danger', icon: '❌', title: 'Rejected', msg: '' },
};

const BANDS: AssessmentScoreBand[] = [
  { minScore: 86, maxScore: 100, label: 'Outstanding', description: 'Exceptional performance.', sortOrder: 1 },
  { minScore: 71, maxScore: 85, label: 'Good', description: 'Consistent performance.', sortOrder: 2 },
  { minScore: 60, maxScore: 70, label: 'Meet Requirement', description: 'Satisfactory.', sortOrder: 3 },
  { minScore: 40, maxScore: 59, label: 'Need Improvement', description: 'Inconsistent.', sortOrder: 4 },
  { minScore: 0, maxScore: 39, label: 'Unsatisfactory', description: 'Below minimum.', sortOrder: 5 },
];

const EmployeeSelfAssessmentPage = () => {
  const [assessment, setAssessment] = useState<EmployeeAssessment | null>(null);
  const [ownSig, setOwnSig] = useState<Signature | null>(null);
  const [sigOpen, setSigOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [invalids, setInvalids] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const toast = (type: Toast['type'], msg: string) => {
    const id = ++toastSeq;
    setToasts(p => [...p, { id, type, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  const loadSig = useCallback(async () => {
    try { const s = await signatureService.list(); setOwnSig(s.find(x => x.isDefault) ?? s[0] ?? null); }
    catch { setOwnSig(null); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const d = await employeeAssessmentService.getLatestDraft(); setAssessment(d); await loadSig(); }
      catch (e) { toast('error', errMsg(e, 'Unable to load self-assessment.')); }
      finally { setLoading(false); }
    })();
  }, [loadSig]);

  const bands = useMemo(() => {
    const b = assessment?.scoreBands?.length ? assessment.scoreBands : BANDS;
    return [...b].sort((a, x) => Number(a.sortOrder ?? 0) - Number(x.sortOrder ?? 0));
  }, [assessment?.scoreBands]);

  const preview = useMemo(() => {
    if (!assessment) return { answered: 0, total: 0, totalScore: 0, maxScore: 0, percent: 0, label: 'Not scored' };
    const req = flat(assessment).filter(i => i.isRequired !== false);
    const ans = req.filter(i => !missing(i));
    const rated = req.filter(i => needsR(i) && i.rating != null);
    const ts = rated.reduce((s, i) => s + Number(i.rating || 0) * Number(i.weight || 1), 0);
    const ms = rated.reduce((s, i) => s + 5 * Number(i.weight || 1), 0);
    const pct = ms === 0 ? 0 : Number(((ts * 100) / ms).toFixed(2));
    const band = bands.find(b => pct >= b.minScore && pct <= b.maxScore);
    return { answered: ans.length, total: req.length, totalScore: ts, maxScore: ms, percent: pct, label: ans.length === 0 ? 'Not scored' : band?.label ?? 'Not scored' };
  }, [assessment, bands]);

  const updateField = (name: 'period' | 'remarks', value: string) =>
    setAssessment(p => p ? { ...p, [name]: value } : p);

  const updateItem = (st: string, order: number, patch: Partial<Pick<AssessmentItem, 'rating' | 'comment' | 'yesNoAnswer'>>) => {
    setAssessment(p => {
      if (!p) return p;
      return { ...p, sections: p.sections.map(s => ({ ...s, items: s.items.map(i =>
        (i.sectionTitle || s.title) === st && i.itemOrder === order ? { ...i, ...patch } : i
      ) })) };
    });
    if (autoRef.current) clearTimeout(autoRef.current);
    autoRef.current = setTimeout(() => void autoSave(), 1500);
  };

  const doSave = async (a: EmployeeAssessment) => {
    if (LOCKED.includes(a.status)) return a;
    return await employeeAssessmentService.saveDraft(payload(a), a.id);
  };

  const autoSave = async () => {
    if (!assessment || LOCKED.includes(assessment.status)) return;
    setSaving(true);
    try { const s = await doSave(assessment); setAssessment(s); }
    catch (e) { toast('error', errMsg(e, 'Auto-save failed.')); }
    finally { setSaving(false); }
  };

  const saveDraft = async () => {
    if (!assessment) return;
    setSaving(true);
    try { const s = await doSave(assessment); setAssessment(s); toast('success', 'Draft saved.'); }
    catch (e) { toast('error', errMsg(e, 'Could not save draft.')); }
    finally { setSaving(false); }
  };

  const doSubmit = async () => {
    if (!assessment) return;
    setShowConfirm(false);
    const mis = flat(assessment).filter(missing);
    if (mis.length) {
      setInvalids(new Set(mis.map(i => i.sectionTitle + '-' + i.itemOrder)));
      toast('error', 'Please answer all required questions.');
      const el = formRef.current?.querySelector('.ess-question.invalid');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setInvalids(new Set());
    if (!ownSig) { toast('error', 'Please create a default signature first.'); setSigOpen(true); return; }
    setSubmitting(true);
    try {
      const p = payload(assessment);
      const sub = assessment.id
        ? await employeeAssessmentService.submit(assessment.id, p)
        : await employeeAssessmentService.submit(p);
      setAssessment(sub);
      toast('success', 'Assessment submitted!');
    } catch (e) { toast('error', errMsg(e, 'Could not submit.')); }
    finally { setSubmitting(false); }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setShowConfirm(true); };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); void saveDraft(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (loading) return (
    <div className="ess-page"><div className="ess-container">
      <div className="ess-skeleton">
        <div className="ess-skel-line" style={{ height: 20, width: '40%', marginBottom: 12 }} />
        <div className="ess-skel-line" style={{ height: 14, width: '70%', marginBottom: 8 }} />
        <div className="ess-skel-line" style={{ height: 14, width: '55%' }} />
      </div>
    </div></div>
  );

  if (!assessment) return (
    <div className="ess-page"><div className="ess-container">
      <div className="ess-card"><div className="ess-state">
        <div className="ess-state-icon">📋</div>
        <h3>No Assessment Available</h3>
        <p>No active self-assessment form is assigned to your role.</p>
      </div></div>
    </div></div>
  );

  const isLocked = LOCKED.includes(assessment.status);
  const step = stepIdx(assessment.status);
  const banner = BANNERS[assessment.status];
  const items = flat(assessment);

  return (
    <div className="ess-page">
      <div className="ess-toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`ess-toast ${t.type}`}>
            <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>{t.msg}
          </div>
        ))}
      </div>

      {showConfirm && (
        <div className="ess-modal-backdrop" onClick={() => setShowConfirm(false)}>
          <div className="ess-modal" onClick={e => e.stopPropagation()}>
            <div className="ess-modal-icon">📤</div>
            <h3>Submit Assessment?</h3>
            <p>Once submitted, you cannot edit. It will be sent for department head review.</p>
            <div className="ess-modal-actions">
              <button className="ess-btn ghost" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="ess-btn primary" disabled={submitting} onClick={() => void doSubmit()}>
                {submitting ? <><span className="ess-spin" />Submitting…</> : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SignatureModal open={sigOpen} onClose={() => { setSigOpen(false); void loadSig(); }} />

      <div className="ess-container">
        <div className="ess-header-card">
          <div className="ess-header-inner">
            <div>
              <div className="ess-header-badge">✏️ Self-Assessment</div>
              <h1>{assessment.formName || 'Employee Self-Assessment Form'}</h1>
              <p>{assessment.companyName || ''}</p>
            </div>
            <div className="ess-header-meta">
              <strong>{assessment.employeeName || '—'}</strong>
              <span>{assessment.employeeCode || ''} {assessment.departmentName ? '· ' + assessment.departmentName : ''}</span>
            </div>
          </div>
        </div>

        <div className="ess-steps">
          {STEPS.map((s, i) => (
            <div key={s} className="ess-step">
              <div className={`ess-step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`ess-step-label ${i < step ? 'done' : i === step ? 'active' : ''}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`ess-step-line ${i < step ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        {banner && (
          <div className={`ess-banner ${banner.cls}`}>
            <div className="ess-banner-icon">{banner.icon}</div>
            <div>
              <strong>{banner.title}</strong>
              <span>{(assessment.status === 'DECLINED' || assessment.status === 'REJECTED') ? (assessment.declineReason || banner.msg) : banner.msg}</span>
            </div>
          </div>
        )}

        <div className="ess-layout">
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="ess-card">
              <div className="ess-info-grid">
                {([['Employee Name', assessment.employeeName || '—'], ['Employee ID', assessment.employeeCode || '—'],
                  ['Position', assessment.currentPosition || '—'], ['Department', assessment.departmentName || '—'],
                  ['Manager', assessment.managerName || '—'], ['Date', fmtDate(assessment.assessmentDate)]] as const).map(([lbl, val]) => (
                  <div key={lbl} className="ess-info-field">
                    <label>{lbl}</label><span className="ess-info-val">{val}</span>
                  </div>
                ))}
                <div className="ess-info-field">
                  <label>Period</label>
                  <input value={assessment.period || ''} readOnly={isLocked}
                    onChange={e => updateField('period', e.target.value)} />
                </div>
                <div className="ess-info-field">
                  <label>Status</label><span className="ess-info-val">{assessment.status}</span>
                </div>
              </div>
            </div>

            <div className="ess-card">
              <div className="ess-progress-wrap">
                <div className="ess-progress-header">
                  <span className="ess-progress-label">Progress</span>
                  <span className="ess-progress-count">{preview.answered}/{preview.total} answered</span>
                </div>
                <div className="ess-progress-bar">
                  <div className="ess-progress-fill" style={{ width: `${preview.total ? Math.round((preview.answered / preview.total) * 100) : 0}%` }} />
                </div>
              </div>

              {assessment.sections.map((section, si) => (
                <div key={section.id ?? section.title}>
                  <div className="ess-section-header">
                    <div className="ess-section-num">{si + 1}</div>
                    <div>
                      <div className="ess-section-title">{section.title}</div>
                      <div className="ess-section-sub">{section.items.length} question(s)</div>
                    </div>
                  </div>
                  {section.items.map(item => {
                    const st = item.sectionTitle || section.title;
                    const key = st + '-' + item.itemOrder;
                    const bad = invalids.has(key);
                    const yn = needsYN(item);
                    const rat = needsR(item);
                    const ok = !missing(item);
                    return (
                      <div key={key} className={`ess-question${bad ? ' invalid' : ''}`}>
                        <div className="ess-q-badges">
                          <span className="ess-badge num">#{item.itemOrder}</span>
                          <span className="ess-badge type">{item.responseType ?? 'YES_NO_RATING'}</span>
                          {item.isRequired !== false ? <span className="ess-badge required">Required</span> : <span className="ess-badge optional">Optional</span>}
                          {ok && <span className="ess-badge answered">✓</span>}
                        </div>
                        <p className="ess-q-text">{item.questionText}</p>
                        <div className="ess-answers-row">
                          {yn && <div className="ess-yesno-row">
                            <button type="button" disabled={isLocked} className={`ess-yn-btn yes${item.yesNoAnswer === true ? ' selected' : ''}`}
                              onClick={() => updateItem(st, item.itemOrder, { yesNoAnswer: item.yesNoAnswer === true ? null : true })}>Yes</button>
                            <button type="button" disabled={isLocked} className={`ess-yn-btn no${item.yesNoAnswer === false ? ' selected' : ''}`}
                              onClick={() => updateItem(st, item.itemOrder, { yesNoAnswer: item.yesNoAnswer === false ? null : false })}>No</button>
                          </div>}
                          {rat && <div className="ess-rating-row">
                            {RATINGS.map(r => (
                              <button key={r} type="button" disabled={isLocked}
                                className={`ess-rate-btn${item.rating === r ? ' selected' : ''}`}
                                onClick={() => updateItem(st, item.itemOrder, { rating: r })}>{r}</button>
                            ))}
                          </div>}
                        </div>
                        <textarea className="ess-q-comment" rows={item.responseType === 'TEXT' ? 3 : 2} disabled={isLocked}
                          value={item.comment || ''} placeholder={item.responseType === 'TEXT' ? 'Write your answer…' : 'Optional comment…'}
                          onChange={e => updateItem(st, item.itemOrder, { comment: e.target.value })} />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="ess-card">
              <div className="ess-remarks-card">
                <h4>Overall Remarks</h4>
                <textarea className="ess-remarks-textarea" rows={4} disabled={isLocked}
                  value={assessment.remarks || ''} placeholder="Achievements, blockers, development needs…"
                  onChange={e => updateField('remarks', e.target.value)} />
              </div>
            </div>

            {(assessment.managerComment || assessment.departmentHeadComment || assessment.hrComment) && (
              <div className="ess-card">
                {assessment.managerComment && <div className="ess-comment-block"><h4>Manager Remarks</h4><p>{assessment.managerComment}</p></div>}
                {assessment.departmentHeadComment && <div className="ess-comment-block"><h4>Dept Head Comment</h4><p>{assessment.departmentHeadComment}</p></div>}
                {assessment.hrComment && <div className="ess-comment-block"><h4>HR Comment</h4><p>{assessment.hrComment}</p></div>}
              </div>
            )}

            {assessment.declineReason && (assessment.status === 'DECLINED' || assessment.status === 'REJECTED') && (
              <div className="ess-card">
                <div className="ess-comment-block"><h4>Decline Reason</h4><p>{assessment.declineReason}</p></div>
              </div>
            )}

            <div className="ess-card">
              <div className="ess-sig-grid">
                <div className="ess-sig-slot">
                  <span className="ess-sig-label">Employee Signature</span>
                  {assessment.employeeSignatureImageData ? (
                    <><img className="ess-sig-img" src={sigSrc(assessment.employeeSignatureImageData, assessment.employeeSignatureImageType)} alt="Employee" />
                    <p className="ess-sig-date">Date: {fmtDate(assessment.employeeSignedAt || assessment.submittedAt)}</p>
                    <small className="ess-sig-name">{assessment.employeeSignatureName || assessment.employeeName}</small></>
                  ) : ownSig && !isLocked ? (
                    <><img className="ess-sig-img" src={sigSrc(ownSig.imageData, ownSig.imageType)} alt={ownSig.name} />
                    <p className="ess-sig-preview-note">Will be attached on submit</p></>
                  ) : <span className="ess-sig-pending">Pending</span>}
                  {!isLocked && <button type="button" className="ess-btn ghost" style={{ fontSize: 11, padding: '4px 10px', marginTop: 6 }}
                    onClick={() => setSigOpen(true)}>{ownSig ? 'Change Signature' : 'Create Signature'}</button>}
                </div>
                <div className="ess-sig-slot">
                  <span className="ess-sig-label">Dept Head Signature</span>
                  {assessment.departmentHeadSignatureImageData ? (
                    <><img className="ess-sig-img" src={sigSrc(assessment.departmentHeadSignatureImageData, assessment.departmentHeadSignatureImageType)} alt="Dept Head" />
                    <p className="ess-sig-date">Date: {fmtDate(assessment.departmentHeadSignedAt)}</p>
                    <small className="ess-sig-name">{assessment.departmentHeadSignatureName}</small></>
                  ) : <span className="ess-sig-pending">Pending</span>}
                </div>
                <div className="ess-sig-slot">
                  <span className="ess-sig-label">HR Signature</span>
                  {assessment.hrSignatureImageData ? (
                    <><img className="ess-sig-img" src={sigSrc(assessment.hrSignatureImageData, assessment.hrSignatureImageType)} alt="HR" />
                    <p className="ess-sig-date">Date: {fmtDate(assessment.hrSignedAt)}</p>
                    <small className="ess-sig-name">{assessment.hrSignatureName}</small></>
                  ) : <span className="ess-sig-pending">Pending</span>}
                </div>
              </div>
              {!isLocked && (
                <div className="ess-action-bar">
                  <div className="ess-action-left">
                    <span className="ess-autosave-note">{saving ? '⏳ Saving…' : '✓ Auto-saves as you answer'}</span>
                  </div>
                  <div className="ess-action-right">
                    <button type="button" className="ess-btn ghost" disabled={saving || submitting} onClick={() => void saveDraft()}>
                      {saving ? 'Saving…' : 'Save Draft'}
                    </button>
                    <button type="submit" className="ess-btn primary" disabled={saving || submitting}>
                      {submitting ? 'Submitting…' : 'Submit Assessment'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>

          <aside>
            <div className="ess-score-panel">
              <p className="ess-score-title">Live Score</p>
              <div className="ess-score-ring-wrap">
                <div className="ess-score-ring">
                  <svg viewBox="0 0 120 120">
                    <circle className="ess-ring-bg" cx="60" cy="60" r="50" />
                    <circle className="ess-ring-fill" cx="60" cy="60" r="50"
                      style={{ strokeDashoffset: 314 - (314 * Math.min(preview.percent, 100) / 100) }} />
                  </svg>
                  <div className="ess-score-center">
                    <span className="ess-score-pct">{preview.percent}<span className="ess-score-pct-sign">%</span></span>
                  </div>
                </div>
              </div>
              <div className={`ess-score-band ${bandCls(preview.label)}`}>{preview.label}</div>
              <div className="ess-score-divider" />
              <div className="ess-score-breakdown">
                <div>Score: {preview.totalScore} / {preview.maxScore} × 100</div>
                <div>Answered: {preview.answered} / {preview.total}</div>
              </div>
              <div className="ess-score-divider" />
              <p className="ess-bands-title">Score Bands</p>
              {bands.map(b => (
                <div key={b.minScore + '-' + b.maxScore} className="ess-band-row">
                  <span className="ess-band-range">{b.minScore}–{b.maxScore}</span>
                  <div className="ess-band-info">
                    <strong>{b.label}</strong>
                    <small>{b.description}</small>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSelfAssessmentPage;
