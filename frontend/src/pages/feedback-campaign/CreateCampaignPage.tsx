import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { feedbackCampaignApi } from '../../api/feedbackCampaignApi';
import {
  useAssignFeedbackTargets,
  useCreateFeedbackCampaign,
  useFeedbackCampaign,
  useFeedbackCampaignReferenceData,
  useGenerateFeedbackAssignments,
  usePreviewFeedbackAssignments,
} from '../../hooks/useFeedbackCampaignSetup';
import type {
  CreateFeedbackCampaignInput,
  FeedbackAssignmentGenerationResponse,
  FeedbackCampaign,
  EvaluatorConfigInput,
  ManualAssignmentInput,
} from '../../types/feedbackCampaign';
import AssignmentPreviewComponent from './components/AssignmentPreviewComponent';
import EvaluatorConfigComponent from './components/EvaluatorConfigComponent';
import TargetSelectionComponent from './components/TargetSelectionComponent';
import './feedback-campaign-setup.css';

const campaignSchema = z
    .object({
      name: z.string().trim().min(1, 'Campaign name is required.').max(120, 'Campaign name must be 120 characters or fewer.'),
      description: z.string().max(2000, 'Description must be 2,000 characters or fewer.').optional(),
      instructions: z.string().max(4000, 'Instructions must be 4,000 characters or fewer.').optional(),
      startDate: z.string().min(1, 'Start date is required.'),
      endDate: z.string().min(1, 'End date is required.'),
      managerFeedbackAnonymous: z.boolean(),
      peerFeedbackAnonymous: z.boolean(),
      subordinateFeedbackAnonymous: z.boolean(),
      selfFeedbackAnonymous: z.boolean(),
      redistributeMissingRelationshipWeight: z.boolean(),
      autoSubmitCompletedDraftsOnClose: z.boolean(),
    })
    .refine((values) => values.startDate < values.endDate, {
      message: 'Start date must be earlier than end date.',
      path: ['endDate'],
    });

type CampaignFormValues = z.input<typeof campaignSchema>;
type WizardStepId = 'campaign' | 'targets' | 'evaluators' | 'review';

const defaultCampaignValues = (): CampaignFormValues => {
  const start = new Date();
  const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);

  return {
    name: '',
    description: '',
    instructions: '',
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    managerFeedbackAnonymous: false,
    peerFeedbackAnonymous: true,
    subordinateFeedbackAnonymous: true,
    selfFeedbackAnonymous: false,
    redistributeMissingRelationshipWeight: true,
    autoSubmitCompletedDraftsOnClose: false,
  };
};

const buildCampaignPayload = (values: CampaignFormValues): CreateFeedbackCampaignInput => ({
  name: values.name.trim(),
  campaignType: '360_FEEDBACK',
  reviewYear: Number(values.startDate.slice(0, 4)),
  startDate: values.startDate,
  endDate: values.endDate,
  startAt: `${values.startDate}T09:00:00`,
  endAt: `${values.endDate}T17:00:00`,
  formId: null,
  description: values.description?.trim() || undefined,
  instructions: values.instructions?.trim() || undefined,
  managerFeedbackAnonymous: values.managerFeedbackAnonymous,
  peerFeedbackAnonymous: values.peerFeedbackAnonymous,
  subordinateFeedbackAnonymous: values.subordinateFeedbackAnonymous,
  selfFeedbackAnonymous: values.selfFeedbackAnonymous,
  redistributeMissingRelationshipWeight: values.redistributeMissingRelationshipWeight,
  autoSubmitCompletedDraftsOnClose: values.autoSubmitCompletedDraftsOnClose,
});

const getDurationDays = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
};

const stepLabel: Record<WizardStepId, string> = {
  campaign: 'Campaign info',
  targets: 'Target employees',
  evaluators: 'Evaluator rules',
  review: 'Review & overrides',
};

const CreateCampaignPage = () => {
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState<WizardStepId>('campaign');
  const [assignmentPreview, setAssignmentPreview] =
      useState<FeedbackAssignmentGenerationResponse | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<number | null>(null);

  const {
    employeesQuery,
    departmentsQuery,
    teamsQuery,
  } = useFeedbackCampaignReferenceData();
  const campaignQuery = useFeedbackCampaign(campaignId);

  const createCampaignMutation = useCreateFeedbackCampaign();
  const assignTargetsMutation = useAssignFeedbackTargets();
  const previewAssignmentsMutation = usePreviewFeedbackAssignments();
  const generateAssignmentsMutation = useGenerateFeedbackAssignments();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: defaultCampaignValues(),
  });

  const watchedCampaign = watch();
  const campaignDurationDays = getDurationDays(watchedCampaign.startDate, watchedCampaign.endDate);
  const derivedReviewYear = watchedCampaign.startDate ? Number(watchedCampaign.startDate.slice(0, 4)) : new Date().getFullYear();

  const activeCampaign = (campaignQuery.data as FeedbackCampaign | undefined) ?? null;
  const targetCount = activeCampaign?.targetCount ?? activeCampaign?.targetEmployeeIds?.length ?? 0;
  const assignmentCount = assignmentPreview?.totalEvaluatorsGenerated ?? activeCampaign?.assignmentCount ?? 0;
  const blockingError =
      employeesQuery.error instanceof Error
          ? employeesQuery.error.message
          : departmentsQuery.error instanceof Error
              ? departmentsQuery.error.message
              : teamsQuery.error instanceof Error
                  ? teamsQuery.error.message
                  : null;

  const isReferenceLoading =
      employeesQuery.isLoading ||
      departmentsQuery.isLoading ||
      teamsQuery.isLoading;

  const steps = useMemo(
      () => [
        {
          id: 'campaign' as const,
          label: stepLabel.campaign,
          helper: activeCampaign ? activeCampaign.name : 'Name, window, instructions, policy defaults',
          status: activeCampaign ? 'complete' : 'active',
          disabled: false,
          stat: activeCampaign ? 'Created' : 'Draft',
        },
        {
          id: 'targets' as const,
          label: stepLabel.targets,
          helper: 'Choose employees and save readiness context',
          status: targetCount > 0 ? 'complete' : activeCampaign ? 'ready' : 'locked',
          disabled: !activeCampaign,
          stat: `${targetCount} selected`,
        },
        {
          id: 'evaluators' as const,
          label: stepLabel.evaluators,
          helper: 'Auto roles, peer sources, counts, flexible mode',
          status: assignmentPreview ? 'complete' : targetCount > 0 ? 'ready' : 'locked',
          disabled: !activeCampaign || targetCount === 0,
          stat: assignmentPreview ? 'Previewed' : 'Pending',
        },
        {
          id: 'review' as const,
          label: stepLabel.review,
          helper: 'Names, warnings, manual overrides, final save',
          status: assignmentPreview ? 'ready' : 'locked',
          disabled: !assignmentPreview,
          stat: `${assignmentCount} assignments`,
        },
      ],
      [activeCampaign, assignmentCount, assignmentPreview, targetCount],
  );

  const handleStepClick = (stepId: WizardStepId, disabled: boolean) => {
    if (!disabled) {
      setActiveStep(stepId);
    }
  };

  const handleCreateCampaign = async (values: CampaignFormValues) => {
    setPageError(null);
    setPageSuccess(null);
    setAssignmentPreview(null);

    try {
      const created = await createCampaignMutation.mutateAsync(buildCampaignPayload(values));
      setCampaignId(created.id);
      setActiveStep('targets');
      setPageSuccess(`Campaign "${created.name}" created. Continue with target selection.`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to create campaign.');
    }
  };

  const handleAssignTargets = async (payload: { employeeIds: number[] }) => {
    if (campaignId == null) {
      return;
    }

    setPageError(null);
    setPageSuccess(null);
    setAssignmentPreview(null);

    try {
      const updatedCampaign = await assignTargetsMutation.mutateAsync({
        campaignId,
        payload,
      });
      setActiveStep('evaluators');
      setPageSuccess(
          `${updatedCampaign.targetCount} target employee(s) saved for campaign "${updatedCampaign.name}".`,
      );
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to save target employees.');
    }
  };

  const handlePreviewAssignments = async (payload: EvaluatorConfigInput) => {
    if (campaignId == null) {
      return;
    }

    setPageError(null);
    setPageSuccess(null);

    try {
      const preview = await previewAssignmentsMutation.mutateAsync({
        campaignId,
        payload,
      });
      setAssignmentPreview(preview);
      setActiveStep('review');
      setPageSuccess('Suggested evaluator assignments previewed. Review names and warnings before saving.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to preview evaluator assignments.');
    }
  };

  const handleGenerateAssignments = async (payload: EvaluatorConfigInput) => {
    if (campaignId == null) {
      return;
    }

    setPageError(null);
    setPageSuccess(null);

    try {
      const preview = await generateAssignmentsMutation.mutateAsync({
        campaignId,
        payload,
      });
      setAssignmentPreview(preview);
      setActiveStep('review');
      setPageSuccess('Evaluator assignments saved. Manual overrides, if any, were preserved.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to generate evaluator assignments.');
    }
  };

  const handleAddManualAssignment = async (payload: ManualAssignmentInput) => {
    if (campaignId == null) {
      return;
    }
    setManualSubmitting(true);
    setPageError(null);
    setPageSuccess(null);
    try {
      const response = await feedbackCampaignApi.addManualAssignment(campaignId, payload);
      setAssignmentPreview(response);
      setActiveStep('review');
      setPageSuccess('Manual evaluator assignment added and saved.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to add manual evaluator assignment.');
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: number) => {
    if (campaignId == null) {
      return;
    }
    setRemovingAssignmentId(assignmentId);
    setPageError(null);
    setPageSuccess(null);
    try {
      const response = await feedbackCampaignApi.removeAssignment(campaignId, assignmentId);
      setAssignmentPreview(response);
      setActiveStep('review');
      setPageSuccess('Evaluator assignment removed.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to remove evaluator assignment.');
    } finally {
      setRemovingAssignmentId(null);
    }
  };

  return (
      <div className="feedback-setup-page">
        <section className="feedback-setup-hero feedback-setup-hero-redesign">
          <div className="feedback-setup-hero-copy">
            <p className="feedback-setup-kicker">360-Degree Feedback Campaign Builder</p>
            <h1>Build a governed campaign without scrolling through a long setup page.</h1>
            <p>
              Create the campaign shell, select target employees, configure evaluator assignment rules, then review exact evaluator names and manual overrides in one guided workspace.
            </p>
          </div>
          <div className="feedback-setup-hero-panel" aria-label="Campaign setup progress summary">
            <div>
              <span>Campaign</span>
              <strong>{activeCampaign ? `#${activeCampaign.id}` : 'Not created'}</strong>
            </div>
            <div>
              <span>Targets</span>
              <strong>{targetCount}</strong>
            </div>
            <div>
              <span>Assignments</span>
              <strong>{assignmentCount}</strong>
            </div>
          </div>
        </section>

        {pageSuccess ? <div className="feedback-setup-banner success">{pageSuccess}</div> : null}
        {pageError ? <div className="feedback-setup-banner error">{pageError}</div> : null}
        {blockingError ? <div className="feedback-setup-banner error">{blockingError}</div> : null}

        <div className="feedback-setup-workspace">
          <aside className="feedback-setup-step-rail" aria-label="Campaign setup steps">
            <div className="feedback-setup-step-rail-header">
              <p className="feedback-setup-eyebrow">Setup path</p>
              <h2>{activeCampaign ? activeCampaign.name : 'New 360 campaign'}</h2>
              <span>{activeCampaign?.status ?? 'DRAFT'}</span>
            </div>

            <nav className="feedback-setup-step-nav">
              {steps.map((step, index) => (
                  <button
                      key={step.id}
                      className={`feedback-setup-step-button ${activeStep === step.id ? 'active' : ''} ${step.disabled ? 'disabled' : ''}`}
                      disabled={step.disabled}
                      type="button"
                      onClick={() => handleStepClick(step.id, step.disabled)}
                  >
                    <span className="feedback-setup-step-number">{index + 1}</span>
                    <span className="feedback-setup-step-body">
                  <strong>{step.label}</strong>
                  <small>{step.helper}</small>
                </span>
                    <span className={`feedback-setup-step-state ${step.status}`}>{step.stat}</span>
                  </button>
              ))}
            </nav>

            <div className="feedback-setup-step-note">
              <strong>Builder logic</strong>
              <span>Only one step is open at a time. Manual overrides stay protected when auto assignments regenerate.</span>
            </div>
          </aside>

          <main className="feedback-setup-panel-shell">
            {activeStep === 'campaign' ? (
                <section className="feedback-setup-card feedback-setup-card-featured">
                  <div className="feedback-setup-card-header">
                    <div>
                      <p className="feedback-setup-eyebrow">Step 1</p>
                      <h2>Campaign information</h2>
                      <p className="feedback-setup-card-subtitle">
                        Define the campaign identity, submission window, HR instructions, and default anonymity policy before choosing targets.
                      </p>
                    </div>
                    {activeCampaign ? <div className="feedback-setup-chip">Campaign #{activeCampaign.id}</div> : null}
                  </div>

                  {isReferenceLoading ? (
                      <div className="feedback-setup-empty">Loading campaign setup data...</div>
                  ) : (
                      <form className="feedback-setup-stack" onSubmit={handleSubmit(handleCreateCampaign)}>
                        <div className="feedback-setup-campaign-layout">
                          <div className="feedback-setup-campaign-main">
                            <div className="feedback-setup-section-card">
                              <div className="feedback-setup-section-title">
                                <span>01</span>
                                <div>
                                  <strong>Identity</strong>
                                  <small>Name and context shown across HR dashboards and evaluator tasks.</small>
                                </div>
                              </div>
                              <div className="feedback-setup-form-grid">
                                <label className="feedback-setup-field feedback-setup-field-wide">
                                  <span>Campaign name</span>
                                  <input
                                      {...register('name')}
                                      placeholder="Example: 2026 Mid-Year Engineering 360"
                                  />
                                  {errors.name ? <small className="feedback-setup-error">{errors.name.message}</small> : null}
                                </label>

                                <label className="feedback-setup-field feedback-setup-field-wide">
                                  <span>Description</span>
                                  <textarea
                                      {...register('description')}
                                      placeholder="Explain the campaign purpose, review population, and expected outcome."
                                  />
                                  {errors.description ? <small className="feedback-setup-error">{errors.description.message}</small> : null}
                                </label>

                                <label className="feedback-setup-field feedback-setup-field-wide">
                                  <span>Evaluator instructions</span>
                                  <textarea
                                      {...register('instructions')}
                                      placeholder="Give evaluators guidance on confidentiality, rating expectations, and comment quality."
                                  />
                                  {errors.instructions ? <small className="feedback-setup-error">{errors.instructions.message}</small> : null}
                                </label>
                              </div>
                            </div>

                            <div className="feedback-setup-section-card">
                              <div className="feedback-setup-section-title">
                                <span>02</span>
                                <div>
                                  <strong>Window</strong>
                                  <small>The precise time window is saved as 09:00 start and 17:00 close for now.</small>
                                </div>
                              </div>
                              <div className="feedback-setup-form-grid">
                                <label className="feedback-setup-field">
                                  <span>Start date</span>
                                  <input type="date" {...register('startDate')} />
                                  {errors.startDate ? <small className="feedback-setup-error">{errors.startDate.message}</small> : null}
                                </label>

                                <label className="feedback-setup-field">
                                  <span>End date</span>
                                  <input type="date" {...register('endDate')} />
                                  {errors.endDate ? <small className="feedback-setup-error">{errors.endDate.message}</small> : null}
                                </label>

                                <div className="feedback-setup-insight-card">
                                  <span>Review year</span>
                                  <strong>{derivedReviewYear}</strong>
                                  <small>Derived from the start date.</small>
                                </div>

                                <div className="feedback-setup-insight-card">
                                  <span>Duration</span>
                                  <strong>{campaignDurationDays || '-'} days</strong>
                                  <small>End date must be after start date.</small>
                                </div>
                              </div>
                            </div>
                          </div>

                          <aside className="feedback-setup-campaign-side">
                            <div className="feedback-setup-section-card accent">
                              <div className="feedback-setup-section-title">
                                <span>03</span>
                                <div>
                                  <strong>Default anonymity</strong>
                                  <small>Relationship-level visibility is stored at campaign level.</small>
                                </div>
                              </div>
                              <div className="feedback-setup-policy-grid">
                                <label className="feedback-setup-toggle-card">
                                  <input type="checkbox" {...register('managerFeedbackAnonymous')} />
                                  <span>Manager feedback anonymous</span>
                                </label>
                                <label className="feedback-setup-toggle-card">
                                  <input type="checkbox" {...register('peerFeedbackAnonymous')} />
                                  <span>Peer feedback anonymous</span>
                                </label>
                                <label className="feedback-setup-toggle-card">
                                  <input type="checkbox" {...register('subordinateFeedbackAnonymous')} />
                                  <span>Subordinate feedback anonymous</span>
                                </label>
                                <label className="feedback-setup-toggle-card">
                                  <input type="checkbox" {...register('selfFeedbackAnonymous')} />
                                  <span>Self feedback anonymous</span>
                                </label>
                              </div>
                            </div>

                            <div className="feedback-setup-section-card">
                              <div className="feedback-setup-section-title">
                                <span>04</span>
                                <div>
                                  <strong>Closure & scoring defaults</strong>
                                  <small>These are campaign-level safeguards; weights will be handled in Questions & Weights.</small>
                                </div>
                              </div>
                              <div className="feedback-setup-policy-grid">
                                <label className="feedback-setup-toggle-card">
                                  <input type="checkbox" {...register('redistributeMissingRelationshipWeight')} />
                                  <span>Redistribute missing role weight</span>
                                </label>
                                <label className="feedback-setup-toggle-card">
                                  <input type="checkbox" {...register('autoSubmitCompletedDraftsOnClose')} />
                                  <span>Auto-submit completed drafts on close</span>
                                </label>
                              </div>
                            </div>
                          </aside>
                        </div>

                        <div className="feedback-setup-actions feedback-setup-actions-sticky">
                          <button className="feedback-setup-primary" disabled={createCampaignMutation.isPending || Boolean(activeCampaign)} type="submit">
                            {createCampaignMutation.isPending ? 'Creating campaign...' : activeCampaign ? 'Campaign already created' : 'Create campaign and continue'}
                          </button>
                          {activeCampaign ? (
                              <button className="feedback-setup-secondary" type="button" onClick={() => setActiveStep('targets')}>
                                Continue to target selection
                              </button>
                          ) : null}
                        </div>
                      </form>
                  )}
                </section>
            ) : null}

            {activeStep === 'targets' && activeCampaign ? (
                <TargetSelectionComponent
                    departments={departmentsQuery.data ?? []}
                    employees={employeesQuery.data ?? []}
                    initialSelectedIds={activeCampaign.targetEmployeeIds}
                    onSubmit={handleAssignTargets}
                    submitting={assignTargetsMutation.isPending}
                    teams={teamsQuery.data ?? []}
                />
            ) : null}

            {activeStep === 'evaluators' && activeCampaign ? (
                <EvaluatorConfigComponent
                    onPreview={handlePreviewAssignments}
                    onGenerate={handleGenerateAssignments}
                    previewing={previewAssignmentsMutation.isPending}
                    generating={generateAssignmentsMutation.isPending}
                />
            ) : null}

            {activeStep === 'review' && activeCampaign ? (
                <AssignmentPreviewComponent
                    campaign={activeCampaign}
                    employees={employeesQuery.data ?? []}
                    preview={assignmentPreview}
                    manualSubmitting={manualSubmitting}
                    removingAssignmentId={removingAssignmentId}
                    onAddManual={handleAddManualAssignment}
                    onRemoveAssignment={handleRemoveAssignment}
                />
            ) : null}
          </main>
        </div>
      </div>
  );
};

export default CreateCampaignPage;
