import { useEffect, useMemo, useState } from 'react';
import { authStorage } from '../../../services/authStorage';
import { LaunchReadinessSection } from './campaign-setup/components/LaunchReadinessSection';
import { CampaignInfoStep } from './campaign-setup/components/CampaignInfoStep';
import { TargetEmployeesStep } from './campaign-setup/components/TargetEmployeesStep';
import { EvaluatorAssignmentsStep } from './campaign-setup/components/EvaluatorAssignmentsStep';
import { QuestionReviewStep } from './campaign-setup/components/QuestionReviewStep';
import { CampaignSetupHeader } from './campaign-setup/components/CampaignSetupHeader';
import { CampaignSetupStepper } from './campaign-setup/components/CampaignSetupStepper';
import { CampaignRecordsTable } from './campaign-setup/components/CampaignRecordsTable';
import { useCampaignSetupLoaders } from './campaign-setup/hooks/useCampaignSetupLoaders';
import { useCampaignInfoActions } from './campaign-setup/hooks/useCampaignInfoActions';
import { useCampaignTargetActions } from './campaign-setup/hooks/useCampaignTargetActions';
import { useCampaignEvaluatorActions } from './campaign-setup/hooks/useCampaignEvaluatorActions';
import { useCampaignQuestionReviewActions } from './campaign-setup/hooks/useCampaignQuestionReviewActions';
import { useCampaignLifecycleActions } from './campaign-setup/hooks/useCampaignLifecycleActions';
import { useCampaignSetupSteps } from './campaign-setup/hooks/useCampaignSetupSteps';
import { useCampaignTargetViewModel } from './campaign-setup/hooks/useCampaignTargetViewModel';
import { useCampaignEvaluatorViewModel } from './campaign-setup/hooks/useCampaignEvaluatorViewModel';
import { useCampaignQuestionLaunchViewModel } from './campaign-setup/hooks/useCampaignQuestionLaunchViewModel';
import {
  DEFAULT_EVALUATOR_CONFIG,
  getPeerReviewerCount,
  normalizeEvaluatorConfig,
} from '../../../types/feedbackCampaign';
import type {
  FeedbackCampaign,
  FeedbackAssignmentGenerationResponse,
  EvaluatorConfigInput,
  FeedbackCampaignTargetsResponse,
  FeedbackDepartmentOption,
  FeedbackTargetCandidate,
  FeedbackTeamOption,
  FeedbackCampaignQuestionReview,
  FeedbackCampaignActivationReadiness,
  FeedbackCampaignScoringConfig,
  FeedbackTargetEmployee,
} from '../../../types/feedbackCampaign';
import type {
  CampaignInfoForm,
  DraftEvaluatorAddition,
  FieldErrors,
  ReadinessFilter,
  SetupStepKey,
} from './campaign-setup/types/campaignSetupTypes';
import {
  DESCRIPTION_LIMIT,
  defaultForm,
  relationshipOptions,
  statusDescriptions,
  statusLabels,
} from './campaign-setup/utils/campaignSetupConstants';
import {
  assignmentReadinessClass,
  assignmentSourceLabel,
  assignmentStatusLabel,
  completionLabel,
  formatWindow,
  initials,
  personSubtitle,
  readinessClass,
  readinessLabel,
  recipientDetailItems,
  relationshipIcon,
  relationshipLabel,
  statusClass,
} from './campaign-setup/utils/campaignSetupFormatters';
import {
  formatPercent,
} from './campaign-setup/utils/campaignSetupCollections';
import {
  emptyActivationReadiness,
  emptyAssignmentPreview,
  emptyQuestionReview,
  emptyScoringConfig,
  emptyTargetsResponse,
} from './campaign-setup/utils/campaignSetupEmptyState';
import { cleanEvaluatorNote } from './campaign-setup/utils/campaignSetupMessages';

interface Props {
  onCampaignCreated: (campaign: FeedbackCampaign) => void;
}


export default function CampaignSetupTab({ onCampaignCreated }: Props) {
  const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | ''>('');
  const [form, setForm] = useState<CampaignInfoForm>(defaultForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [departments, setDepartments] = useState<FeedbackDepartmentOption[]>([]);
  const [, setTeams] = useState<FeedbackTeamOption[]>([]);
  const [employees, setEmployees] = useState<FeedbackTargetEmployee[]>([]);
  const [candidates, setCandidates] = useState<FeedbackTargetCandidate[]>([]);
  const [targetsResponse, setTargetsResponse] = useState<FeedbackCampaignTargetsResponse>(emptyTargetsResponse(null));
  const [selectedTargetIds, setSelectedTargetIds] = useState<number[]>([]);
  const [targetSearch, setTargetSearch] = useState('');
  const [currentDepartmentId, setCurrentDepartmentId] = useState<number | ''>('');
  const [parentDepartmentId] = useState<number | ''>('');
  const [teamId] = useState<number | ''>('');
  const [positionFilter, setPositionFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [readiness, setReadiness] = useState<ReadinessFilter>('AVAILABLE');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);
  const [evaluatorConfig, setEvaluatorConfig] = useState<EvaluatorConfigInput>(() => normalizeEvaluatorConfig(DEFAULT_EVALUATOR_CONFIG));
  const [assignmentPreview, setAssignmentPreview] = useState<FeedbackAssignmentGenerationResponse>(emptyAssignmentPreview(null));
  const [previewingAssignments, setPreviewingAssignments] = useState(false);
  const [generatingAssignments, setGeneratingAssignments] = useState(false);
  const [questionReview, setQuestionReview] = useState<FeedbackCampaignQuestionReview>(emptyQuestionReview(null));
  const [scoringConfig, setScoringConfig] = useState<FeedbackCampaignScoringConfig>(emptyScoringConfig(null));
  const [savingScoringConfig, setSavingScoringConfig] = useState(false);
  const [selectedQuestionGroupKey, setSelectedQuestionGroupKey] = useState<string>('');
  const [loadingQuestionReview, setLoadingQuestionReview] = useState(false);
  const [resolvingQuestionReview, setResolvingQuestionReview] = useState(false);
  const [savingQuestionReview, setSavingQuestionReview] = useState(false);
  const [activationReadiness, setActivationReadiness] = useState<FeedbackCampaignActivationReadiness>(emptyActivationReadiness(null));
  const [loadingActivation, setLoadingActivation] = useState(false);
  const [activatingCampaign, setActivatingCampaign] = useState(false);
  const [activeStepKey, setActiveStepKey] = useState<SetupStepKey>('foundation');
  const [campaignInfoOpen, setCampaignInfoOpen] = useState(false);
  const [recipientDetails, setRecipientDetails] = useState<FeedbackTargetCandidate | null>(null);
  const [evaluatorSearch, setEvaluatorSearch] = useState('');
  const [addingEvaluator, setAddingEvaluator] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<number | null>(null);
  const [draftRemovedEvaluatorKeys, setDraftRemovedEvaluatorKeys] = useState<Set<string>>(() => new Set());
  const [draftManualAdditions, setDraftManualAdditions] = useState<DraftEvaluatorAddition[]>([]);

  const selectedCampaign = useMemo(
      () => campaigns.find(campaign => campaign.id === selectedCampaignId) ?? null,
      [campaigns, selectedCampaignId],
  );

  const currentUser = useMemo(() => authStorage.getUser() as { fullName?: string; email?: string; employeeCode?: string; position?: string } | null, []);

  const {
    savedTargetIds,
    targetIdsNormalized,
    hasUnsavedTargetChanges,
    selectedTargets,
    positionOptions,
    levelOptions,
    candidateRows,
    filteredSelectableCandidateIds,
    filteredCandidateCount,
    availableCandidateCount,
    reviewCandidateCount,
    blockedCandidateCount,
    selectedReadyCount,
    selectedReviewCount,
    selectedUnavailableCount,
    hasUnavailableSelection,
    selectedDepartmentCount,
    selectedDepartmentSummary,
  } = useCampaignTargetViewModel({
    targetsResponse,
    selectedTargetIds,
    candidates,
    positionFilter,
    levelFilter,
  });

  const previewWarningCount = assignmentPreview.requests.filter(item => item.warnings.length > 0).length;
  const hasAssignmentPreview = assignmentPreview.requests.length > 0;
  const canEditEvaluators = selectedCampaign?.status === 'DRAFT';
  const normalizedEvaluatorConfig = useMemo(() => normalizeEvaluatorConfig(evaluatorConfig), [evaluatorConfig]);
  const peerReviewerCount = getPeerReviewerCount(normalizedEvaluatorConfig);
  const savedAssignmentCount = selectedCampaign?.assignmentCount ?? 0;

  const {
    assignmentDetails,
    previewItemByTarget,
    displayedAssignmentDetails,
    hasDraftEvaluatorChanges,
    assignmentsByTarget,
    evaluatorTargets,
    setSelectedEvaluatorTargetId,
    activeEvaluatorTargetId,
    activeEvaluatorTarget,
    activePreviewItem,
    evaluatorCandidates,
    relationshipCandidatesLoading,
    relationshipCandidatesError,
    manualCandidateNotice,
    manualEvaluatorEligibilityError,
    activeAssignmentsByRelationship,
    activeTargetSummary,
    manualForm,
    setManualForm,
  } = useCampaignEvaluatorViewModel({
    selectedCampaignId: selectedCampaign?.id ?? null,
    assignmentPreview,
    employees,
    candidates,
    selectedTargets,
    savedTargets: targetsResponse.targets,
    savedTargetIds,
    draftManualAdditions,
    draftRemovedEvaluatorKeys,
    evaluatorSearch,
  });

  const hasSavedEvaluatorAssignments = assignmentDetails.some(item => item.assignmentId != null);
  const {
    questionGroups,
    competencyWeights,
    competencyWeightTotal,
    competencyWeightDelta,
    competencyWeightsReady,
    questionSaveDisabled,
    questionReviewReady,
    canValidateSetup,
    canActivate,
    campaignLaunched,
    launchReady,
    launchBannerTitle,
    launchBannerMessage,
    launchTargetCount,
    launchAssignmentCount,
    roleAssignmentSummary,
    privacySummary,
    launchChecklist,
  } = useCampaignQuestionLaunchViewModel({
    questionReview,
    selectedQuestionGroupKey,
    selectedCampaign,
    activationReadiness,
    targetsResponse,
    savedAssignmentCount,
    scoringConfig,
    savingQuestionReview,
  });

  const {
    applyForm,
    refreshCampaigns,
    loadDirectoryFilters,
    loadCandidates,
    loadTargets,
    loadQuestionReview,
    loadScoringConfig,
    loadActivationState,
    loadCampaignSnapshot,
  } = useCampaignSetupLoaders({
    targetSearch,
    currentDepartmentId,
    parentDepartmentId,
    teamId,
    readiness,
    selectedCampaign,
    setCampaigns,
    setLoadingCampaigns,
    setSelectedCampaignId,
    setDepartments,
    setTeams,
    setEmployees,
    setCandidates,
    setLoadingCandidates,
    setTargetsResponse,
    setSelectedTargetIds,
    setLoadingTargets,
    setQuestionReview,
    setSelectedQuestionGroupKey,
    setLoadingQuestionReview,
    setScoringConfig,
    setActivationReadiness,
    setLoadingActivation,
    setAssignmentPreview,
    setForm,
    setError,
    onCampaignCreated,
  });

  useEffect(() => {
    void refreshCampaigns();
    void loadDirectoryFilters();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadCandidates();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [targetSearch, currentDepartmentId, parentDepartmentId, teamId, readiness, selectedCampaign?.id]);

  useEffect(() => {
    if (selectedCampaign?.id) {
      void loadTargets(selectedCampaign.id);
      void loadQuestionReview(selectedCampaign.id);
      void loadScoringConfig(selectedCampaign.id);
      void loadActivationState(selectedCampaign.id);
      setAssignmentPreview(emptyAssignmentPreview(selectedCampaign));
    } else {
      setTargetsResponse(emptyTargetsResponse(null));
      setSelectedTargetIds([]);
      setAssignmentPreview(emptyAssignmentPreview(null));
      setQuestionReview(emptyQuestionReview(null));
      setScoringConfig(emptyScoringConfig(null));
      setSelectedQuestionGroupKey('');
      setActivationReadiness(emptyActivationReadiness(null));
    }
  }, [selectedCampaign?.id]);

  const {
    handleSelectCampaign,
    handleSave,
    handleDeleteDraft,
  } = useCampaignInfoActions({
    campaigns,
    selectedCampaign,
    form,
    setSelectedCampaignId,
    setForm,
    setErrors,
    setError,
    setSuccess,
    setSaving,
    setDeleting,
    setCampaignInfoOpen,
    setTargetsResponse,
    setSelectedTargetIds,
    setAssignmentPreview,
    setQuestionReview,
    setScoringConfig,
    setSelectedQuestionGroupKey,
    setActivationReadiness,
    setDraftRemovedEvaluatorKeys,
    setDraftManualAdditions,
    setActiveStepKey,
    applyForm,
    loadCampaignSnapshot,
    refreshCampaigns,
    onCampaignCreated,
    defaultForm,
  });

  const {
    toggleTarget,
    removeSelectedTarget,
    saveTargets,
  } = useCampaignTargetActions({
    selectedCampaign,
    targetIdsNormalized,
    setSelectedTargetIds,
    setTargetsResponse,
    setAssignmentPreview,
    setDraftRemovedEvaluatorKeys,
    setDraftManualAdditions,
    setSavingTargets,
    setError,
    setSuccess,
    setActiveStepKey,
    loadCampaignSnapshot,
    refreshCampaigns,
    loadActivationState,
  });

  const {
    setPeerReviewerCount,
    previewEvaluatorRules,
    generateEvaluatorAssignments,
    addEvaluator,
    removeEvaluator,
  } = useCampaignEvaluatorActions({
    selectedCampaign,
    savedTargetIds,
    hasUnsavedTargetChanges,
    evaluatorConfig,
    hasAssignmentPreview,
    activeEvaluatorTargetId,
    manualForm,
    manualEvaluatorEligibilityError,
    displayedAssignmentDetails,
    hasSavedEvaluatorAssignments,
    canEditEvaluators,
    draftRemovedEvaluatorKeys,
    draftManualAdditions,
    setEvaluatorConfig,
    setAssignmentPreview,
    setSelectedEvaluatorTargetId,
    setPreviewingAssignments,
    setGeneratingAssignments,
    setAddingEvaluator,
    setRemovingAssignmentId,
    setManualForm,
    setEvaluatorSearch,
    setDraftRemovedEvaluatorKeys,
    setDraftManualAdditions,
    setQuestionReview,
    setSelectedQuestionGroupKey,
    setError,
    setSuccess,
    loadCampaignSnapshot,
    refreshCampaigns,
    loadQuestionReview,
    loadScoringConfig,
    loadActivationState,
  });

  const relationshipWeightTotal = useMemo(() => (scoringConfig.relationshipWeights ?? [])
      .reduce((sum, item) => sum + Number(item.weightPercent ?? 0), 0), [scoringConfig.relationshipWeights]);

  const {
    resolveQuestionReview,
    updateRelationshipWeight,
    saveScoringConfig,
    updateCompetencyWeight,
    equalizeCompetencyWeights,
    saveQuestionReview,
  } = useCampaignQuestionReviewActions({
    selectedCampaign,
    savedAssignmentCount,
    questionReview,
    competencyWeights,
    competencyWeightsReady,
    competencyWeightTotal,
    relationshipWeightTotal,
    scoringConfig,
    setQuestionReview,
    setSelectedQuestionGroupKey,
    setResolvingQuestionReview,
    setSavingQuestionReview,
    setScoringConfig,
    setSavingScoringConfig,
    setForm,
    setError,
    setSuccess,
    setActiveStepKey,
    loadScoringConfig,
    loadActivationState,
  });

  const {
    validateSelectedCampaignSetup,
    activateSelectedCampaign,
  } = useCampaignLifecycleActions({
    selectedCampaign,
    setActivatingCampaign,
    setError,
    setSuccess,
    loadCampaignSnapshot,
    refreshCampaigns,
    loadScoringConfig,
    loadActivationState,
    onCampaignCreated,
  });

  const canEditSelected = !selectedCampaign || selectedCampaign.status === 'DRAFT';
  const canEditTargets = Boolean(selectedCampaign && selectedCampaign.status === 'DRAFT');

  const { setupSteps, lastUnlockedStep } = useCampaignSetupSteps({
    selectedCampaign,
    selectedTargetCount: targetIdsNormalized.length,
    savedTargetCount: savedTargetIds.length,
    hasUnsavedTargetChanges,
    hasUnavailableSelection,
    savedAssignmentCount,
    questionReviewReady,
    includedQuestionCount: questionReview.includedQuestionCount,
  });

  useEffect(() => {
    const active = setupSteps.find((step) => step.key === activeStepKey);
    if (!active?.unlocked) {
      setActiveStepKey(lastUnlockedStep);
    }
  }, [activeStepKey, lastUnlockedStep, setupSteps]);


  return (
      <div className="hfdq-page hfdc-page">
        <CampaignSetupHeader
            loadingCampaigns={loadingCampaigns}
            error={error}
            success={success}
            onRefresh={() => void refreshCampaigns()}
            onNewDraft={() => handleSelectCampaign('')}
        />

        <CampaignSetupStepper
            selectedCampaign={selectedCampaign}
            setupSteps={setupSteps}
            activeStepKey={activeStepKey}
            setActiveStepKey={setActiveStepKey}
            statusClass={statusClass}
            statusLabels={statusLabels}
        />


        {activeStepKey === 'foundation' && <CampaignInfoStep
            selectedCampaign={selectedCampaign}
            statusClass={statusClass}
            statusLabels={statusLabels}
            setCampaignInfoOpen={setCampaignInfoOpen}
            campaignInfoOpen={campaignInfoOpen}
            formatWindow={formatWindow}
            targetsResponse={targetsResponse}
            savedAssignmentCount={savedAssignmentCount}
            handleSave={handleSave}
            currentUser={currentUser}
            errors={errors}
            form={form}
            canEditSelected={canEditSelected}
            setForm={setForm}
            DESCRIPTION_LIMIT={DESCRIPTION_LIMIT}
            deleting={deleting}
            handleDeleteDraft={handleDeleteDraft}
            setErrors={setErrors}
            saving={saving}
        />}

        {activeStepKey === 'targets' && <TargetEmployeesStep
            selectedCampaign={selectedCampaign}
            targetIdsNormalized={targetIdsNormalized}
            selectedReadyCount={selectedReadyCount}
            selectedReviewCount={selectedReviewCount}
            selectedDepartmentCount={selectedDepartmentCount}
            availableCandidateCount={availableCandidateCount}
            reviewCandidateCount={reviewCandidateCount}
            blockedCandidateCount={blockedCandidateCount}
            filteredCandidateCount={filteredCandidateCount}
            filteredSelectableCandidateIds={filteredSelectableCandidateIds}
            selectedUnavailableCount={selectedUnavailableCount}
            targetSearch={targetSearch}
            setTargetSearch={setTargetSearch}
            currentDepartmentId={currentDepartmentId}
            setCurrentDepartmentId={setCurrentDepartmentId}
            departments={departments}
            positionFilter={positionFilter}
            setPositionFilter={setPositionFilter}
            positionOptions={positionOptions}
            levelFilter={levelFilter}
            setLevelFilter={setLevelFilter}
            levelOptions={levelOptions}
            readiness={readiness}
            setReadiness={setReadiness}
            loadingCandidates={loadingCandidates}
            candidateRows={candidateRows}
            readinessClass={readinessClass}
            personSubtitle={personSubtitle}
            readinessLabel={readinessLabel}
            setRecipientDetails={setRecipientDetails}
            canEditTargets={canEditTargets}
            toggleTarget={toggleTarget}
            hasUnsavedTargetChanges={hasUnsavedTargetChanges}
            targetsResponse={targetsResponse}
            hasUnavailableSelection={hasUnavailableSelection}
            selectedDepartmentSummary={selectedDepartmentSummary}
            recipientDetails={recipientDetails}
            recipientDetailItems={recipientDetailItems}
            loadingTargets={loadingTargets}
            selectedTargets={selectedTargets}
            removeSelectedTarget={removeSelectedTarget}
            setSelectedTargetIds={setSelectedTargetIds}
            savedTargetIds={savedTargetIds}
            savingTargets={savingTargets}
            saveTargets={saveTargets}
        />}

        {activeStepKey === 'evaluators' && <EvaluatorAssignmentsStep
            savedTargetIds={savedTargetIds}
            hasUnsavedTargetChanges={hasUnsavedTargetChanges}
            hasUnavailableSelection={hasUnavailableSelection}
            assignmentPreview={assignmentPreview}
            previewWarningCount={previewWarningCount}
            hasDraftEvaluatorChanges={hasDraftEvaluatorChanges}
            hasSavedEvaluatorAssignments={hasSavedEvaluatorAssignments}
            selectedCampaign={selectedCampaign}
            evaluatorConfig={normalizedEvaluatorConfig}
            setEvaluatorConfig={setEvaluatorConfig}
            peerReviewerCount={peerReviewerCount}
            setPeerReviewerCount={setPeerReviewerCount}
            canEditEvaluators={canEditEvaluators}
            relationshipWeightTotal={relationshipWeightTotal}
            scoringConfig={scoringConfig}
            updateRelationshipWeight={updateRelationshipWeight}
            setScoringConfig={setScoringConfig}
            savingScoringConfig={savingScoringConfig}
            saveScoringConfig={saveScoringConfig}
            previewingAssignments={previewingAssignments}
            generatingAssignments={generatingAssignments}
            previewEvaluatorRules={previewEvaluatorRules}
            hasAssignmentPreview={hasAssignmentPreview}
            generateEvaluatorAssignments={generateEvaluatorAssignments}
            setActiveStepKey={setActiveStepKey}
            cleanEvaluatorNote={cleanEvaluatorNote}
            evaluatorTargets={evaluatorTargets}
            previewItemByTarget={previewItemByTarget}
            assignmentsByTarget={assignmentsByTarget}
            assignmentReadinessClass={assignmentReadinessClass}
            activeEvaluatorTargetId={activeEvaluatorTargetId}
            setSelectedEvaluatorTargetId={setSelectedEvaluatorTargetId}
            activeEvaluatorTarget={activeEvaluatorTarget}
            activePreviewItem={activePreviewItem}
            activeAssignmentsByRelationship={activeAssignmentsByRelationship}
            relationshipIcon={relationshipIcon}
            relationshipLabel={relationshipLabel}
            initials={initials}
            assignmentSourceLabel={assignmentSourceLabel}
            assignmentStatusLabel={assignmentStatusLabel}
            removingAssignmentId={removingAssignmentId}
            removeEvaluator={removeEvaluator}
            manualForm={manualForm}
            setManualForm={setManualForm}
            relationshipOptions={relationshipOptions}
            evaluatorSearch={evaluatorSearch}
            setEvaluatorSearch={setEvaluatorSearch}
            evaluatorCandidates={evaluatorCandidates}
            relationshipCandidatesLoading={relationshipCandidatesLoading}
            relationshipCandidatesError={relationshipCandidatesError}
            manualCandidateNotice={manualCandidateNotice}
            manualEvaluatorEligibilityError={manualEvaluatorEligibilityError}
            activeTargetSummary={activeTargetSummary}
            addingEvaluator={addingEvaluator}
            addEvaluator={addEvaluator}
        />}

        {activeStepKey === 'questions' && <QuestionReviewStep
            savedAssignmentCount={savedAssignmentCount}
            selectedCampaign={selectedCampaign}
            competencyWeightsReady={competencyWeightsReady}
            formatPercent={formatPercent}
            competencyWeightTotal={competencyWeightTotal}
            competencyWeights={competencyWeights}
            competencyWeightDelta={competencyWeightDelta}
            questionSaveDisabled={questionSaveDisabled}
            saveQuestionReview={saveQuestionReview}
            savingQuestionReview={savingQuestionReview}
            loadingQuestionReview={loadingQuestionReview}
            equalizeCompetencyWeights={equalizeCompetencyWeights}
            updateCompetencyWeight={updateCompetencyWeight}
            resolvingQuestionReview={resolvingQuestionReview}
            resolveQuestionReview={resolveQuestionReview}
            questionReview={questionReview}
            questionGroups={questionGroups}
            selectedQuestionGroupKey={selectedQuestionGroupKey}
            setSelectedQuestionGroupKey={setSelectedQuestionGroupKey}
        />}
        {activeStepKey === 'launch' && (
            <LaunchReadinessSection
                selectedCampaign={selectedCampaign}
                questionReviewReady={questionReviewReady}
                campaignLaunched={campaignLaunched}
                launchReady={launchReady}
                launchTargetCount={launchTargetCount}
                launchAssignmentCount={launchAssignmentCount}
                questionSetCount={questionGroups.length}
                loadingActivation={loadingActivation}
                launchBannerTitle={launchBannerTitle}
                launchBannerMessage={launchBannerMessage}
                activationReadiness={activationReadiness}
                launchChecklist={launchChecklist}
                campaignWindowLabel={selectedCampaign ? formatWindow(selectedCampaign) : '-'}
                privacySummary={privacySummary}
                targetWarningCount={targetsResponse.warningCount}
                roleAssignmentSummary={roleAssignmentSummary}
                scoringConfig={scoringConfig}
                competencyWeightsReady={competencyWeightsReady}
                competencyWeightTotal={competencyWeightTotal}
                canValidateSetup={canValidateSetup}
                canActivate={canActivate}
                activatingCampaign={activatingCampaign}
                formatPercent={formatPercent}
                onRefreshCheck={() => selectedCampaign && void loadActivationState(selectedCampaign.id)}
                onGoToStep={(step) => setActiveStepKey(step)}
                onValidateSetup={() => void validateSelectedCampaignSetup()}
                onLaunchCampaign={() => void activateSelectedCampaign()}
            />
        )}


        {activeStepKey === 'foundation' && (
            <CampaignRecordsTable
                campaigns={campaigns}
                loadingCampaigns={loadingCampaigns}
                statusClass={statusClass}
                statusLabels={statusLabels}
                statusDescriptions={statusDescriptions}
                completionLabel={completionLabel}
                formatWindow={formatWindow}
                onOpenCampaign={handleSelectCampaign}
            />
        )}
      </div>
  );
}
