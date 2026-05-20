import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AppraisalRatingInput,
  AppraisalReviewResponse,
  AppraisalReviewSubmitRequest,
  AppraisalScoreBandResponse,
  EmployeeAppraisalFormResponse,
  PmAppraisalSubmitRequest,
} from '../../types/appraisal';
import AppraisalPopup from './AppraisalPopup';
import { signatureService } from '../../services/signatureService';
import type { Signature } from '../../types/signature';
import AppraisalRatingDots from './AppraisalRatingDots';
import { formatDisplayDate } from '../../utils/appraisalDateFormat';
import '../../pages/appraisal/appraisal.css';

type AppraisalFormMode = 'pm' | 'dept-head' | 'hr' | 'employee' | 'readonly';

interface AppraisalFormViewProps {
  form: EmployeeAppraisalFormResponse;
  mode: AppraisalFormMode;
  busy?: boolean;
  onPmSubmit?: (payload: PmAppraisalSubmitRequest) => Promise<void> | void;
  onPmDraftSave?: (payload: PmAppraisalSubmitRequest) => Promise<void> | void;
  onReviewSubmit?: (payload: AppraisalReviewSubmitRequest) => Promise<void> | void;
  onReviewDraftSave?: (payload: AppraisalReviewSubmitRequest) => Promise<void> | void;
  employeeNameField?: ReactNode;
}

interface AutoSaveSnapshot {
  key: string;
  canSavePm: boolean;
  canSaveReview: boolean;
  pmPayload: PmAppraisalSubmitRequest;
  reviewPayload: AppraisalReviewSubmitRequest;
  pmDraftSave?: (payload: PmAppraisalSubmitRequest) => Promise<void> | void;
  reviewDraftSave?: (payload: AppraisalReviewSubmitRequest) => Promise<void> | void;
}

interface ScoreSnapshot {
  totalPoints: number;
  answeredCriteriaCount: number;
  maxPossible: number;
  scorePercent: number | null;
  performanceLabel: string;
}

const DEFAULT_SCORE_BANDS: AppraisalScoreBandResponse[] = [
  { id: 0, minScore: 86, maxScore: 100, label: 'Outstanding', description: 'Performance exceptional and far exceeds expectations.', sortOrder: 1, active: true },
  { id: 0, minScore: 71, maxScore: 85, label: 'Exceeds Requirements', description: 'Performance is consistent and clearly meets essential requirements.', sortOrder: 2, active: true },
  { id: 0, minScore: 60, maxScore: 70, label: 'Meet Requirement', description: 'Performance is satisfactory and meets requirements of the job.', sortOrder: 3, active: true },
  { id: 0, minScore: 40, maxScore: 59, label: 'Need Improvement', description: 'Performance is inconsistent. Supervision and training are needed.', sortOrder: 4, active: true },
  { id: 0, minScore: 0, maxScore: 39, label: 'Unsatisfactory', description: 'Performance does not meet the minimum requirement of the job.', sortOrder: 5, active: true },
];

const findReview = (reviews: AppraisalReviewResponse[], stage: AppraisalReviewResponse['reviewStage']) =>
  reviews.find((review) => review.reviewStage === stage);

const formatScoreNumber = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const getSignatureImageSrc = (review?: AppraisalReviewResponse) => {
  if (!review?.signatureImageData || !review?.signatureImageType) return null;
  return review.signatureImageData.startsWith('data:')
    ? review.signatureImageData
    : `data:${review.signatureImageType};base64,${review.signatureImageData}`;
};

const getSignatureMasterImageSrc = (signature?: Signature | null) => {
  if (!signature?.imageData || !signature?.imageType) return null;
  return signature.imageData.startsWith('data:')
    ? signature.imageData
    : `data:${signature.imageType};base64,${signature.imageData}`;
};

const getCurrentStageReview = (form: EmployeeAppraisalFormResponse, mode: AppraisalFormMode) => {
  const stage = mode === 'pm' ? 'PM' : mode === 'dept-head' ? 'DEPT_HEAD' : mode === 'hr' ? 'HR' : null;
  return stage ? findReview(form.reviews ?? [], stage) : undefined;
};

const buildAutoSaveKey = (
  formId: number,
  mode: AppraisalFormMode,
  ratings: Record<number, number>,
  comment: string,
  signatureImageData: string | null,
  signatureImageType: string | null,
  selectedSignatureId: number,
) => JSON.stringify({
  formId,
  mode,
  ratings: Object.entries(ratings).sort(([left], [right]) => Number(left) - Number(right)),
  comment,
  signatureImageData,
  signatureImageType,
  selectedSignatureId,
});

const formatDate = formatDisplayDate;

const activeScoreBands = (bands?: AppraisalScoreBandResponse[] | null) => {
  const source = bands && bands.length ? bands : DEFAULT_SCORE_BANDS;
  return [...source]
    .filter((band) => band.active !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
};

const resolveScoreLabel = (score: number | null, bands?: AppraisalScoreBandResponse[] | null, fallback?: string | null) => {
  if (score === null || Number.isNaN(score)) return fallback || '-';
  const roundedScore = Math.round(score);
  const matched = activeScoreBands(bands).find((band) => roundedScore >= band.minScore && roundedScore <= band.maxScore);
  return matched?.label || fallback || '-';
};

const AppraisalFormView = ({
  form,
  mode,
  busy = false,
  onPmSubmit,
  onPmDraftSave,
  onReviewSubmit,
  onReviewDraftSave,
  employeeNameField,
}: AppraisalFormViewProps) => {
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [comment, setComment] = useState('');
  const [signatureImageData, setSignatureImageData] = useState<string | null>(null);
  const [signatureImageType, setSignatureImageType] = useState<string | null>(null);
  const [selectedSignatureId, setSelectedSignatureId] = useState<number>(0);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [signatureError, setSignatureError] = useState('');
  const [confirmPmOpen, setConfirmPmOpen] = useState(false);
  const [confirmReviewOpen, setConfirmReviewOpen] = useState(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const autoSaveReadyRef = useRef(false);
  const lastAutoSaveKeyRef = useRef('');
  const autoSaveSnapshotRef = useRef<AutoSaveSnapshot | null>(null);
  const autoSaveInFlightRef = useRef(false);
  const queuedAutoSaveRef = useRef<AutoSaveSnapshot | null>(null);

  const pmReview = useMemo(() => findReview(form.reviews ?? [], 'PM'), [form.reviews]);
  const deptHeadReview = useMemo(() => findReview(form.reviews ?? [], 'DEPT_HEAD'), [form.reviews]);
  const hrReview = useMemo(() => findReview(form.reviews ?? [], 'HR'), [form.reviews]);

  useEffect(() => {
    autoSaveReadyRef.current = false;
    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const nextRatings: Record<number, number> = {};

    form.sections.forEach((section) => {
      section.criteria.forEach((criteria) => {
        if (criteria.ratingValue) nextRatings[criteria.id] = criteria.ratingValue;
      });
    });

    const currentStageReview = getCurrentStageReview(form, mode);
    const nextComment = currentStageReview?.comment ?? '';
    const nextSignatureImageData = currentStageReview?.signatureImageData ?? null;
    const nextSignatureImageType = currentStageReview?.signatureImageType ?? null;

    setRatings(nextRatings);
    setComment(nextComment);
    setSignatureImageData(nextSignatureImageData);
    setSignatureImageType(nextSignatureImageType);
    setSelectedSignatureId(0);
    setConfirmPmOpen(false);
    setConfirmReviewOpen(false);
    lastAutoSaveKeyRef.current = buildAutoSaveKey(
      form.id,
      mode,
      nextRatings,
      nextComment,
      nextSignatureImageData,
      nextSignatureImageType,
      0,
    );

    const readyTimer = window.setTimeout(() => {
      autoSaveReadyRef.current = true;
    }, 0);

    return () => {
      window.clearTimeout(readyTimer);
      autoSaveReadyRef.current = false;
    };
  }, [form.id, mode]);


  useEffect(() => {
    if (mode !== 'pm' && mode !== 'dept-head' && mode !== 'hr') {
      setSignatures([]);
      return;
    }

    let mounted = true;
    setSignatureLoading(true);
    setSignatureError('');

    signatureService.list()
      .then((items) => {
        if (!mounted) return;
        setSignatures(items);

        const currentStageReview = getCurrentStageReview(form, mode);
        const hasCurrentSignature = Boolean(currentStageReview?.signatureImageData && currentStageReview?.signatureImageType);
        if (!hasCurrentSignature) {
          const defaultSignature = items.find((item) => item.isDefault) ?? items[0];
          if (defaultSignature) {
            setSelectedSignatureId(defaultSignature.id);
            setSignatureImageData(defaultSignature.imageData);
            setSignatureImageType(defaultSignature.imageType);
          }
        }
      })
      .catch((error) => {
        if (!mounted) return;
        setSignatureError(error instanceof Error ? error.message : 'Failed to load saved signatures.');
      })
      .finally(() => {
        if (mounted) setSignatureLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [mode, form.id]);

  const allCriteria = useMemo(
    () => form.sections.flatMap((section) => section.criteria),
    [form.sections],
  );

  const scoreBands = useMemo(() => activeScoreBands(form.scoreBands), [form.scoreBands]);
  const formLocked = Boolean(form.locked);
  const cycleLockedForCurrentRole = Boolean(form.cycleLocked && mode !== 'hr');
  const isLocked = formLocked || cycleLockedForCurrentRole;
  const missingRatingCount = allCriteria.filter((criteria) => !ratings[criteria.id]).length;
  const hasSignature = Boolean(signatureImageData && signatureImageType);
  const hasRemark = comment.trim().length > 0;
  const canSubmitPm = mode === 'pm' && !isLocked && missingRatingCount === 0 && hasRemark && hasSignature;
  const canSubmitReview = (mode === 'dept-head' || mode === 'hr') && !isLocked && hasRemark && hasSignature;

  const handleSignatureSelect = (signatureId: number) => {
    const signature = signatures.find((item) => item.id === signatureId);
    setSelectedSignatureId(signature?.id ?? 0);
    setSignatureImageData(signature?.imageData ?? null);
    setSignatureImageType(signature?.imageType ?? null);
  };

  const liveScore = useMemo<ScoreSnapshot>(() => {
    const answeredCriteria = allCriteria.filter((criteria) => Boolean(ratings[criteria.id]));
    const totalPoints = answeredCriteria.reduce((sum, criteria) => sum + (ratings[criteria.id] ?? 0), 0);
    const maxPossible = answeredCriteria.reduce((sum, criteria) => sum + (criteria.maxRating || 5), 0);
    const scorePercent = maxPossible > 0 ? (totalPoints * 100) / maxPossible : null;

    if (mode !== 'pm') {
      const persistedScore = form.scorePercent ?? null;
      return {
        totalPoints: form.totalPoints ?? totalPoints,
        answeredCriteriaCount: form.answeredCriteriaCount ?? answeredCriteria.length,
        maxPossible: (form.answeredCriteriaCount ?? answeredCriteria.length) * 5,
        scorePercent: persistedScore,
        performanceLabel: resolveScoreLabel(persistedScore, scoreBands, form.performanceLabel),
      };
    }

    return {
      totalPoints,
      answeredCriteriaCount: answeredCriteria.length,
      maxPossible,
      scorePercent,
      performanceLabel: resolveScoreLabel(scorePercent, scoreBands, form.performanceLabel),
    };
  }, [allCriteria, form.answeredCriteriaCount, form.performanceLabel, form.scorePercent, form.totalPoints, mode, ratings, scoreBands]);

  const buildPmPayload = (includeAllRatings: boolean): PmAppraisalSubmitRequest => ({
    ratings: (includeAllRatings ? allCriteria : allCriteria.filter((criteria) => Boolean(ratings[criteria.id]))).map<AppraisalRatingInput>((criteria) => ({
      criteriaId: criteria.id,
      ratingValue: ratings[criteria.id] ?? 0,
      comment: '',
    })),
    recommendation: '',
    comment: comment.trim(),
    managerSignatureId: selectedSignatureId || null,
    managerSignatureImageData: signatureImageData,
    managerSignatureImageType: signatureImageType,
  });

  const buildReviewPayload = (): AppraisalReviewSubmitRequest => ({
    recommendation: '',
    comment: comment.trim(),
    signatureId: selectedSignatureId || null,
    signatureImageData,
    signatureImageType,
  });

  const runAutoSaveSnapshot = useCallback((snapshot: AutoSaveSnapshot | null, force = false) => {
    if (!snapshot || (!snapshot.canSavePm && !snapshot.canSaveReview)) {
      return;
    }

    if (!force && snapshot.key === lastAutoSaveKeyRef.current) {
      return;
    }

    if (autoSaveInFlightRef.current) {
      queuedAutoSaveRef.current = snapshot;
      return;
    }

    autoSaveInFlightRef.current = true;
    lastAutoSaveKeyRef.current = snapshot.key;

    const savePromise = snapshot.canSavePm && snapshot.pmDraftSave
      ? Promise.resolve(snapshot.pmDraftSave(snapshot.pmPayload))
      : snapshot.canSaveReview && snapshot.reviewDraftSave
        ? Promise.resolve(snapshot.reviewDraftSave(snapshot.reviewPayload))
        : Promise.resolve();

    savePromise
      .catch(() => {
        lastAutoSaveKeyRef.current = '';
      })
      .finally(() => {
        autoSaveInFlightRef.current = false;
        const queuedSnapshot = queuedAutoSaveRef.current;
        queuedAutoSaveRef.current = null;
        if (queuedSnapshot && queuedSnapshot.key !== lastAutoSaveKeyRef.current) {
          runAutoSaveSnapshot(queuedSnapshot, true);
        }
      });
  }, []);

  const autoSaveSnapshot: AutoSaveSnapshot = {
    key: buildAutoSaveKey(
      form.id,
      mode,
      ratings,
      comment,
      signatureImageData,
      signatureImageType,
      selectedSignatureId,
    ),
    canSavePm: mode === 'pm' && !isLocked && !busy && Boolean(onPmDraftSave),
    canSaveReview: (mode === 'dept-head' || mode === 'hr') && !isLocked && !busy && Boolean(onReviewDraftSave),
    pmPayload: buildPmPayload(false),
    reviewPayload: buildReviewPayload(),
    pmDraftSave: onPmDraftSave,
    reviewDraftSave: onReviewDraftSave,
  };
  autoSaveSnapshotRef.current = autoSaveSnapshot;

  useEffect(() => {
    const snapshot = autoSaveSnapshotRef.current;

    if (!snapshot || (!snapshot.canSavePm && !snapshot.canSaveReview) || !autoSaveReadyRef.current) {
      return;
    }

    if (snapshot.key === lastAutoSaveKeyRef.current) {
      return;
    }

    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      runAutoSaveSnapshot(autoSaveSnapshotRef.current);
    }, 600);

    return () => {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [autoSaveSnapshot.key, autoSaveSnapshot.canSavePm, autoSaveSnapshot.canSaveReview, runAutoSaveSnapshot]);

  useEffect(() => () => {
    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    runAutoSaveSnapshot(autoSaveSnapshotRef.current, true);
  }, [runAutoSaveSnapshot]);


  const clearPendingAutoSave = () => {
    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  };

  const submitPm = async () => {
    if (!onPmSubmit) return;

    clearPendingAutoSave();
    await onPmSubmit(buildPmPayload(true));
  };

  const submitReview = async () => {
    if (!onReviewSubmit) return;
    clearPendingAutoSave();
    await onReviewSubmit(buildReviewPayload());
  };

  const currentSignatureSrc = signatureImageData && signatureImageType
    ? signatureImageData.startsWith('data:')
      ? signatureImageData
      : `data:${signatureImageType};base64,${signatureImageData}`
    : null;
  const currentSignatureDateText = formatDate(new Date().toISOString());
  const remarkBlockTitle = getRemarkBlockTitle(mode);
  const remarkLabel = getRemarkLabel(mode);
  const remarkPlaceholder = getRemarkPlaceholder(mode);
  let globalCriteriaNo = 0;

  return (
    <div className="appraisal-card appraisal-form-sheet appraisal-modern-form-card appraisal-cycle-view-modal">
      <div className="appraisal-template-banner center">
        <span className="appraisal-form-kicker">Appraisal Cycle Form</span>
        <h2>{form.cycleName}</h2>
      </div>


      <div className="appraisal-template-summary-card appraisal-cycle-summary-card compact-summary">
        <div><strong>Appraisal Name</strong><span>{form.cycleName}</span></div>
        <div><strong>Cycle Type</strong><span>{form.cycleType || '-'}</span></div>
        <div><strong>Cycle Year</strong><span>{form.cycleYear ?? '-'}</span></div>
        <div><strong>Status</strong><span>{form.status}</span></div>
      </div>

      <div className="appraisal-form-block">
        <h3>Employee Information</h3>
        <div className="appraisal-inline-grid three appraisal-cycle-employee-grid">
          {employeeNameField ?? <InfoField label="Employee Name" value={form.employeeName} />}
          <InfoField label="Employee ID" value={form.employeeCode || '-'} />
          <InfoField label="Current Position" value={form.positionName || '-'} />
          <InfoField label="Department" value={form.departmentName} />
          <InfoField label="Assessment Date" value={formatDate(form.cycleStartDate || form.assessmentDate)} />
          <InfoField label="Effective Date" value={formatDate(form.effectiveDate)} />
          {mode === 'pm' && <InfoField label="Manager Deadline" value={formatDate(form.cycleManagerSubmissionDeadline || form.cycleSubmissionDeadline)} />}
          {mode === 'dept-head' && <InfoField label="Dept Head Deadline" value={formatDate(form.cycleDeptHeadSubmissionDeadline || form.cycleSubmissionDeadline)} />}
        </div>
      </div>

      <div className="appraisal-form-block">
        <h3>Evaluations</h3>
        {form.sections.map((section) => (
          <section key={section.id} className="appraisal-section-card">
            <div className="appraisal-section-header">
              <div className="appraisal-section-title-wrap">
                <strong>{section.sectionName}</strong>
                <small>{section.criteria.length} criteria</small>
              </div>
            </div>

            <div className="appraisal-template-table-wrap">
              <table className="appraisal-template-table appraisal-rating-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Criteria</th>
                    <th>Rating 1-5</th>
                  </tr>
                </thead>
                <tbody>
                  {section.criteria.map((criteria) => {
                    globalCriteriaNo += 1;
                    return (
                      <tr key={criteria.id}>
                        <td className="appraisal-center-cell">{globalCriteriaNo}</td>
                        <td>{criteria.criteriaText}</td>
                        <td>
                          <AppraisalRatingDots
                            value={ratings[criteria.id] ?? criteria.ratingValue ?? null}
                            max={criteria.maxRating || 5}
                            disabled={mode !== 'pm' || isLocked}
                            onChange={(value) => setRatings((previous) => ({ ...previous, [criteria.id]: value }))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <div className="appraisal-form-block">
        <h3>Score Calculation</h3>
        <div className="appraisal-score-formula-card in-block">
          <div className="appraisal-total-points-strip">
            <strong>Total Points: {liveScore.totalPoints}</strong>
            <span>Answered Criteria: {liveScore.answeredCriteriaCount} / {allCriteria.length}</span>
          </div>
          <table className="appraisal-score-formula-table">
            <thead>
              <tr>
                <th>Analysis</th>
                <th>Formula</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Total Points</strong></td>
                <td>
                  <div className="formula-main">Total Point</div>
                  <div className="formula-divider" />
                  <div>Number of Questions Answered × 5</div>
                  <div className="formula-multiply">× 100</div>
                </td>
                <td>{formatScoreNumber(liveScore.scorePercent)}{liveScore.scorePercent === null ? '' : '%'}</td>
              </tr>
              <tr>
                <td><strong>Current Result</strong></td>
                <td>{liveScore.totalPoints} / {liveScore.maxPossible || 0} × 100</td>
                <td>{liveScore.performanceLabel}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="appraisal-form-block">
        <h3>Score Guide</h3>
        <ScoreGuide bands={scoreBands} />
      </div>

      <div className="appraisal-form-block">
        <div className="appraisal-form-block-header">
          <div>
            <h3>Review Records</h3>
          </div>
        </div>
        <div className="appraisal-inline-grid three">
          <ReviewBlock title="Manager Review" review={pmReview} />
          <ReviewBlock title="Dept Head Review" review={deptHeadReview} />
          <ReviewBlock title="HR Review" review={hrReview} />
        </div>
      </div>

      {(mode === 'pm' || mode === 'dept-head' || mode === 'hr') && !isLocked && (
        <div className="appraisal-form-block appraisal-other-remarks-block">
          <h3>{remarkBlockTitle}</h3>
          <label className="appraisal-field">
            <span>{remarkLabel}</span>
            <textarea
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={remarkPlaceholder}
            />
          </label>

          <WorkflowSignatureSection
            mode={mode}
            busy={busy}
            pmReview={pmReview}
            deptHeadReview={deptHeadReview}
            hrReview={hrReview}
            pendingSignatureSrc={currentSignatureSrc}
            pendingDateText={currentSignatureDateText}
            signatures={signatures}
            selectedSignatureId={selectedSignatureId}
            signatureLoading={signatureLoading}
            signatureError={signatureError}
            onSignatureSelect={handleSignatureSelect}
          />

          <div className="appraisal-button-row">
            {mode === 'pm' && (
              <button
                className="appraisal-button primary"
                type="button"
                disabled={busy || !canSubmitPm}
                onClick={() => setConfirmPmOpen(true)}
              >
                Submit to Dept Head
              </button>
            )}
            {(mode === 'dept-head' || mode === 'hr') && (
              <button
                className="appraisal-button success"
                type="button"
                disabled={busy || !canSubmitReview}
                onClick={() => setConfirmReviewOpen(true)}
              >
                {mode === 'dept-head' ? 'Submit to HR' : 'Submit to Employee'}
              </button>
            )}
          </div>

          {mode === 'pm' && missingRatingCount > 0 && (
            <p className="appraisal-muted">Please select ratings for all criteria. Missing: {missingRatingCount}</p>
          )}
          {!hasRemark && <p className="appraisal-muted">Remark comment is required.</p>}
          {!hasSignature && <p className="appraisal-muted">Signature is required before submit.</p>}
        </div>
      )}

      <AppraisalPopup
        open={confirmPmOpen}
        type="confirm"
        title="Submit Manager Review?"
        message={`Are you sure you want to submit ${form.employeeName}'s appraisal form to the Dept Head? After submission, this employee will be removed from the selectable review list.`}
        confirmText="Submit"
        cancelText="Cancel"
        loading={busy}
        onConfirm={() => {
          setConfirmPmOpen(false);
          void submitPm();
        }}
        onCancel={() => setConfirmPmOpen(false)}
      />

      <AppraisalPopup
        open={confirmReviewOpen}
        type="confirm"
        title={mode === 'dept-head' ? 'Submit Dept Head Review?' : 'Submit HR Review?'}
        message={mode === 'dept-head'
          ? `Are you sure you want to submit ${form.employeeName}'s checked appraisal form to HR?`
          : `Are you sure you want to submit ${form.employeeName}'s completed appraisal form to the employee?`}
        confirmText="Submit"
        cancelText="Cancel"
        loading={busy}
        onConfirm={() => {
          setConfirmReviewOpen(false);
          void submitReview();
        }}
        onCancel={() => setConfirmReviewOpen(false)}
      />
    </div>
  );
};


const getRemarkBlockTitle = (mode: AppraisalFormMode) => {
  if (mode === 'hr') return 'HR Remarks & Signature';
  if (mode === 'dept-head') return 'Dept Head Remarks & Signature';
  if (mode === 'pm') return 'Manager Remarks & Signature';
  return 'Other Remarks';
};

const getRemarkLabel = (mode: AppraisalFormMode) => {
  if (mode === 'hr') return 'HR Remarks';
  if (mode === 'dept-head') return 'Dept Head Remarks';
  if (mode === 'pm') return "Appraiser's Comment for Discussion";
  return 'Remarks';
};

const getRemarkPlaceholder = (mode: AppraisalFormMode) => {
  if (mode === 'hr') return 'Enter HR final remarks';
  if (mode === 'dept-head') return 'Enter Dept Head remarks';
  if (mode === 'pm') return 'Required comment for discussion';
  return 'Enter remarks';
};
const InfoField = ({ label, value }: { label: string; value: string | number }) => (
  <label className="appraisal-field">
    <span>{label}</span>
    <input value={String(value)} readOnly disabled />
  </label>
);

const ScoreGuide = ({ bands }: { bands: AppraisalScoreBandResponse[] }) => (
  <div className="appraisal-score-band-editor read-only">
    <div className="appraisal-score-band-head">
      <span>Score</span>
      <span>Rating</span>
      <span>Description</span>
    </div>
    {bands.map((band, index) => (
      <div className="appraisal-score-band-row" key={`${band.label}-${index}`}>
        <div className="appraisal-score-range-inputs"><strong>{String(band.minScore).padStart(2, '0')}-{band.maxScore}</strong></div>
        <strong>{band.label}</strong>
        <span className="appraisal-muted">{band.description || '-'}</span>
      </div>
    ))}
  </div>
);

interface WorkflowSignatureSectionProps {
  mode: AppraisalFormMode;
  busy: boolean;
  pmReview?: AppraisalReviewResponse;
  deptHeadReview?: AppraisalReviewResponse;
  hrReview?: AppraisalReviewResponse;
  pendingSignatureSrc: string | null;
  pendingDateText: string;
  signatures: Signature[];
  selectedSignatureId: number;
  signatureLoading: boolean;
  signatureError: string;
  onSignatureSelect: (signatureId: number) => void;
}

const WorkflowSignatureSection = ({
  mode,
  busy,
  pmReview,
  deptHeadReview,
  hrReview,
  pendingSignatureSrc,
  pendingDateText,
  signatures,
  selectedSignatureId,
  signatureLoading,
  signatureError,
  onSignatureSelect,
}: WorkflowSignatureSectionProps) => {
  const slots = [
    {
      key: 'pm',
      label: 'Manager Signature & Date',
      review: pmReview,
      editable: mode === 'pm',
      pendingSignatureSrc: mode === 'pm' ? pendingSignatureSrc : null,
    },
    {
      key: 'dept-head',
      label: 'Dept Head Signature & Date',
      review: deptHeadReview,
      editable: mode === 'dept-head',
      pendingSignatureSrc: mode === 'dept-head' ? pendingSignatureSrc : null,
    },
    {
      key: 'hr',
      label: 'HR Signature / Date / Designation',
      review: hrReview,
      editable: mode === 'hr',
      pendingSignatureSrc: mode === 'hr' ? pendingSignatureSrc : null,
    },
  ];

  const orderedSlots = [...slots].sort((left, right) => Number(right.editable) - Number(left.editable));

  return (
    <div className="appraisal-form-block appraisal-workflow-signature-section">
      <h3>{mode === 'hr' ? 'HR Signature' : 'Signature Section'}</h3>
      <div className="appraisal-signature-grid appraisal-template-signature-grid appraisal-workflow-signature-grid">
        {orderedSlots.map((slot) => (
          <WorkflowSignatureSlot
            key={slot.key}
            label={slot.label}
            review={slot.review}
            editable={slot.editable}
            busy={busy}
            pendingSignatureSrc={slot.pendingSignatureSrc}
            pendingDateText={pendingDateText}
            signatures={signatures}
            selectedSignatureId={selectedSignatureId}
            signatureLoading={signatureLoading}
            signatureError={signatureError}
            onSignatureSelect={onSignatureSelect}
          />
        ))}
      </div>
    </div>
  );
};

interface WorkflowSignatureSlotProps {
  label: string;
  review?: AppraisalReviewResponse;
  editable: boolean;
  busy: boolean;
  pendingSignatureSrc: string | null;
  pendingDateText: string;
  signatures: Signature[];
  selectedSignatureId: number;
  signatureLoading: boolean;
  signatureError: string;
  onSignatureSelect: (signatureId: number) => void;
}

const WorkflowSignatureSlot = ({
  label,
  review,
  editable,
  busy,
  pendingSignatureSrc,
  pendingDateText,
  signatures,
  selectedSignatureId,
  signatureLoading,
  signatureError,
  onSignatureSelect,
}: WorkflowSignatureSlotProps) => {
  const storedSignatureSrc = getSignatureImageSrc(review);
  const selectedSignature = editable ? signatures.find((item) => item.id === selectedSignatureId) ?? null : null;
  const importedSignatureSrc = editable ? getSignatureMasterImageSrc(selectedSignature) : null;
  const signatureSrc = editable ? pendingSignatureSrc || importedSignatureSrc || storedSignatureSrc : storedSignatureSrc;
  const dateText = review?.submittedAt ? formatDate(review.submittedAt) : (editable && signatureSrc ? pendingDateText : '-');

  return (
    <div className={`appraisal-signature-slot ${editable ? 'appraisal-editable-signature-slot' : 'appraisal-readonly-signature-slot'}`}>
      <p className="appraisal-signature-role-label">{label}</p>
      {editable ? (
        <div className="appraisal-signature-import-box">
          <label className="appraisal-field compact">
            <span>Import Saved Signature</span>
            <select
              value={selectedSignatureId || ''}
              onChange={(event) => onSignatureSelect(Number(event.target.value))}
              disabled={busy || signatureLoading}
            >
              <option value="">{signatureLoading ? 'Loading signatures...' : 'Select signature'}</option>
              {signatures.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.isDefault ? ' (Default)' : ''}
                </option>
              ))}
            </select>
          </label>
          {signatureError ? <small className="appraisal-error-text">{signatureError}</small> : null}
          {!signatureLoading && signatures.length === 0 ? (
            <small className="appraisal-muted">No saved signatures found. Create or upload one from the Signature menu first.</small>
          ) : null}
          {signatureSrc ? (
            <img src={signatureSrc} alt={label} className="appraisal-signature-image" />
          ) : (
            <span className="appraisal-signature-placeholder">No signature selected</span>
          )}
        </div>
      ) : signatureSrc ? (
        <img src={signatureSrc} alt={label} className="appraisal-signature-image" />
      ) : (
        <span className="appraisal-signature-placeholder">No signature submitted</span>
      )}
      <p className="appraisal-signature-date">Date: {dateText}</p>
      {review?.reviewerName ? <small className="appraisal-signature-name">{review.reviewerName}</small> : null}
      {!editable ? <small className="appraisal-muted">Display only</small> : null}
    </div>
  );
};

interface ReviewBlockProps {
  title: string;
  review?: AppraisalReviewResponse;
}

const ReviewBlock = ({ title, review }: ReviewBlockProps) => {
  const signatureSrc = getSignatureImageSrc(review);

  return (
    <div className="appraisal-review-block appraisal-review-summary-card">
      <h4>{title}</h4>
      {review ? (
        <>
          <p><strong>Reviewer:</strong> {review.reviewerName || '-'}</p>
          <p><strong>Decision:</strong> {review.decision || '-'}</p>
          <p><strong>Remark Comment:</strong> {review.comment || '-'}</p>
          <p><strong>Submitted At:</strong> {formatDate(review.submittedAt)}</p>
          <div className="appraisal-review-signature-box">
            <p className="appraisal-signature-role-label">{title.replace('Review', 'Signature')}</p>
            {signatureSrc ? (
              <img src={signatureSrc} alt={`${title} signature`} className="appraisal-signature-image" />
            ) : (
              <span className="appraisal-signature-placeholder">No signature submitted</span>
            )}
            <p className="appraisal-signature-date">Date: {formatDate(review.submittedAt)}</p>
          </div>
        </>
      ) : (
        <p className="appraisal-muted">No review submitted yet.</p>
      )}
    </div>
  );
};

export default AppraisalFormView;
