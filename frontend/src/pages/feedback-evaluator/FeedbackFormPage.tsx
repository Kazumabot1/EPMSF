import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
import {
  Feedback360Avatar,
  Feedback360Banner,
  Feedback360Button,
  Feedback360ButtonLink,
  Feedback360CharacterCount,
  Feedback360EmptyState,
  Feedback360Field,
  Feedback360GuidanceGrid,
  Feedback360HelpTip,
  Feedback360Hero,
  Feedback360InfoGrid,
  Feedback360InfoItem,
  Feedback360Panel,
  Feedback360PanelHeader,
  Feedback360Shell,
  Feedback360StatusPill,
  cx,
} from '../../components/feedback360/Feedback360Ui';

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
const MAX_REQUIRED_COMMENT_LENGTH = 1000;
const MAX_ADDITIONAL_COMMENT_LENGTH = 2000;

const normalizedLength = (value?: string | null) => (value ?? '').trim().length;

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

const questionLabel = (index: number) => `Question ${index + 1}`;

const feedbackHomePathFor = (pathname: string) => {
  if (pathname.startsWith('/manager/')) return '/manager/feedback';
  if (pathname.startsWith('/department-head/')) return '/department-head/feedback';
  return '/employee/feedback';
};

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
    <Feedback360Panel>
      <div className="f360-person-card">
        <div className="f360-person-head">
          <Feedback360Avatar name={person?.employeeName ?? fallbackName} />
          <div>
            <h3>{title}</h3>
            <p>{displayValue(person?.employeeName ?? fallbackName)}</p>
          </div>
        </div>
        <Feedback360InfoGrid columns={2}>
          <Feedback360InfoItem label="Employee name" value={displayValue(person?.employeeName ?? fallbackName)} />
          <Feedback360InfoItem label="Employee ID" value={displayValue(person?.employeeCode ?? person?.employeeId)} />
          <Feedback360InfoItem label="Current position" value={displayValue(person?.positionName)} />
          <Feedback360InfoItem label="Department" value={displayValue(person?.departmentName)} />
          {roleLabel ? <Feedback360InfoItem label="Role" value={roleLabel} /> : null}
        </Feedback360InfoGrid>
      </div>
    </Feedback360Panel>
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
      const rawCode = question.competencyCode || question.sectionTitle || `competency-${question.sectionId}`;
      const code = rawCode.trim() || `competency-${question.sectionId}`;
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

  const answeredRequiredCount = useMemo(
      () =>
          flatQuestions.filter((_question, index) => {
            const ratingComplete = Boolean(watchedResponses?.[index]?.ratingValue?.trim());
            const length = normalizedLength(watchedResponses?.[index]?.comment);
            const commentComplete = length >= MIN_REQUIRED_COMMENT_LENGTH && length <= MAX_REQUIRED_COMMENT_LENGTH;
            return ratingComplete && commentComplete;
          }).length,
      [flatQuestions, watchedResponses],
  );
  const requiredCount = flatQuestions.length;
  const completionPercent = requiredCount === 0 ? 100 : Math.min(100, Math.round((answeredRequiredCount / requiredCount) * 100));
  const additionalCommentsLength = normalizedLength(watchedComments);
  const additionalCommentsTooLong = additionalCommentsLength > MAX_ADDITIONAL_COMMENT_LENGTH;

  const attentionItems = useMemo(() =>
          flatQuestions.flatMap((_question, index) => {
            const response = watchedResponses?.[index];
            const label = questionLabel(index);
            const items: Array<{ index: number; label: string; message: string }> = [];
            if (!response?.ratingValue?.trim()) {
              items.push({ index, label, message: 'Rating is required.' });
            }
            const length = normalizedLength(response?.comment);
            if (length < MIN_REQUIRED_COMMENT_LENGTH) {
              items.push({ index, label, message: `Comment needs at least ${MIN_REQUIRED_COMMENT_LENGTH} characters.` });
            } else if (length > MAX_REQUIRED_COMMENT_LENGTH) {
              items.push({ index, label, message: `Comment must be ${MAX_REQUIRED_COMMENT_LENGTH} characters or fewer.` });
            }
            return items;
          }),
      [flatQuestions, watchedResponses],
  );
  const attentionQuestionCount = useMemo(() => new Set(attentionItems.map((item) => item.index)).size, [attentionItems]);

  const scrollToQuestion = (index: number) => {
    document.getElementById(`feedback-question-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

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
    let firstInvalidIndex: number | null = null;
    const responses = values.responses
        .map((response, index) => {
          const question = flatQuestions[index];
          if (!question) return null;
          const rawValue = response.ratingValue.trim();

          if (rawValue.length === 0) {
            setError(`responses.${index}.ratingValue`, { type: 'required', message: `${questionLabel(index)}: Rating is required.` });
            hasClientError = true;
            firstInvalidIndex ??= index;
            return null;
          }

          const responseCommentLength = normalizedLength(response.comment);
          if (responseCommentLength < MIN_REQUIRED_COMMENT_LENGTH) {
            setError(`responses.${index}.comment`, { type: 'required', message: `${questionLabel(index)}: Comment needs at least ${MIN_REQUIRED_COMMENT_LENGTH} characters.` });
            hasClientError = true;
            firstInvalidIndex ??= index;
            return null;
          }
          if (responseCommentLength > MAX_REQUIRED_COMMENT_LENGTH) {
            setError(`responses.${index}.comment`, { type: 'maxLength', message: `${questionLabel(index)}: Comment must be ${MAX_REQUIRED_COMMENT_LENGTH} characters or fewer.` });
            hasClientError = true;
            firstInvalidIndex ??= index;
            return null;
          }

          const numericValue = Number(rawValue);
          const bounds = getQuestionRatingBounds(question);
          if (!Number.isFinite(numericValue) || numericValue < bounds.min || numericValue > bounds.max) {
            setError(`responses.${index}.ratingValue`, { type: 'validate', message: `${questionLabel(index)}: Rating must be between ${bounds.min} and ${bounds.max}.` });
            hasClientError = true;
            firstInvalidIndex ??= index;
            return null;
          }

          return {
            assignmentQuestionId: response.assignmentQuestionId,
            questionId: response.questionId,
            ratingValue: numericValue,
            comment: response.comment.trim(),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item != null);
    return { hasClientError, firstInvalidIndex, responses };
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
    const { hasClientError, firstInvalidIndex, responses } = validateResponsesForSubmit(values);
    if (hasClientError) {
      if (firstInvalidIndex != null) {
        window.setTimeout(() => scrollToQuestion(firstInvalidIndex), 0);
      }
      return;
    }
    if (normalizedLength(values.comments) > MAX_ADDITIONAL_COMMENT_LENGTH) return;

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

  if (assignmentQuery.isLoading) {
    return <Feedback360Shell><Feedback360EmptyState title="Loading feedback assignment..." /></Feedback360Shell>;
  }
  if (assignmentQuery.error instanceof Error) {
    return <Feedback360Shell><Feedback360Banner tone="danger">{assignmentQuery.error.message}</Feedback360Banner></Feedback360Shell>;
  }
  if (!assignment) {
    return <Feedback360Shell><Feedback360EmptyState title="Feedback assignment not found." /></Feedback360Shell>;
  }

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
                  : assignment.status === 'IN_PROGRESS' ? 'Draft saved previously' : 'Draft not saved yet';

  return (
      <Feedback360Shell>
        <Feedback360Hero
            eyebrow="Rating 1–5 + required comment"
            title="360° Feedback Form"
            description={`${assignment.campaignName} · ${roleLabel}`}
            action={<Feedback360ButtonLink to={feedbackHomePath} variant="secondary">Back to feedback</Feedback360ButtonLink>}
            aside={(
                <>
                  <span>Required progress</span>
                  <strong>{answeredRequiredCount}/{requiredCount} questions completed</strong>
                  <p>{attentionQuestionCount > 0 ? `${attentionQuestionCount} question${attentionQuestionCount === 1 ? '' : 's'} still need attention.` : 'Ready for final submission when you are.'}</p>
                </>
            )}
        />

        <section className="f360-status-strip">
          <Feedback360InfoItem label="Deadline" value={formatDateTime(assignment.dueAt)} />
          <Feedback360InfoItem label="Required progress" value={`${answeredRequiredCount}/${requiredCount}`} />
          <Feedback360InfoItem label="Completion" value={`${completionPercent}%`} />
          <Feedback360InfoItem label="Status" value={assignment.status.replace('_', ' ')} />
        </section>

        {assignment.lifecycleMessage ? <Feedback360Banner tone={assignment.canSubmit ? 'info' : 'warning'}>{assignment.lifecycleMessage}</Feedback360Banner> : null}
        {assignment.autoSubmitNotice ? <Feedback360Banner tone="info">{assignment.autoSubmitNotice}</Feedback360Banner> : null}
        {draftSavedMessage ? <Feedback360Banner tone="success">{draftSavedMessage}</Feedback360Banner> : null}

        <Feedback360GuidanceGrid
            items={[
              {
                title: 'Privacy note',
                body: 'Your feedback will be used in aggregated 360 results. Peer and direct-report feedback may be hidden when the confidentiality threshold is not met.',
                tone: 'info',
              },
              {
                title: 'Comment guidance',
                body: 'Use specific examples. Avoid personal, insulting, or inappropriate comments.',
                tone: 'success',
              },
            ]}
        />

        {attentionItems.length > 0 && assignment.canSubmit ? (
            <Feedback360Panel>
              <Feedback360PanelHeader
                  compact
                  eyebrow="Needs attention"
                  title={`${attentionQuestionCount} question${attentionQuestionCount === 1 ? '' : 's'} still need attention before submitting`}
                  description={`Every question needs a rating and a supporting comment of ${MIN_REQUIRED_COMMENT_LENGTH}–${MAX_REQUIRED_COMMENT_LENGTH} characters. Select an item to jump to it.`}
              />
              <div className="f360-attention-list">
                {attentionItems.slice(0, 8).map((item, itemIndex) => (
                    <button type="button" key={`${item.index}-${item.message}-${itemIndex}`} onClick={() => scrollToQuestion(item.index)}>
                      <span>{item.label}</span>
                      <em>{item.message}</em>
                    </button>
                ))}
                {attentionItems.length > 8 ? <small>+{attentionItems.length - 8} more items</small> : null}
              </div>
            </Feedback360Panel>
        ) : null}
        {additionalCommentsTooLong ? <Feedback360Banner tone="warning">Additional comments must be {MAX_ADDITIONAL_COMMENT_LENGTH} characters or fewer.</Feedback360Banner> : null}
        {saveDraftMutation.error instanceof Error ? <Feedback360Banner tone="danger">{saveDraftMutation.error.message}</Feedback360Banner> : null}
        {submitMutation.error instanceof Error ? <Feedback360Banner tone="danger">{submitMutation.error.message}</Feedback360Banner> : null}

        <form className="f360-form-grid" onSubmit={onSubmit}>
          <div className="f360-person-grid">
            <EmployeeInfoPanel title="Employee receiving feedback" person={assignment.target} fallbackName={assignment.targetEmployeeName} />
            {isSelfFeedback ? null : <EmployeeInfoPanel title="Evaluator" person={assignment.evaluator} roleLabel={roleLabel} />}
          </div>

          <Feedback360Panel>
            <Feedback360PanelHeader
                compact
                title="Assessment details"
                description="Assessment Date and Effective Date are kept as text until the business rule is finalized."
            />
            <Feedback360InfoGrid columns={2}>
              <Feedback360Field label="Assessment Date">
                <input disabled={!assignment.canSubmit || submitting} placeholder="Enter assessment date" {...register('assessmentDateText')} />
              </Feedback360Field>
              <Feedback360Field label="Effective Date">
                <input disabled={!assignment.canSubmit || submitting} placeholder="Enter effective date" {...register('effectiveDateText')} />
              </Feedback360Field>
            </Feedback360InfoGrid>
          </Feedback360Panel>

          <Feedback360Panel>
            <Feedback360PanelHeader
                compact
                title="Evaluation questions"
                description="Choose a rating, then add a clear supporting comment for each question."
            />
            <div className="f360-section-grid">
              {groupedQuestions.map((group) => (
                  <section key={group.code} className="f360-competency-section">
                    <header>
                      <div>
                        <h3>{group.label}</h3>
                        <p>{group.questions.length} rating question{group.questions.length === 1 ? '' : 's'}</p>
                      </div>
                      <Feedback360StatusPill tone="brand">Competency</Feedback360StatusPill>
                    </header>
                    <div className="f360-question-stack">
                      {group.questions.map((question) => {
                        const index = question.responseIndex;
                        const selectedRating = watchedResponses?.[index]?.ratingValue ?? '';
                        const ratingOptions = getQuestionRatingOptions(question);
                        const responseCommentRegistration = register(`responses.${index}.comment`);
                        const commentLength = normalizedLength(watchedResponses?.[index]?.comment);
                        const commentTooShort = commentLength > 0 && commentLength < MIN_REQUIRED_COMMENT_LENGTH;
                        const commentTooLong = commentLength > MAX_REQUIRED_COMMENT_LENGTH;
                        const questionHasError = Boolean(errors.responses?.[index]?.comment || errors.responses?.[index]?.ratingValue);
                        return (
                            <article id={`feedback-question-${index}`} key={question.id} className={cx('f360-question-card', questionHasError && 'has-error')}>
                              <div className="f360-question-index">{index + 1}</div>
                              <div className="f360-question-body">
                                <div className="f360-question-topline">
                                  <div className="f360-question-meta">
                                    {question.questionCode ? <Feedback360StatusPill>{question.questionCode}</Feedback360StatusPill> : null}
                                    <Feedback360StatusPill tone="success">Rating 1–5 + required comment</Feedback360StatusPill>
                                  </div>
                                  {normalizedLength(question.helpText) > 0 ? (
                                      <Feedback360HelpTip>{question.helpText}</Feedback360HelpTip>
                                  ) : null}
                                </div>
                                <p className="f360-question-text">{question.questionText}</p>

                                <input type="hidden" {...register(`responses.${index}.assignmentQuestionId`, { value: question.assignmentQuestionId ?? question.id, valueAsNumber: true })} />
                                <input type="hidden" {...register(`responses.${index}.questionId`, { value: question.sourceQuestionId ?? question.id, valueAsNumber: true })} />

                                <div className="f360-rating-row" role="radiogroup" aria-label={`Rating for question ${index + 1}`}>
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
                                            title={option.label}
                                        >
                                          {option.value}
                                        </button>
                                    );
                                  })}
                                </div>
                                <input type="hidden" {...register(`responses.${index}.ratingValue`)} />
                                {errors.responses?.[index]?.ratingValue ? <small className="f360-error">{errors.responses[index]?.ratingValue?.message}</small> : null}

                                <Feedback360Field label={<span>Comment <em>*</em></span>}>
                            <textarea
                                disabled={!assignment.canSubmit || submitting}
                                {...responseCommentRegistration}
                                maxLength={MAX_REQUIRED_COMMENT_LENGTH + 100}
                                placeholder="Share a specific example, observed behavior, or impact."
                                onChange={(event) => {
                                  responseCommentRegistration.onChange(event);
                                  setDraftSavedMessage('');
                                }}
                            />
                                  <Feedback360CharacterCount
                                      current={commentLength}
                                      max={MAX_REQUIRED_COMMENT_LENGTH}
                                      min={MIN_REQUIRED_COMMENT_LENGTH}
                                      invalid={commentTooShort || commentTooLong}
                                      valid={commentLength >= MIN_REQUIRED_COMMENT_LENGTH && !commentTooLong}
                                  />
                                  {errors.responses?.[index]?.comment ? <small className="f360-error">{errors.responses[index]?.comment?.message}</small> : null}
                                </Feedback360Field>
                              </div>
                            </article>
                        );
                      })}
                    </div>
                  </section>
              ))}
            </div>
          </Feedback360Panel>

          <Feedback360Panel>
            <Feedback360Field label="Additional comments">
            <textarea
                disabled={!assignment.canSubmit || submitting}
                {...additionalCommentsRegistration}
                placeholder="Add any additional context, examples, strengths, or improvement suggestions."
                maxLength={MAX_ADDITIONAL_COMMENT_LENGTH + 100}
                onChange={(event) => {
                  additionalCommentsRegistration.onChange(event);
                  setDraftSavedMessage('');
                }}
            />
              <Feedback360CharacterCount current={additionalCommentsLength} max={MAX_ADDITIONAL_COMMENT_LENGTH} optional invalid={additionalCommentsTooLong} />
            </Feedback360Field>
          </Feedback360Panel>

          <Feedback360Panel>
            <Feedback360PanelHeader
                compact
                title="Score explanation"
                description="Scores are summarized after submission using the campaign scoring settings. The formula is intentionally not shown on the evaluator form."
            />
            <div className="f360-score-grid">
              {SCORE_EXPLANATION.map((item) => (
                  <div className="f360-score-cell" key={item.range}>
                    <span>{item.range}</span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </div>
              ))}
            </div>
          </Feedback360Panel>

          <div className="f360-sticky-actions">
            <div>
              <span>{autoSaveText}</span>
              {attentionQuestionCount > 0 ? <small>{attentionQuestionCount} question{attentionQuestionCount === 1 ? '' : 's'} need attention before submitting</small> : isDirty && assignment.canSubmit ? <small>Unsaved changes detected</small> : <small>Ready when you are</small>}
            </div>
            <Feedback360Button variant="secondary" disabled={!assignment.canSubmit || actionBusy} type="button" onClick={handleSaveDraft}>
              {draftSaving ? 'Saving draft...' : 'Save draft'}
            </Feedback360Button>
            <Feedback360Button disabled={!assignment.canSubmit || actionBusy || additionalCommentsTooLong} type="submit">
              {submitting ? 'Submitting feedback...' : 'Submit final feedback'}
            </Feedback360Button>
          </div>
        </form>
      </Feedback360Shell>
  );
};

export default FeedbackFormPage;
