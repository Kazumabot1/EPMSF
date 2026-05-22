import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  useFeedbackAssignmentDetail,
  useSaveFeedbackDraft,
  useSubmitFeedbackResponse,
} from '../../hooks/useFeedbackEvaluator';
import type {
  FeedbackAssignmentEmployeeInfo,
  FeedbackAssignmentQuestionDetail,
  FeedbackRatingOption,
  FeedbackRelationshipType,
} from '../../types/feedbackEvaluator';

type FormValues = {
  assessmentDateText: string;
  effectiveDateText: string;
  comments: string;
  responses: Array<{
    assignmentQuestionId: number;
    questionId?: number;
    ratingValue: string;
    comment: string;
  }>;
};

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type FeedbackQuestionForForm = FeedbackAssignmentQuestionDetail & {
  sectionId: number;
  sectionTitle: string;
};

type FeedbackQuestionGroup = {
  code: string;
  label: string;
  questions: Array<FeedbackQuestionForForm & { responseIndex: number }>;
};

const MIN_REQUIRED_COMMENT_LENGTH = 10;

const DEFAULT_RATING_OPTIONS: FeedbackRatingOption[] = [
  { value: 1, label: 'Unsatisfactory' },
  { value: 2, label: 'Needs improvement' },
  { value: 3, label: 'Meets requirement' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Outstanding' },
];

const SCORE_EXPLANATION = [
  { range: '86–100', label: 'Outstanding', description: 'Consistently exceeds expectations and demonstrates strong positive impact.' },
  { range: '71–85', label: 'Good', description: 'Performs well and meets most expectations with reliable results.' },
  { range: '60–70', label: 'Meets requirement', description: 'Meets the expected standard for the role.' },
  { range: '40–59', label: 'Needs improvement', description: 'Needs clearer progress, consistency, or support in this area.' },
  { range: '0–39', label: 'Unsatisfactory', description: 'Falls below the expected standard and requires focused improvement.' },
];

const getQuestionRatingOptions = (question?: FeedbackAssignmentQuestionDetail | null): FeedbackRatingOption[] => {
  if (question?.ratingOptions?.length) {
    return question.ratingOptions;
  }
  const max = question?.ratingScaleMax && question.ratingScaleMax > 0 ? question.ratingScaleMax : 5;
  return Array.from({ length: max }, (_, index) => {
    const value = index + 1;
    return DEFAULT_RATING_OPTIONS.find((option) => option.value === value) ?? { value, label: `Rating ${value}` };
  });
};

const getQuestionRatingBounds = (question?: FeedbackAssignmentQuestionDetail | null) => {
  const options = getQuestionRatingOptions(question);
  const values = options.map((option) => option.value);
  return {
    min: question?.ratingScaleMin ?? Math.min(...values, 1),
    max: question?.ratingScaleMax ?? Math.max(...values, 5),
  };
};

const isRatingQuestion = (question?: FeedbackAssignmentQuestionDetail | null) => {
  const responseType = String(question?.responseType ?? 'RATING_WITH_COMMENT').trim().toUpperCase().replace(/[-\s]+/g, '_');
  return responseType === 'RATING' || responseType === 'RATING_WITH_COMMENT' || responseType === 'RATING_ONLY';
};

const formatDateTime = (value: string | null) => {
  if (!value) return 'No deadline';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const formatTimeOnly = (value: Date | null) => {
  if (!value) return 'Not saved in this session';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(value);
};

const relationshipLabel = (type: FeedbackRelationshipType) => {
  switch (type) {
    case 'MANAGER':
      return 'Manager feedback';
    case 'PEER':
      return 'Peer feedback';
    case 'SUBORDINATE':
      return 'Direct report feedback';
    case 'SELF':
      return 'Self feedback';
    default:
      return type;
  }
};

const displayValue = (value?: string | number | null) => {
  if (value == null) return '—';
  const text = String(value).trim();
  return text || '—';
};

const initials = (name?: string | null) =>
    (name || 'Employee')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'E';

const feedbackHomePathFor = (pathname: string) => {
  if (pathname.startsWith('/manager/')) return '/manager/feedback';
  if (pathname.startsWith('/department-head/')) return '/department-head/feedback';
  return '/employee/feedback';
};

const InfoField = ({ label, value }: { label: string; value?: string | number | null }) => (
    <label className="feedback-form-info-field">
      <span>{label}</span>
      <input value={displayValue(value)} readOnly />
    </label>
);

const EmployeeInfoPanel = ({
                             title,
                             person,
                             fallbackName,
                             roleLabel,
                           }: {
  title: string;
  person?: FeedbackAssignmentEmployeeInfo | null;
  fallbackName?: string | null;
  roleLabel?: string;
}) => (
    <section className="feedback-form-info-card">
      <div className="feedback-form-info-card-head">
        <div className="feedback-form-avatar">{initials(person?.employeeName ?? fallbackName)}</div>
        <div>
          <h3>{title}</h3>
          <p>{displayValue(person?.employeeName ?? fallbackName)}</p>
        </div>
      </div>
      <div className="feedback-form-info-grid">
        <InfoField label="Employee name" value={person?.employeeName ?? fallbackName} />
        <InfoField label="Employee ID" value={person?.employeeCode ?? person?.employeeId} />
        <InfoField label="Current position" value={person?.positionName} />
        <InfoField label="Department" value={person?.departmentName} />
        {roleLabel ? <InfoField label="Role" value={roleLabel} /> : null}
      </div>
    </section>
);

const FeedbackFormPage = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const feedbackHomePath = feedbackHomePathFor(location.pathname);
  const parsedAssignmentId = assignmentId ? Number(assignmentId) : null;

  const [draftSavedMessage, setDraftSavedMessage] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');

  const assignmentQuery = useFeedbackAssignmentDetail(
      parsedAssignmentId != null && Number.isFinite(parsedAssignmentId) ? parsedAssignmentId : null,
  );
  const saveDraftMutation = useSaveFeedbackDraft();
  const submitMutation = useSubmitFeedbackResponse();
  const assignment = assignmentQuery.data;

  const flatQuestions = useMemo<FeedbackQuestionForForm[]>(
      () =>
          assignment
              ? assignment.sections.flatMap((section) =>
                  section.questions.map((question) => ({
                    sectionId: section.id,
                    sectionTitle: section.title,
                    ...question,
                  })),
              )
              : [],
      [assignment],
  );

  const groupedQuestions = useMemo<FeedbackQuestionGroup[]>(() => {
    const groups: FeedbackQuestionGroup[] = [];
    const groupMap = new Map<string, FeedbackQuestionGroup>();

    flatQuestions.forEach((question, responseIndex) => {
      const rawCode = question.competencyCode || question.sectionTitle || `section-${question.sectionId}`;
      const code = rawCode.trim() || `section-${question.sectionId}`;
      const label = question.sectionTitle || question.competencyCode || 'Competency';
      let group = groupMap.get(code);
      if (!group) {
        group = { code, label, questions: [] };
        groupMap.set(code, group);
        groups.push(group);
      }
      group.questions.push({ ...question, responseIndex });
    });

    return groups;
  }, [flatQuestions]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setValue,
    watch,
    getValues,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      assessmentDateText: '',
      effectiveDateText: '',
      comments: '',
      responses: [],
    },
  });

  const watchedAssessmentDate = watch('assessmentDateText');
  const watchedEffectiveDate = watch('effectiveDateText');
  const watchedComments = watch('comments');
  const watchedResponses = watch('responses');

  const requiredQuestions = useMemo(() => flatQuestions.filter((question) => question.required), [flatQuestions]);
  const answeredRequiredCount = useMemo(
      () =>
          flatQuestions.filter((question, index) => {
            if (!question.required) return false;
            const ratingComplete = !isRatingQuestion(question) || Boolean(watchedResponses?.[index]?.ratingValue?.trim());
            const commentComplete = (watchedResponses?.[index]?.comment?.trim().length ?? 0) >= MIN_REQUIRED_COMMENT_LENGTH;
            return ratingComplete && commentComplete;
          }).length,
      [flatQuestions, watchedResponses],
  );
  const requiredCount = requiredQuestions.length;
  const completionPercent = requiredCount === 0 ? 100 : Math.min(100, Math.round((answeredRequiredCount / requiredCount) * 100));
  const hasMissingRequired = requiredCount > 0 && answeredRequiredCount < requiredCount;

  useEffect(() => {
    if (!assignment) return;
    reset({
      assessmentDateText: assignment.assessmentDateText ?? '',
      effectiveDateText: assignment.effectiveDateText ?? '',
      comments: assignment.comments ?? '',
      responses: flatQuestions.map((question) => ({
        assignmentQuestionId: question.assignmentQuestionId ?? question.id,
        questionId: question.sourceQuestionId ?? question.id,
        ratingValue: question.existingRatingValue != null ? String(question.existingRatingValue) : '',
        comment: question.existingComment ?? '',
      })),
    });
    setDraftSavedMessage('');
    setAutoSaveStatus('idle');
    setLastSavedAt(null);
  }, [assignment, flatQuestions, reset]);

  const buildDraftPayload = () => {
    if (!assignment) return null;
    const values = getValues();
    return {
      evaluatorAssignmentId: assignment.assignmentId,
      assessmentDateText: values.assessmentDateText.trim() || undefined,
      effectiveDateText: values.effectiveDateText.trim() || undefined,
      comments: values.comments.trim() || undefined,
      responses: values.responses.map((response, index) => {
        const question = flatQuestions[index];
        const rawValue = response.ratingValue.trim();
        return {
          assignmentQuestionId: response.assignmentQuestionId || question?.assignmentQuestionId || question?.id,
          questionId: response.questionId || question?.sourceQuestionId || question?.id,
          ratingValue: rawValue ? Number(rawValue) : null,
          comment: response.comment.trim() || undefined,
        };
      }),
    };
  };

  const hasInvalidDraftRating = (payload: NonNullable<ReturnType<typeof buildDraftPayload>>) =>
      payload.responses.some((response) => {
        if (response.ratingValue == null) return false;
        const question = flatQuestions.find((item) => (item.assignmentQuestionId ?? item.id) === response.assignmentQuestionId);
        const bounds = getQuestionRatingBounds(question);
        return !Number.isFinite(response.ratingValue) || response.ratingValue < bounds.min || response.ratingValue > bounds.max;
      });

  useEffect(() => {
    if (!assignment?.canSubmit || !isDirty || submitMutation.isPending || saveDraftMutation.isPending) {
      return undefined;
    }

    setAutoSaveStatus('idle');
    const timeoutId = window.setTimeout(async () => {
      const payload = buildDraftPayload();
      if (!payload || hasInvalidDraftRating(payload)) return;

      try {
        setAutoSaveStatus('saving');
        await saveDraftMutation.mutateAsync(payload);
        reset(getValues());
        setLastSavedAt(new Date());
        setAutoSaveStatus('saved');
        setDraftSavedMessage('Draft auto-saved.');
      } catch {
        setAutoSaveStatus('error');
      }
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [assignment?.canSubmit, isDirty, watchedAssessmentDate, watchedEffectiveDate, watchedComments, watchedResponses, submitMutation.isPending, saveDraftMutation.isPending]);

  useEffect(() => {
    if (!isDirty || !assignment?.canSubmit) return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [assignment?.canSubmit, isDirty]);

  const validateResponsesForSubmit = (values: FormValues) => {
    clearErrors();
    let hasClientError = false;
    const responses = values.responses
        .map((response, index) => {
          const question = flatQuestions[index];
          if (!question) return null;
          const rawValue = response.ratingValue.trim();
          const requiresRating = isRatingQuestion(question);

          if (question.required && requiresRating && rawValue.length === 0) {
            setError(`responses.${index}.ratingValue`, { type: 'required', message: 'A rating is required for this question.' });
            hasClientError = true;
            return null;
          }

          if (question.required && response.comment.trim().length < MIN_REQUIRED_COMMENT_LENGTH) {
            setError(`responses.${index}.comment`, { type: 'required', message: `A comment of at least ${MIN_REQUIRED_COMMENT_LENGTH} characters is required.` });
            hasClientError = true;
            return null;
          }

          if (!requiresRating && !response.comment.trim()) {
            return null;
          }
          if (requiresRating && rawValue.length === 0) {
            return null;
          }

          const numericValue = rawValue ? Number(rawValue) : null;
          if (requiresRating && numericValue != null) {
            const bounds = getQuestionRatingBounds(question);
            if (!Number.isFinite(numericValue) || numericValue < bounds.min || numericValue > bounds.max) {
              setError(`responses.${index}.ratingValue`, { type: 'validate', message: `Ratings must be between ${bounds.min} and ${bounds.max}.` });
              hasClientError = true;
              return null;
            }
          }

          return {
            assignmentQuestionId: response.assignmentQuestionId,
            questionId: response.questionId,
            ratingValue: requiresRating ? numericValue : null,
            comment: response.comment.trim() || undefined,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item != null);
    return { hasClientError, responses };
  };

  const handleSaveDraft = async () => {
    if (!assignment) return;
    setDraftSavedMessage('');
    clearErrors();
    const payload = buildDraftPayload();
    if (!payload) return;
    if (hasInvalidDraftRating(payload)) {
      setAutoSaveStatus('error');
      return;
    }
    try {
      setAutoSaveStatus('saving');
      await saveDraftMutation.mutateAsync(payload);
      reset(getValues());
      setLastSavedAt(new Date());
      setAutoSaveStatus('saved');
      setDraftSavedMessage('Draft saved successfully.');
    } catch {
      setAutoSaveStatus('error');
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!assignment) return;
    setDraftSavedMessage('');
    const { hasClientError, responses } = validateResponsesForSubmit(values);
    if (hasClientError) return;

    const confirmed = window.confirm('Submit final feedback? After final submission, you will not be able to edit this response.');
    if (!confirmed) return;

    try {
      await submitMutation.mutateAsync({
        evaluatorAssignmentId: assignment.assignmentId,
        assessmentDateText: values.assessmentDateText.trim() || undefined,
        effectiveDateText: values.effectiveDateText.trim() || undefined,
        comments: values.comments.trim() || undefined,
        responses,
      });
      navigate(feedbackHomePath);
    } catch {
      // Mutation error is shown below.
    }
  });

  const additionalCommentsRegistration = register('comments');

  if (assignmentQuery.isLoading) return <div className="feedback-evaluator-empty">Loading feedback assignment...</div>;
  if (assignmentQuery.error instanceof Error) return <div className="feedback-evaluator-banner error">{assignmentQuery.error.message}</div>;
  if (!assignment) return <div className="feedback-evaluator-empty">Feedback assignment not found.</div>;

  const draftSaving = saveDraftMutation.isPending;
  const submitting = submitMutation.isPending;
  const actionBusy = draftSaving || submitting;
  const isSelfFeedback = assignment.relationshipType === 'SELF';
  const roleLabel = relationshipLabel(assignment.relationshipType);
  const autoSaveText =
      autoSaveStatus === 'saving'
          ? 'Saving draft...'
          : autoSaveStatus === 'error'
              ? 'Draft save failed. Use Save draft to retry.'
              : lastSavedAt
                  ? `Last saved at ${formatTimeOnly(lastSavedAt)}`
                  : 'Draft not saved in this session';

  return (
      <div className="feedback-form-page-clean">
        <section className="feedback-form-hero-clean">
          <div className="feedback-form-title-center">
            <p className="feedback-form-company-title">ACE Data Systems Ltd.,</p>
            <h1>360° Feedback Form</h1>
            <span>{assignment.campaignName} · {roleLabel}</span>
          </div>
          <Link className="feedback-evaluator-secondary" to={feedbackHomePath}>Back to feedback</Link>
        </section>

        <section className="feedback-form-status-strip-clean">
          <div>
            <span>Deadline</span>
            <strong>{formatDateTime(assignment.dueAt)}</strong>
          </div>
          <div>
            <span>Required progress</span>
            <strong>{answeredRequiredCount}/{requiredCount || flatQuestions.length}</strong>
          </div>
          <div>
            <span>Completion</span>
            <strong>{completionPercent}%</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{assignment.status.replace('_', ' ')}</strong>
          </div>
        </section>

        {assignment.lifecycleMessage ? <div className={`feedback-evaluator-banner ${assignment.canSubmit ? 'info' : 'warning'}`}>{assignment.lifecycleMessage}</div> : null}
        {assignment.autoSubmitNotice ? <div className="feedback-evaluator-banner info">{assignment.autoSubmitNotice}</div> : null}
        {draftSavedMessage ? <div className="feedback-evaluator-banner success">{draftSavedMessage}</div> : null}
        {hasMissingRequired && assignment.canSubmit ? <div className="feedback-evaluator-banner warning">Complete all required ratings and comments before final submission.</div> : null}
        {saveDraftMutation.error instanceof Error ? <div className="feedback-evaluator-banner error">{saveDraftMutation.error.message}</div> : null}
        {submitMutation.error instanceof Error ? <div className="feedback-evaluator-banner error">{submitMutation.error.message}</div> : null}

        <form className="feedback-form-clean-stack" onSubmit={onSubmit}>
          <div className="feedback-form-info-layout">
            <EmployeeInfoPanel title="Target employee information" person={assignment.target} fallbackName={assignment.targetEmployeeName} />
            {!isSelfFeedback ? (
                <EmployeeInfoPanel title="Evaluator information" person={assignment.evaluator} roleLabel={roleLabel} />
            ) : null}
          </div>

          <section className="feedback-form-info-card">
            <div className="feedback-form-info-card-head no-avatar">
              <div>
                <h3>Evaluation dates</h3>
                <p>Assessment Date and Effective Date are kept as text until the business rule is finalized.</p>
              </div>
            </div>
            <div className="feedback-form-info-grid two">
              <label className="feedback-form-info-field editable">
                <span>Assessment Date</span>
                <input disabled={!assignment.canSubmit || submitting} placeholder="Enter assessment date" {...register('assessmentDateText')} />
              </label>
              <label className="feedback-form-info-field editable">
                <span>Effective Date</span>
                <input disabled={!assignment.canSubmit || submitting} placeholder="Enter effective date" {...register('effectiveDateText')} />
              </label>
            </div>
          </section>

          <section className="feedback-form-question-section-clean">
            <div className="feedback-form-section-head-clean">
              <div>
                <h2>Evaluation questions</h2>
                <p>Choose a rating, then add a clear supporting comment for each question.</p>
              </div>
            </div>

            <div className="feedback-form-question-list-preview">
              {groupedQuestions.map((group) => (
                  <section key={group.code} className="feedback-preview-competency-section">
                    <header>
                      <div>
                        <span>{group.questions.length}</span>
                        <h4>{group.label}</h4>
                      </div>
                    </header>
                    <div className="feedback-preview-question-stack">
                      {group.questions.map((question) => {
                        const index = question.responseIndex;
                        const selectedRating = watchedResponses?.[index]?.ratingValue ?? '';
                        const ratingOptions = getQuestionRatingOptions(question);
                        const responseCommentRegistration = register(`responses.${index}.comment`);
                        const requiresRating = isRatingQuestion(question);
                        return (
                            <article key={question.id} className="feedback-preview-question-card">
                              <div className="feedback-preview-question-index">{index + 1}</div>
                              <div className="feedback-preview-question-body">
                                <div className="feedback-preview-question-meta">
                                  {question.questionCode ? <span>{question.questionCode}</span> : null}
                                  <em>Rating 1–5 + Required comment</em>
                                </div>
                                <p>{question.questionText}</p>

                                <input type="hidden" {...register(`responses.${index}.assignmentQuestionId`, { value: question.assignmentQuestionId ?? question.id, valueAsNumber: true })} />
                                <input type="hidden" {...register(`responses.${index}.questionId`, { value: question.sourceQuestionId ?? question.id, valueAsNumber: true })} />

                                {requiresRating ? (
                                    <div className="feedback-preview-rating-block">
                                      <div className="feedback-preview-response-row" role="radiogroup" aria-label={`Rating for question ${index + 1}`}>
                                        {ratingOptions.map((option) => {
                                          const isSelected = selectedRating === String(option.value);
                                          return (
                                              <button
                                                  key={option.value}
                                                  type="button"
                                                  disabled={!assignment.canSubmit || submitting}
                                                  className={isSelected ? 'selected' : ''}
                                                  onClick={() => {
                                                    setValue(`responses.${index}.ratingValue`, String(option.value), { shouldDirty: true, shouldValidate: true });
                                                    clearErrors(`responses.${index}.ratingValue`);
                                                    setDraftSavedMessage('');
                                                  }}
                                                  aria-pressed={isSelected}
                                              >
                                                {option.value}
                                              </button>
                                          );
                                        })}
                                      </div>
                                      <input type="hidden" {...register(`responses.${index}.ratingValue`)} />
                                      {errors.responses?.[index]?.ratingValue ? <small className="feedback-evaluator-error">{errors.responses[index]?.ratingValue?.message}</small> : null}
                                    </div>
                                ) : null}

                                <label className="feedback-preview-comment-block">
                                  <span>Comment {question.required ? <em>*</em> : null}</span>
                                  <textarea
                                      disabled={!assignment.canSubmit || submitting}
                                      {...responseCommentRegistration}
                                      placeholder="Evaluator must write the reason for the rating."
                                      onChange={(event) => {
                                        responseCommentRegistration.onChange(event);
                                        setDraftSavedMessage('');
                                      }}
                                  />
                                  {errors.responses?.[index]?.comment ? <small className="feedback-evaluator-error">{errors.responses[index]?.comment?.message}</small> : null}
                                </label>
                              </div>
                            </article>
                        );
                      })}
                    </div>
                  </section>
              ))}
            </div>
          </section>

          <label className="feedback-additional-comments-card">
            <span>Additional comments</span>
            <textarea
                disabled={!assignment.canSubmit || submitting}
                {...additionalCommentsRegistration}
                placeholder="Add any additional context, examples, strengths, or improvement suggestions."
                onChange={(event) => {
                  additionalCommentsRegistration.onChange(event);
                  setDraftSavedMessage('');
                }}
            />
          </label>

          <section className="feedback-score-explanation-card">
            <div>
              <h3>Score explanation</h3>
              <p>Scores are summarized after submission using the campaign scoring settings. The formula is intentionally not shown on the evaluator form.</p>
            </div>
            <div className="feedback-score-explanation-grid">
              {SCORE_EXPLANATION.map((item) => (
                  <div key={item.range}>
                    <strong>{item.range}</strong>
                    <span>{item.label}</span>
                    <small>{item.description}</small>
                  </div>
              ))}
            </div>
          </section>

          <div className="feedback-form-sticky-actions feedback-form-actions-clean">
            <div>
              <span>{autoSaveText}</span>
              {isDirty && assignment.canSubmit ? <small>Unsaved changes detected</small> : <small>Changes are up to date</small>}
            </div>
            <button className="feedback-evaluator-secondary solid" disabled={!assignment.canSubmit || actionBusy} type="button" onClick={handleSaveDraft}>
              {draftSaving ? 'Saving draft...' : 'Save draft'}
            </button>
            <button className="feedback-evaluator-primary" disabled={!assignment.canSubmit || actionBusy || hasMissingRequired} type="submit">
              {submitting ? 'Submitting feedback...' : 'Submit final feedback'}
            </button>
          </div>
        </form>
      </div>
  );
};

export default FeedbackFormPage;
