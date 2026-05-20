import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { employeeAssessmentService } from '../../services/employeeAssessmentService';
import { signatureService } from '../../services/signatureService';
import SignatureModal from '../../components/signature/SignatureModal';
import type { Signature } from '../../types/signature';
import type {
  AssessmentItem,
  AssessmentRequest,
  AssessmentScoreBand,
  AssessmentStatus,
  EmployeeAssessment,
} from '../../types/employeeAssessment';
import './employee-self-assessment.css';

const LOCKED: AssessmentStatus[] = [
  'SUBMITTED',
  'PENDING_MANAGER',
  'PENDING_DEPARTMENT_HEAD',
  'PENDING_HR',
  'APPROVED',
  'DECLINED',
  'REJECTED',
];

const RATINGS = [1, 2, 3, 4, 5];

type Toast = {
  id: number;
  type: 'success' | 'error' | 'info';
  msg: string;
};

let toastSeq = 0;

const errMsg = (e: unknown, fb: string) => {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const r = (e as any).response;
    return r?.data?.message || r?.data?.error || fb;
  }

  return e instanceof Error ? e.message || fb : fb;
};

const flat = (assessment: EmployeeAssessment): AssessmentItem[] =>
  assessment.sections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionTitle: item.sectionTitle || section.title,
    })),
  );

const needsYN = (_item: AssessmentItem) => true;
const needsR = (_item: AssessmentItem) => true;

const missing = (item: AssessmentItem) => {
  if (item.isRequired === false) return false;
  return item.yesNoAnswer == null || item.rating == null;
};

const payload = (assessment: EmployeeAssessment): AssessmentRequest => ({
  formId: assessment.formId ?? assessment.assessmentFormId ?? null,
  assessmentFormId: assessment.assessmentFormId ?? assessment.formId ?? null,
  period: assessment.period,
  remarks: assessment.remarks || '',
  items: flat(assessment).map((item) => ({
    id: item.id ?? null,
    questionId: item.questionId ?? null,
    sectionTitle: item.sectionTitle,
    questionText: item.questionText,
    itemOrder: item.itemOrder,
    rating: item.rating ?? null,
    comment: '',
    responseType: 'YES_NO_RATING',
    yesNoAnswer: item.yesNoAnswer ?? null,
  })),
});

const sigSrc = (data?: string | null, type?: string | null) => {
  if (!data) return '';
  return data.startsWith('data:') ? data : `data:${type || 'image/png'};base64,${data}`;
};

const fmtDate = (date?: string | null) => {
  if (!date) return '-';

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString();
};

const bandCls = (label?: string) => {
  if (label === 'Outstanding') return 'ess-band-outstanding';
  if (label === 'Good') return 'ess-band-good';
  if (label === 'Meet Requirement') return 'ess-band-meet';
  if (label === 'Need Improvement') return 'ess-band-improve';
  if (label === 'Unsatisfactory') return 'ess-band-unsat';

  return 'ess-band-none';
};

const stepIdx = (status: AssessmentStatus) => {
  const map: Record<string, number> = {
    DRAFT: 0,
    SUBMITTED: 1,
    PENDING_MANAGER: 1,
    PENDING_DEPARTMENT_HEAD: 2,
    PENDING_HR: 3,
    APPROVED: 4,
    DECLINED: 4,
    REJECTED: 4,
  };

  return map[status] ?? 0;
};

const STEPS = ['Draft', 'Submitted', 'Dept Head', 'HR Review', 'Final'];

const BANNERS: Record<
  string,
  { cls: string; icon: string; title: string; msg: string }
> = {
  SUBMITTED: {
    cls: 'info',
    icon: '📨',
    title: 'Submitted',
    msg: 'Awaiting manager review.',
  },
  PENDING_MANAGER: {
    cls: 'info',
    icon: '⏳',
    title: 'Awaiting Review',
    msg: 'Your manager can add remarks.',
  },
  PENDING_DEPARTMENT_HEAD: {
    cls: 'warning',
    icon: '🔄',
    title: 'Awaiting Dept Head',
    msg: 'Department head needs to sign.',
  },
  PENDING_HR: {
    cls: 'info',
    icon: '📋',
    title: 'Awaiting HR',
    msg: 'HR is reviewing.',
  },
  APPROVED: {
    cls: 'success',
    icon: '✅',
    title: 'Approved',
    msg: 'Assessment approved by HR.',
  },
  DECLINED: {
    cls: 'danger',
    icon: '❌',
    title: 'Declined',
    msg: '',
  },
  REJECTED: {
    cls: 'danger',
    icon: '❌',
    title: 'Rejected',
    msg: '',
  },
};

const BANDS: AssessmentScoreBand[] = [
  {
    minScore: 86,
    maxScore: 100,
    label: 'Outstanding',
    description: 'Exceptional performance.',
    sortOrder: 1,
  },
  {
    minScore: 71,
    maxScore: 85,
    label: 'Good',
    description: 'Consistent performance.',
    sortOrder: 2,
  },
  {
    minScore: 60,
    maxScore: 70,
    label: 'Meet Requirement',
    description: 'Satisfactory.',
    sortOrder: 3,
  },
  {
    minScore: 40,
    maxScore: 59,
    label: 'Need Improvement',
    description: 'Inconsistent.',
    sortOrder: 4,
  },
  {
    minScore: 0,
    maxScore: 39,
    label: 'Unsatisfactory',
    description: 'Below minimum.',
    sortOrder: 5,
  },
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
  const latestAssessmentRef = useRef<EmployeeAssessment | null>(null);

  useEffect(() => {
    latestAssessmentRef.current = assessment;
  }, [assessment]);

  const toast = (type: Toast['type'], msg: string) => {
    const id = ++toastSeq;

    setToasts((previous) => [...previous, { id, type, msg }]);

    setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
    }, 4000);
  };

  const loadSig = useCallback(async () => {
    try {
      const signatures = await signatureService.list();
      setOwnSig(signatures.find((item) => item.isDefault) ?? signatures[0] ?? null);
    } catch {
      setOwnSig(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);

      try {
        const data = await employeeAssessmentService.getLatestDraft();

        latestAssessmentRef.current = data;
        setAssessment(data);

        await loadSig();
      } catch (e) {
        toast('error', errMsg(e, 'Unable to load self-assessment.'));
      } finally {
        setLoading(false);
      }
    })();
  }, [loadSig]);

  const bands = useMemo(() => {
    const result = assessment?.scoreBands?.length ? assessment.scoreBands : BANDS;

    return [...result].sort(
      (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
    );
  }, [assessment?.scoreBands]);

  const preview = useMemo(() => {
    if (!assessment) {
      return {
        answered: 0,
        total: 0,
        totalScore: 0,
        maxScore: 0,
        percent: 0,
        label: 'Not scored',
      };
    }

    const requiredItems = flat(assessment).filter((item) => item.isRequired !== false);
    const answeredItems = requiredItems.filter((item) => !missing(item));
    const ratedItems = requiredItems.filter(
      (item) => needsR(item) && item.rating != null,
    );

    const totalScore = ratedItems.reduce(
      (sum, item) => sum + Number(item.rating || 0),
      0,
    );

    const maxScore = ratedItems.reduce((sum) => sum + 5, 0);
    const percent =
      maxScore === 0 ? 0 : Number(((totalScore * 100) / maxScore).toFixed(2));

    const band = bands.find(
      (item) => percent >= item.minScore && percent <= item.maxScore,
    );

    return {
      answered: answeredItems.length,
      total: requiredItems.length,
      totalScore,
      maxScore,
      percent,
      label: answeredItems.length === 0 ? 'Not scored' : band?.label ?? 'Not scored',
    };
  }, [assessment, bands]);

  const doSave = async (draft: EmployeeAssessment) => {
    if (LOCKED.includes(draft.status)) return draft;

    return await employeeAssessmentService.saveDraft(payload(draft), draft.id);
  };

  const autoSave = async (draft?: EmployeeAssessment | null) => {
    const target = draft ?? latestAssessmentRef.current;

    if (!target || LOCKED.includes(target.status)) return;

    setSaving(true);

    try {
      const saved = await doSave(target);

      latestAssessmentRef.current = saved;
      setAssessment(saved);
    } catch (e) {
      toast('error', errMsg(e, 'Auto-save failed.'));
    } finally {
      setSaving(false);
    }
  };

  const scheduleAutoSave = (nextAssessment: EmployeeAssessment) => {
    latestAssessmentRef.current = nextAssessment;

    if (autoRef.current) {
      clearTimeout(autoRef.current);
    }

    autoRef.current = setTimeout(() => {
      void autoSave(nextAssessment);
    }, 900);
  };

  const updateField = (name: 'period' | 'remarks', value: string) => {
    setAssessment((previous) => {
      if (!previous) return previous;

      const next = {
        ...previous,
        [name]: value,
      };

      scheduleAutoSave(next);

      return next;
    });
  };

  const updateItem = (
    sectionTitle: string,
    itemOrder: number,
    patch: Partial<Pick<AssessmentItem, 'rating' | 'yesNoAnswer'>>,
  ) => {
    setAssessment((previous) => {
      if (!previous) return previous;

      const next = {
        ...previous,
        sections: previous.sections.map((section) => ({
          ...section,
          items: section.items.map((item) =>
            (item.sectionTitle || section.title) === sectionTitle &&
            item.itemOrder === itemOrder
              ? { ...item, ...patch }
              : item,
          ),
        })),
      };

      scheduleAutoSave(next);

      return next;
    });
  };

  const saveDraft = async () => {
    const target = latestAssessmentRef.current;

    if (!target) return;

    if (autoRef.current) {
      clearTimeout(autoRef.current);
      autoRef.current = null;
    }

    setSaving(true);

    try {
      const saved = await doSave(target);

      latestAssessmentRef.current = saved;
      setAssessment(saved);
      toast('success', 'Draft saved.');
    } catch (e) {
      toast('error', errMsg(e, 'Could not save draft.'));
    } finally {
      setSaving(false);
    }
  };

  const doSubmit = async () => {
    const currentAssessment = latestAssessmentRef.current ?? assessment;

    if (!currentAssessment) return;

    if (autoRef.current) {
      clearTimeout(autoRef.current);
      autoRef.current = null;
    }

    setShowConfirm(false);

    const missingItems = flat(currentAssessment).filter(missing);

    if (missingItems.length) {
      setInvalids(
        new Set(
          missingItems.map((item) => `${item.sectionTitle}-${item.itemOrder}`),
        ),
      );

      toast('error', 'Please answer all required questions.');

      const element = formRef.current?.querySelector('.ess-question.invalid');

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      return;
    }

    setInvalids(new Set());

    if (!ownSig) {
      toast('error', 'Please create a default signature first.');
      setSigOpen(true);
      return;
    }

    setSubmitting(true);

    try {
      const requestPayload = payload(currentAssessment);

      const submitted = currentAssessment.id
        ? await employeeAssessmentService.submit(currentAssessment.id, requestPayload)
        : await employeeAssessmentService.submit(requestPayload);

      latestAssessmentRef.current = submitted;
      setAssessment(submitted);
      toast('success', 'Assessment submitted!');
    } catch (e) {
      toast('error', errMsg(e, 'Could not submit.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowConfirm(true);
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        void saveDraft();
      }
    };

    window.addEventListener('keydown', handler);

    return () => window.removeEventListener('keydown', handler);
  });

  useEffect(() => {
    return () => {
      if (autoRef.current) {
        clearTimeout(autoRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="ess-page">
        <div className="ess-container">
          <div className="ess-skeleton">
            <div
              className="ess-skel-line"
              style={{ height: 20, width: '40%', marginBottom: 12 }}
            />
            <div
              className="ess-skel-line"
              style={{ height: 14, width: '70%', marginBottom: 8 }}
            />
            <div className="ess-skel-line" style={{ height: 14, width: '55%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="ess-page">
        <div className="ess-container">
          <div className="ess-card">
            <div className="ess-state">
              <div className="ess-state-icon">📋</div>
              <h3>No Assessment Available</h3>
              <p>No active self-assessment form is assigned to your role.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLocked = LOCKED.includes(assessment.status);
  const step = stepIdx(assessment.status);
  const banner = BANNERS[assessment.status];
  const items = flat(assessment);

  return (
    <div className="ess-page">
      <div className="ess-toast-stack">
        {toasts.map((item) => (
          <div key={item.id} className={`ess-toast ${item.type}`}>
            <span>
              {item.type === 'success' ? '✅' : item.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            {item.msg}
          </div>
        ))}
      </div>

      {showConfirm && (
        <div className="ess-modal-backdrop" onClick={() => setShowConfirm(false)}>
          <div className="ess-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ess-modal-icon">📤</div>
            <h3>Submit Assessment?</h3>
            <p>
              Once submitted, you cannot edit. It will be sent to your manager first if
              assigned, then department head and HR.
            </p>

            <div className="ess-modal-actions">
              <button
                type="button"
                className="ess-btn ghost"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="ess-btn primary"
                disabled={submitting}
                onClick={() => void doSubmit()}
              >
                {submitting ? (
                  <>
                    <span className="ess-spin" />
                    Submitting…
                  </>
                ) : (
                  'Confirm Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <SignatureModal
        open={sigOpen}
        onClose={() => {
          setSigOpen(false);
          void loadSig();
        }}
      />

      <div className="ess-container">
        <div className="ess-header">
          <div>
            <h2>✏️ Self-Assessment</h2>
            <h1>{assessment.formName}</h1>
            <p>{assessment.companyName}</p>
          </div>

          <div className={`ess-status-chip ${assessment.status.toLowerCase()}`}>
            {assessment.status.replace(/_/g, ' ')}
          </div>
        </div>

        <div className="ess-employee-strip">
          <div>
            <strong>{assessment.employeeName}</strong>
            <span>
              {assessment.employeeCode || '-'} · {assessment.departmentName || '-'}
            </span>
          </div>
        </div>

        <div className="ess-steps">
          {STEPS.map((label, index) => (
            <div
              key={label}
              className={`ess-step ${index <= step ? 'active' : ''}`}
            >
              <div className="ess-step-num">{index + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {banner && (
          <div className={`ess-banner ${banner.cls}`}>
            <div className="ess-banner-icon">{banner.icon}</div>
            <div>
              <strong>{banner.title}</strong>
              <p>
                {assessment.status === 'DECLINED' || assessment.status === 'REJECTED'
                  ? assessment.declineReason || 'Assessment was declined.'
                  : banner.msg}
              </p>
            </div>
          </div>
        )}

        <div className="ess-layout">
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="ess-card">
              <div className="ess-info-grid">
                <div>
                  <label>Employee Name</label>
                  <span>{assessment.employeeName}</span>
                </div>

                <div>
                  <label>Employee ID</label>
                  <span>{assessment.employeeCode || '-'}</span>
                </div>

                <div>
                  <label>Position</label>
                  <span>{assessment.currentPosition || '-'}</span>
                </div>

                <div>
                  <label>Department</label>
                  <span>{assessment.departmentName || '-'}</span>
                </div>

                <div>
                  <label>Manager</label>
                  <span>{assessment.managerName || '—'}</span>
                </div>

                <div>
                  <label>Date</label>
                  <span>{fmtDate(assessment.assessmentDate)}</span>
                </div>

                <div>
                  <label>Period</label>
                  <input
                    disabled={isLocked}
                    value={assessment.period || ''}
                    onChange={(event) => updateField('period', event.target.value)}
                    className="ess-period-input"
                  />
                </div>

                <div>
                  <label>Status</label>
                  <span>{assessment.status}</span>
                </div>
              </div>
            </div>

            <div className="ess-card">
              <div className="ess-progress-head">
                <div>
                  <h3>Assessment Questions</h3>
                  <p>Each subject requires Yes/No and Rating.</p>
                </div>

                <span className="ess-progress-count">
                  {preview.answered}/{preview.total} answered
                </span>
              </div>

              <div className="ess-progress-bar">
                <div
                  className="ess-progress-fill"
                  style={{
                    width: `${
                      preview.total
                        ? Math.round((preview.answered / preview.total) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>

              {assessment.sections.map((section, sectionIndex) => (
                <div key={section.id ?? section.title}>
                  <div className="ess-section-header">
                    <div className="ess-section-num">{sectionIndex + 1}</div>

                    <div>
                      <div className="ess-section-title">{section.title}</div>
                      <div className="ess-section-sub">
                        {section.items.length} question(s)
                      </div>
                    </div>
                  </div>

                  {section.items.map((item) => {
                    const sectionTitle = item.sectionTitle || section.title;
                    const key = `${sectionTitle}-${item.itemOrder}`;
                    const bad = invalids.has(key);
                    const ok = !missing(item);
                    const yn = needsYN(item);
                    const rat = needsR(item);

                    return (
                      <div
                        key={key}
                        className={`ess-question${bad ? ' invalid' : ''}`}
                      >
                        <div className="ess-q-badges">
                          <span className="ess-badge num">#{item.itemOrder}</span>

                          {item.isRequired !== false ? (
                            <span className="ess-badge required">Required</span>
                          ) : (
                            <span className="ess-badge optional">Optional</span>
                          )}

                          {ok && <span className="ess-badge answered">✓</span>}
                        </div>

                        <p className="ess-q-text">{item.questionText}</p>

                        <div className="ess-answers-row">
                          {yn && (
                            <div className="ess-yesno-row">
                              <button
                                type="button"
                                disabled={isLocked}
                                className={`ess-yn-btn yes${
                                  item.yesNoAnswer === true ? ' selected' : ''
                                }`}
                                onClick={() =>
                                  updateItem(sectionTitle, item.itemOrder, {
                                    yesNoAnswer:
                                      item.yesNoAnswer === true ? null : true,
                                  })
                                }
                              >
                                Yes
                              </button>

                              <button
                                type="button"
                                disabled={isLocked}
                                className={`ess-yn-btn no${
                                  item.yesNoAnswer === false ? ' selected' : ''
                                }`}
                                onClick={() =>
                                  updateItem(sectionTitle, item.itemOrder, {
                                    yesNoAnswer:
                                      item.yesNoAnswer === false ? null : false,
                                  })
                                }
                              >
                                No
                              </button>
                            </div>
                          )}

                          {rat && (
                            <div className="ess-rating-row">
                              {RATINGS.map((rating) => (
                                <button
                                  key={rating}
                                  type="button"
                                  disabled={isLocked}
                                  className={`ess-rate-btn${
                                    item.rating === rating ? ' selected' : ''
                                  }`}
                                  onClick={() =>
                                    updateItem(sectionTitle, item.itemOrder, {
                                      rating,
                                    })
                                  }
                                >
                                  {rating}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="ess-card">
              <div className="ess-remarks-card">
                <h4>Overall Remarks</h4>

                <textarea
                  className="ess-remarks-textarea"
                  rows={4}
                  disabled={isLocked}
                  value={assessment.remarks || ''}
                  placeholder="Achievements, blockers, development needs…"
                  onChange={(event) => updateField('remarks', event.target.value)}
                />
              </div>
            </div>

            {(assessment.managerComment ||
              assessment.departmentHeadComment ||
              assessment.hrComment) && (
              <div className="ess-card">
                {assessment.managerComment && (
                  <div className="ess-comment-block">
                    <h4>Manager Remarks</h4>
                    <p>{assessment.managerComment}</p>
                  </div>
                )}

                {assessment.departmentHeadComment && (
                  <div className="ess-comment-block">
                    <h4>Dept Head Comment</h4>
                    <p>{assessment.departmentHeadComment}</p>
                  </div>
                )}

                {assessment.hrComment && (
                  <div className="ess-comment-block">
                    <h4>HR Comment</h4>
                    <p>{assessment.hrComment}</p>
                  </div>
                )}
              </div>
            )}

            {assessment.declineReason &&
              (assessment.status === 'DECLINED' ||
                assessment.status === 'REJECTED') && (
                <div className="ess-card">
                  <div className="ess-comment-block">
                    <h4>Decline Reason</h4>
                    <p>{assessment.declineReason}</p>
                  </div>
                </div>
              )}

            <div className="ess-card">
              <div className="ess-sig-grid">
                <div className="ess-sig-slot">
                  <span className="ess-sig-label">Employee Signature</span>

                  {assessment.employeeSignatureImageData ? (
                    <>
                      <img
                        className="ess-sig-img"
                        src={sigSrc(
                          assessment.employeeSignatureImageData,
                          assessment.employeeSignatureImageType,
                        )}
                        alt="Employee"
                      />

                      <p className="ess-sig-date">
                        Date:{' '}
                        {fmtDate(
                          assessment.employeeSignedAt || assessment.submittedAt,
                        )}
                      </p>

                      <small className="ess-sig-name">
                        {assessment.employeeSignatureName || assessment.employeeName}
                      </small>
                    </>
                  ) : ownSig && !isLocked ? (
                    <>
                      <img
                        className="ess-sig-img"
                        src={sigSrc(ownSig.imageData, ownSig.imageType)}
                        alt={ownSig.name}
                      />

                      <p className="ess-sig-preview-note">
                        Will be attached on submit
                      </p>
                    </>
                  ) : (
                    <span className="ess-sig-pending">Pending</span>
                  )}

                  {!isLocked && (
                    <button
                      type="button"
                      className="ess-btn ghost"
                      style={{ fontSize: 11, padding: '4px 10px', marginTop: 6 }}
                      onClick={() => setSigOpen(true)}
                    >
                      {ownSig ? 'Change Signature' : 'Create Signature'}
                    </button>
                  )}
                </div>

                <div className="ess-sig-slot">
                  <span className="ess-sig-label">Dept Head Signature</span>

                  {assessment.departmentHeadSignatureImageData ? (
                    <>
                      <img
                        className="ess-sig-img"
                        src={sigSrc(
                          assessment.departmentHeadSignatureImageData,
                          assessment.departmentHeadSignatureImageType,
                        )}
                        alt="Dept Head"
                      />

                      <p className="ess-sig-date">
                        Date: {fmtDate(assessment.departmentHeadSignedAt)}
                      </p>

                      <small className="ess-sig-name">
                        {assessment.departmentHeadSignatureName}
                      </small>
                    </>
                  ) : (
                    <span className="ess-sig-pending">Pending</span>
                  )}
                </div>

                <div className="ess-sig-slot">
                  <span className="ess-sig-label">HR Signature</span>

                  {assessment.hrSignatureImageData ? (
                    <>
                      <img
                        className="ess-sig-img"
                        src={sigSrc(
                          assessment.hrSignatureImageData,
                          assessment.hrSignatureImageType,
                        )}
                        alt="HR"
                      />

                      <p className="ess-sig-date">
                        Date: {fmtDate(assessment.hrSignedAt)}
                      </p>

                      <small className="ess-sig-name">
                        {assessment.hrSignatureName}
                      </small>
                    </>
                  ) : (
                    <span className="ess-sig-pending">Pending</span>
                  )}
                </div>
              </div>

              {!isLocked && (
                <div className="ess-action-bar">
                  <div className="ess-action-left">
                    <span className="ess-autosave-note">
                      {saving ? '⏳ Saving…' : '✓ Auto-saves as you answer'}
                    </span>
                  </div>

                  <div className="ess-action-right">
                    <button
                      type="button"
                      className="ess-btn ghost"
                      disabled={saving || submitting}
                      onClick={() => void saveDraft()}
                    >
                      {saving ? 'Saving…' : 'Save Draft'}
                    </button>

                    <button
                      type="submit"
                      className="ess-btn primary"
                      disabled={saving || submitting}
                    >
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

                    <circle
                      className="ess-ring-fill"
                      cx="60"
                      cy="60"
                      r="50"
                      style={{
                        strokeDashoffset:
                          314 - (314 * Math.min(preview.percent, 100)) / 100,
                      }}
                    />
                  </svg>

                  <div className="ess-score-center">
                    <span className="ess-score-pct">
                      {preview.percent}
                      <span className="ess-score-pct-sign">%</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className={`ess-score-band ${bandCls(preview.label)}`}>
                {preview.label}
              </div>

              <div className="ess-score-divider" />

              <div className="ess-score-breakdown">
                <div>
                  Score: {preview.totalScore} / {preview.maxScore} × 100
                </div>
                <div>
                  Answered: {preview.answered} / {preview.total}
                </div>
              </div>

              <div className="ess-score-divider" />

              <p className="ess-bands-title">Score Bands</p>

              {bands.map((band) => (
                <div
                  key={`${band.minScore}-${band.maxScore}`}
                  className="ess-band-row"
                >
                  <span className="ess-band-range">
                    {band.minScore}–{band.maxScore}
                  </span>

                  <div className="ess-band-info">
                    <strong>{band.label}</strong>
                    <small>{band.description}</small>
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