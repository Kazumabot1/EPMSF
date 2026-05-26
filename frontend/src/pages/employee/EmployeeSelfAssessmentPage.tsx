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
  AssessmentScoreRow,
  AssessmentStatus,
  EmployeeAssessment,
} from '../../types/employeeAssessment';
import './employee-self-assessment.css';

const EDITABLE_STATUSES: AssessmentStatus[] = ['DRAFT'];

const FINAL_SCORE_VISIBLE_STATUSES: AssessmentStatus[] = ['APPROVED', 'CLOSED_REJECTED'];

const RATINGS = [1, 2, 3, 4, 5];

const DEFAULT_BANDS: AssessmentScoreBand[] = [
  {
    minScore: 86,
    maxScore: 100,
    label: 'Outstanding',
    description:
      'Performance exceptional and far exceeds expectations. Consistently demonstrates excellent standards in all job requirements.',
    sortOrder: 1,
  },
  {
    minScore: 71,
    maxScore: 85,
    label: 'Good',
    description: 'Performance is consistent. Clearly meets essential requirements of job.',
    sortOrder: 2,
  },
  {
    minScore: 60,
    maxScore: 70,
    label: 'Meet Requirement',
    description: 'Performance is satisfactory. Meets requirements of the job.',
    sortOrder: 3,
  },
  {
    minScore: 40,
    maxScore: 59,
    label: 'Need Improvement',
    description:
      'Performance is inconsistent. Meets requirements of the job occasionally. Supervision and training is required for most problem areas.',
    sortOrder: 4,
  },
  {
    minScore: 0,
    maxScore: 39,
    label: 'Unsatisfactory',
    description: 'Performance does not meet the minimum requirement of the job.',
    sortOrder: 5,
  },
];

type Toast = {
  id: number;
  type: 'success' | 'error' | 'info';
  msg: string;
};

type TabKey = 'ongoing' | 'past';

let toastSeq = 0;

const errMsg = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as any).response;

    return (
      response?.data?.message ||
      response?.data?.error ||
      response?.data?.data?.message ||
      fallback
    );
  }

  return error instanceof Error ? error.message || fallback : fallback;
};

const flat = (assessment: EmployeeAssessment): AssessmentItem[] =>
  assessment.sections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionTitle: item.sectionTitle || section.title,
    })),
  );

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

const fmtDateTime = (date?: string | null) => {
  if (!date) return '-';

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleString();
};

const scoreRange = (band: AssessmentScoreBand) => {
  return `${String(band.minScore).padStart(2, '0')}-${band.maxScore}`;
};

const statusLabel = (status?: string | null) => {
  if (!status) return 'Draft';
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const statusClass = (status?: AssessmentStatus | string | null) => {
  return String(status || 'DRAFT').toLowerCase().replace(/_/g, '-');
};

const sortedBands = (assessment?: EmployeeAssessment | null) => {
  const bands = assessment?.scoreBands?.length ? assessment.scoreBands : DEFAULT_BANDS;

  return [...bands].sort(
    (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
  );
};

const bandColorClass = (band: AssessmentScoreBand) => {
  const order = Number(band.sortOrder ?? 0);

  if (order <= 2) return 'ess-band-category-green';
  if (order <= 4) return 'ess-band-category-yellow';
  return 'ess-band-category-red';
};

const scoreBandFor = (assessment?: EmployeeAssessment | null) => {
  if (!assessment) return null;

  return (
    sortedBands(assessment).find(
      (band) => assessment.scorePercent >= band.minScore && assessment.scorePercent <= band.maxScore,
    ) ?? null
  );
};

const answerProgress = (assessment?: EmployeeAssessment | null) => {
  if (!assessment) {
    return {
      answered: 0,
      total: 0,
      percent: 0,
    };
  }

  const requiredItems = flat(assessment).filter((item) => item.isRequired !== false);
  const answeredItems = requiredItems.filter((item) => !missing(item));

  return {
    answered: answeredItems.length,
    total: requiredItems.length,
    percent: requiredItems.length
      ? Math.round((answeredItems.length / requiredItems.length) * 100)
      : 0,
  };
};

const canShowFinalScore = (assessment?: EmployeeAssessment | null) => {
  return Boolean(
    assessment && FINAL_SCORE_VISIBLE_STATUSES.includes(assessment.status),
  );
};

const isEditableAssessment = (assessment?: EmployeeAssessment | null) => {
  return Boolean(assessment && EDITABLE_STATUSES.includes(assessment.status));
};

const getRowDate = (row: AssessmentScoreRow) => {
  return row.approvedAt ?? row.declinedAt ?? row.submittedAt ?? null;
};

const EmployeeSelfAssessmentPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('ongoing');
  const [ongoingAssessment, setOngoingAssessment] = useState<EmployeeAssessment | null>(null);
  const [pastRows, setPastRows] = useState<AssessmentScoreRow[]>([]);
  const [selectedPast, setSelectedPast] = useState<EmployeeAssessment | null>(null);
  const [ownSig, setOwnSig] = useState<Signature | null>(null);
  const [sigOpen, setSigOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [invalids, setInvalids] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const latestAssessmentRef = useRef<EmployeeAssessment | null>(null);

  const toast = (type: Toast['type'], msg: string) => {
    const id = ++toastSeq;

    setToasts((previous) => [...previous, { id, type, msg }]);

    setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
    }, 4200);
  };

  const loadSig = useCallback(async () => {
    try {
      const signatures = await signatureService.list();
      setOwnSig(signatures.find((item) => item.isDefault) ?? signatures[0] ?? null);
    } catch {
      setOwnSig(null);
    }
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);

    try {
      const [latest, history] = await Promise.all([
        employeeAssessmentService.getLatestDraft(),
        employeeAssessmentService.getMyHistory(),
      ]);

      const isLatestEditable = isEditableAssessment(latest);

      setOngoingAssessment(isLatestEditable ? latest : null);
      latestAssessmentRef.current = isLatestEditable ? latest : null;

      const rows = history
        .filter((row) => row.status !== 'DRAFT')
        .sort((a, b) => {
          const left = getRowDate(a) ? new Date(getRowDate(a) as string).getTime() : 0;
          const right = getRowDate(b) ? new Date(getRowDate(b) as string).getTime() : 0;
          return right - left;
        });

      if (latest && !isLatestEditable && latest.id) {
        const alreadyExists = rows.some((row) => Number(row.id) === Number(latest.id));

        if (!alreadyExists) {
          rows.unshift({
            id: latest.id,
            formId: latest.formId ?? latest.assessmentFormId ?? null,
            assessmentFormId: latest.assessmentFormId ?? latest.formId ?? null,
            formName: latest.formName ?? null,
            employeeId: latest.employeeId ?? null,
            employeeName: latest.employeeName,
            employeeCode: latest.employeeCode ?? null,
            departmentId: latest.departmentId ?? null,
            departmentName: latest.departmentName ?? null,
            managerUserId: latest.managerUserId ?? null,
            managerName: latest.managerName ?? null,
            period: latest.period,
            status: latest.status,
            totalScore: latest.totalScore,
            maxScore: latest.maxScore,
            scorePercent: latest.scorePercent,
            performanceLabel: latest.performanceLabel,
            submittedAt: latest.submittedAt ?? null,
            approvedAt: latest.approvedAt ?? null,
            declinedAt: latest.declinedAt ?? null,
            employeeSigned: Boolean(latest.employeeSignatureId),
            managerSigned: Boolean(latest.managerSignatureId),
            departmentHeadSigned: Boolean(latest.departmentHeadSignatureId),
            hrSigned: Boolean(latest.hrSignatureId),
          });
        }
      }

      setPastRows(rows);
      setActiveTab(isLatestEditable ? 'ongoing' : 'past');

      await loadSig();
    } catch (error) {
      toast('error', errMsg(error, 'Unable to load self-assessment.'));
    } finally {
      setLoading(false);
    }
  }, [loadSig]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    latestAssessmentRef.current = ongoingAssessment;
  }, [ongoingAssessment]);

  useEffect(() => {
    return () => {
      if (autoRef.current) {
        clearTimeout(autoRef.current);
      }
    };
  }, []);

  const progress = useMemo(() => answerProgress(ongoingAssessment), [ongoingAssessment]);

  const doSave = async (draft: EmployeeAssessment) => {
    if (!isEditableAssessment(draft)) return draft;

    return await employeeAssessmentService.saveDraft(payload(draft), draft.id);
  };

  const autoSave = async (draft?: EmployeeAssessment | null) => {
    const target = draft ?? latestAssessmentRef.current;

    if (!target || !isEditableAssessment(target)) return;

    setSaving(true);

    try {
      const saved = await doSave(target);

      latestAssessmentRef.current = saved;
      setOngoingAssessment(saved);
    } catch (error) {
      toast('error', errMsg(error, 'Auto-save failed.'));
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
    setOngoingAssessment((previous) => {
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
    setOngoingAssessment((previous) => {
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
      setOngoingAssessment(saved);
      toast('success', 'Draft saved.');
    } catch (error) {
      toast('error', errMsg(error, 'Could not save draft.'));
    } finally {
      setSaving(false);
    }
  };

  const doSubmit = async () => {
    const currentAssessment = latestAssessmentRef.current ?? ongoingAssessment;

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

      toast('error', 'Please answer all required assessment subjects.');

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

      latestAssessmentRef.current = null;
      setOngoingAssessment(null);
      setPastRows((previous) => [
        {
          id: submitted.id ?? 0,
          formId: submitted.formId ?? submitted.assessmentFormId ?? null,
          assessmentFormId: submitted.assessmentFormId ?? submitted.formId ?? null,
          formName: submitted.formName ?? null,
          employeeId: submitted.employeeId ?? null,
          employeeName: submitted.employeeName,
          employeeCode: submitted.employeeCode ?? null,
          departmentId: submitted.departmentId ?? null,
          departmentName: submitted.departmentName ?? null,
          managerUserId: submitted.managerUserId ?? null,
          managerName: submitted.managerName ?? null,
          period: submitted.period,
          status: submitted.status,
          totalScore: submitted.totalScore,
          maxScore: submitted.maxScore,
          scorePercent: submitted.scorePercent,
          performanceLabel: submitted.performanceLabel,
          submittedAt: submitted.submittedAt ?? null,
          approvedAt: submitted.approvedAt ?? null,
          declinedAt: submitted.declinedAt ?? null,
          employeeSigned: Boolean(submitted.employeeSignatureId),
          managerSigned: Boolean(submitted.managerSignatureId),
          departmentHeadSigned: Boolean(submitted.departmentHeadSignatureId),
          hrSigned: Boolean(submitted.hrSignatureId),
        },
        ...previous.filter((row) => Number(row.id) !== Number(submitted.id)),
      ]);
      setActiveTab('past');
      toast('success', 'Assessment submitted. It is now waiting for review.');
    } catch (error) {
      toast('error', errMsg(error, 'Could not submit assessment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowConfirm(true);
  };

  const openPastDetail = async (row: AssessmentScoreRow) => {
    if (!row.id) return;

    setDetailLoading(true);

    try {
      const data = await employeeAssessmentService.getById(row.id);
      setSelectedPast(data);
    } catch (error) {
      toast('error', errMsg(error, 'Unable to open assessment detail.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const renderSignatureGrid = (assessment: EmployeeAssessment, editable: boolean) => (
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
              alt="Employee signature"
            />

            <p className="ess-sig-date">
              Date: {fmtDate(assessment.employeeSignedAt || assessment.submittedAt)}
            </p>

            <small className="ess-sig-name">
              {assessment.employeeSignatureName || assessment.employeeName}
            </small>
          </>
        ) : ownSig && editable ? (
          <>
            <img
              className="ess-sig-img"
              src={sigSrc(ownSig.imageData, ownSig.imageType)}
              alt={ownSig.name}
            />

            <p className="ess-sig-preview-note">Will be attached on submit</p>
          </>
        ) : (
          <span className="ess-sig-pending">Pending</span>
        )}

        {editable && (
          <button
            type="button"
            className="ess-btn ghost small"
            onClick={() => setSigOpen(true)}
          >
            {ownSig ? 'Change Signature' : 'Create Signature'}
          </button>
        )}
      </div>

      <div className="ess-sig-slot">
        <span className="ess-sig-label">Manager Signature</span>

        {assessment.managerSignatureImageData ? (
          <>
            <img
              className="ess-sig-img"
              src={sigSrc(
                assessment.managerSignatureImageData,
                assessment.managerSignatureImageType,
              )}
              alt="Manager signature"
            />
            <p className="ess-sig-date">Date: {fmtDate(assessment.managerSignedAt)}</p>
            <small className="ess-sig-name">{assessment.managerSignatureName}</small>
          </>
        ) : (
          <span className="ess-sig-pending">Pending</span>
        )}
      </div>

      <div className="ess-sig-slot">
        <span className="ess-sig-label">Department Head Signature</span>

        {assessment.departmentHeadSignatureImageData ? (
          <>
            <img
              className="ess-sig-img"
              src={sigSrc(
                assessment.departmentHeadSignatureImageData,
                assessment.departmentHeadSignatureImageType,
              )}
              alt="Department head signature"
            />
            <p className="ess-sig-date">Date: {fmtDate(assessment.departmentHeadSignedAt)}</p>
            <small className="ess-sig-name">{assessment.departmentHeadSignatureName}</small>
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
              alt="HR signature"
            />
            <p className="ess-sig-date">Date: {fmtDate(assessment.hrSignedAt)}</p>
            <small className="ess-sig-name">{assessment.hrSignatureName}</small>
          </>
        ) : (
          <span className="ess-sig-pending">Pending</span>
        )}
      </div>
    </div>
  );

  const renderInfoGrid = (assessment: EmployeeAssessment, editable: boolean) => (
    <div className="ess-card">
      <div className="ess-info-grid">
        <div>
          <label>Employee Name</label>
          <span>{assessment.employeeName || '-'}</span>
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
          <span>{assessment.managerName || '-'}</span>
        </div>

        <div>
          <label>Date</label>
          <span>{fmtDate(assessment.assessmentDate)}</span>
        </div>

        <div>
          <label>Period</label>
          {editable ? (
            <input
              value={assessment.period || ''}
              onChange={(event) => updateField('period', event.target.value)}
              className="ess-period-input"
            />
          ) : (
            <span>{assessment.period || '-'}</span>
          )}
        </div>

        <div>
          <label>Status</label>
          <span>{statusLabel(assessment.status)}</span>
        </div>
      </div>
    </div>
  );

  const renderAssessmentSubjects = (assessment: EmployeeAssessment, editable: boolean) => {
    const currentProgress = answerProgress(assessment);

    return (
      <div className="ess-card">
        <div className="ess-progress-head">
          <div>
            <h3>Assessment Subjects</h3>
            <p>Each subject requires Yes/No and Rating 1-5.</p>
          </div>

          <span className="ess-progress-count">
            {currentProgress.answered}/{currentProgress.total} answered
          </span>
        </div>

        <div className="ess-progress-bar">
          <div
            className="ess-progress-fill"
            style={{ width: `${currentProgress.percent}%` }}
          />
        </div>

        {assessment.sections.map((section, sectionIndex) => (
          <div key={section.id ?? section.title ?? sectionIndex} className="ess-section-block">
            <div className="ess-section-header">
              <div className="ess-section-num">{sectionIndex + 1}</div>

              <div>
                <div className="ess-section-title">{section.title}</div>
                <div className="ess-section-sub">
                  {section.items.length} assessment subject(s)
                </div>
              </div>
            </div>

            {section.items.map((item) => {
              const sectionTitle = item.sectionTitle || section.title;
              const key = `${sectionTitle}-${item.itemOrder}`;
              const bad = invalids.has(key);
              const ok = !missing(item);

              return (
                <div key={key} className={`ess-question${bad ? ' invalid' : ''}`}>
                  <div className="ess-q-badges">
                    <span className="ess-badge num">#{item.itemOrder}</span>
                    <span className="ess-badge required">Required</span>
                    {ok && <span className="ess-badge answered">Answered</span>}
                  </div>

                  <p className="ess-q-text">{item.questionText}</p>

                  <div className="ess-answers-row">
                    <div className="ess-yesno-row">
                      <button
                        type="button"
                        disabled={!editable}
                        className={`ess-yn-btn yes${item.yesNoAnswer === true ? ' selected' : ''}`}
                        onClick={() =>
                          updateItem(sectionTitle, item.itemOrder, {
                            yesNoAnswer: item.yesNoAnswer === true ? null : true,
                          })
                        }
                      >
                        Yes
                      </button>

                      <button
                        type="button"
                        disabled={!editable}
                        className={`ess-yn-btn no${item.yesNoAnswer === false ? ' selected' : ''}`}
                        onClick={() =>
                          updateItem(sectionTitle, item.itemOrder, {
                            yesNoAnswer: item.yesNoAnswer === false ? null : false,
                          })
                        }
                      >
                        No
                      </button>
                    </div>

                    <div className="ess-rating-row" aria-label="Rating from 1 to 5">
                      {RATINGS.map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          disabled={!editable}
                          className={`ess-rate-btn${item.rating === rating ? ' selected' : ''}`}
                          onClick={() => updateItem(sectionTitle, item.itemOrder, { rating })}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderComments = (assessment: EmployeeAssessment) => {
    if (
      !assessment.managerComment &&
      !assessment.departmentHeadComment &&
      !assessment.hrComment &&
      !assessment.declineReason
    ) {
      return null;
    }

    return (
      <div className="ess-card ess-review-card">
        <h3>Reviewer Notes</h3>

        {assessment.managerComment && (
          <div className="ess-comment-block">
            <h4>Manager Remarks</h4>
            <p>{assessment.managerComment}</p>
          </div>
        )}

        {assessment.departmentHeadComment && (
          <div className="ess-comment-block">
            <h4>Department Head Remarks</h4>
            <p>{assessment.departmentHeadComment}</p>
          </div>
        )}

        {assessment.hrComment && (
          <div className="ess-comment-block">
            <h4>HR Remarks</h4>
            <p>{assessment.hrComment}</p>
          </div>
        )}

        {assessment.declineReason && (
          <div className="ess-comment-block danger">
            <h4>Rejection Reason</h4>
            <p>{assessment.declineReason}</p>
          </div>
        )}
      </div>
    );
  };

  const renderFinalScorePanel = (assessment: EmployeeAssessment) => {
    const visible = canShowFinalScore(assessment);
    const bands = sortedBands(assessment);
    const receivedBand = scoreBandFor(assessment);
    const safePercent = Math.min(Math.max(Number(assessment.scorePercent ?? 0), 0), 100);
    const circumference = 314;

    if (!visible) {
      return (
        <div className="ess-score-panel ess-score-panel-hidden">
          <div className="ess-score-hidden-icon">
            <i className="bi bi-lock" />
          </div>
          <p className="ess-score-title">Score Hidden</p>
          <h3>Waiting for final review</h3>
          <p>
            Your total score and score explanation will appear after HR confirms the assessment, or when a rejected assessment is closed after the assessment period.
          </p>
        </div>
      );
    }

    return (
      <div className="ess-score-panel">
        <p className="ess-score-title">Final Score</p>

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
                  strokeDashoffset: circumference - (circumference * safePercent) / 100,
                }}
              />
            </svg>

            <div className="ess-score-center">
              <span className="ess-score-pct">
                {safePercent.toFixed(0)}
                <span className="ess-score-pct-sign">%</span>
              </span>
            </div>
          </div>
        </div>

        <div className="ess-score-band received">
          {receivedBand?.label ?? assessment.performanceLabel ?? 'Not scored'}
        </div>

        <div className="ess-score-divider" />

        <div className="ess-score-breakdown">
          <div>
            Score: {Number(assessment.totalScore ?? 0).toFixed(0)} / {Number(assessment.maxScore ?? 0).toFixed(0)} × 100
          </div>
          <div>Status: {statusLabel(assessment.status)}</div>
        </div>

        <div className="ess-score-divider" />

        <p className="ess-bands-title">Score Explanation</p>

        <div className="ess-score-band-table">
          {bands.map((band) => {
            const isReceived =
              receivedBand &&
              band.minScore === receivedBand.minScore &&
              band.maxScore === receivedBand.maxScore;

            return (
              <div
                key={`${band.minScore}-${band.maxScore}-${band.label}`}
                className={`ess-band-row ${bandColorClass(band)}${isReceived ? ' received' : ''}`}
              >
                <span className="ess-band-range">{scoreRange(band)}</span>

                <div className="ess-band-info">
                  <strong>
                    {band.label}
                    {isReceived && <em>Received</em>}
                  </strong>
                  <small>{band.description}</small>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOngoing = () => {
    if (!ongoingAssessment) {
      return (
        <div className="ess-card">
          <div className="ess-state">
            <div className="ess-state-icon">
              <i className="bi bi-clipboard-check" />
            </div>
            <h3>No Ongoing Self-Assessment</h3>
            <p>
              There is no active self-assessment form available for editing right now. Submitted forms are shown in Past.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="ess-layout">
        <form ref={formRef} onSubmit={handleSubmit}>
          {renderInfoGrid(ongoingAssessment, true)}
          {renderAssessmentSubjects(ongoingAssessment, true)}

          <div className="ess-card">
            <div className="ess-remarks-card">
              <h4>Overall Remarks</h4>
              <textarea
                className="ess-remarks-textarea"
                rows={4}
                value={ongoingAssessment.remarks || ''}
                placeholder="Achievements, blockers, development needs…"
                onChange={(event) => updateField('remarks', event.target.value)}
              />
            </div>
          </div>

          <div className="ess-card">
            {renderSignatureGrid(ongoingAssessment, true)}

            <div className="ess-action-bar">
              <div className="ess-action-left">
                <span className="ess-autosave-note">
                  {saving ? 'Saving draft…' : 'Draft auto-saves as you answer'}
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
          </div>
        </form>

        <aside>
          <div className="ess-score-panel ess-progress-panel">
            <p className="ess-score-title">Completion</p>
            <div className="ess-progress-circle">
              <span>{progress.percent}%</span>
            </div>
            <h3>{progress.answered}/{progress.total} completed</h3>
            <p>
              The final score is hidden while you are filling the form. It will be available only after the review process is complete.
            </p>
          </div>
        </aside>
      </div>
    );
  };

  const renderPastRows = () => {
    if (pastRows.length === 0) {
      return (
        <div className="ess-card">
          <div className="ess-state">
            <div className="ess-state-icon">
              <i className="bi bi-clock-history" />
            </div>
            <h3>No Past Self-Assessments</h3>
            <p>Your submitted, approved, and closed rejected forms will appear here.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="ess-past-grid">
        {pastRows.map((row) => {
          const scoreVisible = FINAL_SCORE_VISIBLE_STATUSES.includes(row.status);

          return (
            <div key={row.id} className="ess-past-card">
              <div className="ess-past-head">
                <div>
                  <h3>{row.formName || 'Employee Self-assessment Form'}</h3>
                  <p>{row.period || '-'}</p>
                </div>

                <span className={`ess-status-chip ${statusClass(row.status)}`}>
                  {statusLabel(row.status)}
                </span>
              </div>

              <div className="ess-past-meta">
                <div>
                  <label>Submitted</label>
                  <span>{fmtDateTime(row.submittedAt)}</span>
                </div>
                <div>
                  <label>Final Date</label>
                  <span>{fmtDateTime(row.approvedAt ?? row.declinedAt)}</span>
                </div>
              </div>

              {scoreVisible ? (
                <div className="ess-past-score">
                  <strong>{Number(row.scorePercent ?? 0).toFixed(0)}%</strong>
                  <span>{row.performanceLabel || 'Not scored'}</span>
                </div>
              ) : (
                <div className="ess-past-score muted">
                  <strong>Hidden</strong>
                  <span>Waiting for final review</span>
                </div>
              )}

              <button
                type="button"
                className="ess-btn primary wide"
                disabled={detailLoading}
                onClick={() => void openPastDetail(row)}
              >
                {detailLoading ? 'Opening…' : 'View Details'}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPastDetail = () => {
    if (!selectedPast) return null;

    return (
      <div className="ess-modal-backdrop" onClick={() => setSelectedPast(null)}>
        <div className="ess-detail-modal" onClick={(event) => event.stopPropagation()}>
          <div className="ess-detail-header">
            <div>
              <p className="ess-modal-kicker">Past Self-Assessment</p>
              <h3>{selectedPast.formName}</h3>
              <span className={`ess-status-chip ${statusClass(selectedPast.status)}`}>
                {statusLabel(selectedPast.status)}
              </span>
            </div>

            <button
              type="button"
              className="ess-close-btn"
              onClick={() => setSelectedPast(null)}
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>

          <div className="ess-detail-body">
            <div className="ess-layout">
              <div>
                {renderInfoGrid(selectedPast, false)}
                {renderAssessmentSubjects(selectedPast, false)}

                <div className="ess-card">
                  <div className="ess-remarks-card">
                    <h4>Overall Remarks</h4>
                    <p className="ess-readonly-remarks">
                      {selectedPast.remarks || 'No remarks provided.'}
                    </p>
                  </div>
                </div>

                {renderComments(selectedPast)}

                <div className="ess-card">{renderSignatureGrid(selectedPast, false)}</div>
              </div>

              <aside>{renderFinalScorePanel(selectedPast)}</aside>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="ess-page">
        <div className="ess-container">
          <div className="ess-skeleton">
            <div className="ess-skel-line large" />
            <div className="ess-skel-line" />
            <div className="ess-skel-line short" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ess-page">
      <div className="ess-toast-stack">
        {toasts.map((item) => (
          <div key={item.id} className={`ess-toast ${item.type}`}>
            <span>{item.type === 'success' ? '✓' : item.type === 'error' ? '!' : 'i'}</span>
            {item.msg}
          </div>
        ))}
      </div>

      {showConfirm && (
        <div className="ess-modal-backdrop" onClick={() => setShowConfirm(false)}>
          <div className="ess-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ess-modal-icon">
              <i className="bi bi-send-check" />
            </div>
            <h3>Submit Assessment?</h3>
            <p>
              Once submitted, this form will move to Past and cannot be edited unless a reviewer returns it before the assessment period ends.
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
                {submitting ? 'Submitting…' : 'Confirm Submit'}
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

      {renderPastDetail()}

      <div className="ess-container">
        <div className="ess-header">
          <div>
            <p className="ess-kicker">Self-Assessment</p>
            <h1>Employee Self-Assessment</h1>
            <p>Complete your current form and review past submitted assessments.</p>
          </div>

          <button type="button" className="ess-refresh-btn" onClick={() => void loadPage()}>
            <i className="bi bi-arrow-repeat" />
            Refresh
          </button>
        </div>

        <div className="ess-tabbar">
          <button
            type="button"
            className={activeTab === 'ongoing' ? 'active' : ''}
            onClick={() => setActiveTab('ongoing')}
          >
            <i className="bi bi-pencil-square" />
            Ongoing
            {ongoingAssessment && <span>1</span>}
          </button>

          <button
            type="button"
            className={activeTab === 'past' ? 'active' : ''}
            onClick={() => setActiveTab('past')}
          >
            <i className="bi bi-clock-history" />
            Past
            <span>{pastRows.length}</span>
          </button>
        </div>

        {activeTab === 'ongoing' ? renderOngoing() : renderPastRows()}
      </div>
    </div>
  );
};

export default EmployeeSelfAssessmentPage;