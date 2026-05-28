import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import DynamicQuestionBankTab from '../hr-feedback/tabs/DynamicQuestionBankTab';
import QuestionRulesTab from '../hr-feedback/tabs/QuestionRulesTab';
import DynamicFormPreviewTab from '../hr-feedback/tabs/DynamicFormPreviewTab';
import CampaignSetupTab from '../hr-feedback/tabs/CampaignSetupTab';
import EmployeeTargetingTab from '../hr-feedback/tabs/EmployeeTargetingTab';
import AssignmentPreviewTab from '../hr-feedback/tabs/AssignmentPreviewTab';
import CampaignMonitoringTab from '../hr-feedback/tabs/CampaignActivationTab';
import AnalyticsTab from '../hr-feedback/tabs/AnalyticsTab';
import FeedbackAuditPage from './FeedbackAuditPage';
import { feedbackCampaignApi } from '../../api/feedbackCampaignApi';
import { normalizeEvaluatorConfig } from '../../types/feedbackCampaign';
import {
  normalizeIds,
  readStoredWorkspace,
  sameIds,
  writeStoredWorkspace,
} from '../hr-feedback/tabs/campaign-setup/utils/campaignSetupStorage';
import type {
  FeedbackAssignmentGenerationResponse,
  FeedbackCampaign,
  EvaluatorConfigInput,
} from '../../types/feedbackCampaign';
import '../hr/performance-kpi/kpi-ui.css';
import '../hr-feedback/hr-feedback-dashboard.css';
import './feedback-layout.css';

type FeedbackModuleKey =
    | 'questions'
    | 'question-rules'
    | 'dynamic-preview'
    | 'campaigns'
    | 'targets'
    | 'assignment-preview'
    | 'monitoring'
    | 'analytics'
    | 'audit';


const MODULE_COPY: Record<
    FeedbackModuleKey,
    { eyebrow: string; title: string; description: string }
> = {
  questions: {
    eyebrow: 'Question library',
    title: 'Question Bank',
    description:
        'Manage reusable 360 feedback questions without mixing targeting rules into question creation.',
  },
  'question-rules': {
    eyebrow: 'Targeting rules',
    title: 'Question Rules',
    description:
        'Control who sees each question by employee level, evaluator role, competency, department, or position.',
  },
  'dynamic-preview': {
    eyebrow: 'Generated feedback preview',
    title: 'Dynamic Preview',
    description: 'Preview the exact evaluator question set before HR activates a campaign.',
  },
  campaigns: {
    eyebrow: 'Campaign workspace',
    title: 'Campaign Setup',
    description:
        'Create campaigns, select recipients, prepare evaluator assignments, review questions, and launch collection.',
  },
  targets: {
    eyebrow: 'Evaluation population',
    title: 'Targets & Evaluators',
    description:
        'Choose target employees and evaluator mix before generating the assignment preview.',
  },
  'assignment-preview': {
    eyebrow: 'Generated review network',
    title: 'Assignment Preview',
    description:
        'Preview generated evaluator assignments before activating or monitoring the feedback cycle.',
  },
  monitoring: {
    eyebrow: 'Campaign operations',
    title: 'Campaign Monitoring',
    description: 'Track feedback collection progress and follow up on pending evaluators.',
  },
  analytics: {
    eyebrow: 'Insights',
    title: 'Analytics',
    description:
        'Review closed-campaign results, charts, competency trends, and publish employee summaries.',
  },
  audit: {
    eyebrow: 'Governance',
    title: 'Audit Log',
    description: 'Review configuration and campaign activity history for traceability.',
  },
};

const getModuleKey = (pathname: string): FeedbackModuleKey => {
  if (pathname.includes('/question-rules') || pathname.includes('/rules')) return 'question-rules';
  if (pathname.includes('/dynamic-preview')) return 'dynamic-preview';
  if (pathname.includes('/campaigns')) return 'campaigns';
  if (pathname.includes('/targets')) return 'targets';
  if (pathname.includes('/assignment-preview')) return 'assignment-preview';
  if (pathname.includes('/monitoring')) return 'monitoring';
  if (pathname.includes('/analytics')) return 'analytics';
  if (pathname.includes('/audit')) return 'audit';
  return 'questions';
};

const FeedbackLayoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const storedWorkspace = useMemo(readStoredWorkspace, []);

  const [campaign, setCampaign] = useState<FeedbackCampaign | null>(null);
  const [savedTargetIds, setSavedTargetIds] = useState<number[]>([]);
  const [draftTargetIds, setDraftTargetIds] = useState<number[]>([]);
  const [evalConfig, setEvalConfig] = useState<EvaluatorConfigInput>(storedWorkspace.evalConfig);
  const [, setAssignmentResult] = useState<FeedbackAssignmentGenerationResponse | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState('');
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const activeModule = getModuleKey(location.pathname);
  const activeCopy = MODULE_COPY[activeModule];

  const selfContainedQuestionPage =
      activeModule === 'questions' ||
      activeModule === 'question-rules' ||
      activeModule === 'dynamic-preview' ||
      activeModule === 'campaigns';

  const targetsDirty = !sameIds(savedTargetIds, draftTargetIds);

  const loadCampaignWorkspace = useCallback(async (campaignId: number, fallbackCampaign?: FeedbackCampaign | null) => {
    setWorkspaceLoading(true);
    setWorkspaceNotice('');

    try {
      const [latestCampaign, targetsResponse] = await Promise.all([
        feedbackCampaignApi.getCampaign(campaignId).catch(() => fallbackCampaign ?? null),
        feedbackCampaignApi.getCampaignTargets(campaignId).catch(() => null),
      ]);

      const nextCampaign = latestCampaign ?? fallbackCampaign ?? null;
      const targetIds = normalizeIds(
          targetsResponse?.targets?.map(target => target.employeeId) ?? nextCampaign?.targetEmployeeIds ?? [],
      );

      setCampaign(nextCampaign);
      setSavedTargetIds(targetIds);
      setDraftTargetIds(targetIds);
      setAssignmentResult(null);

      if (!nextCampaign) {
        setWorkspaceNotice('The previously selected campaign could not be loaded. Choose a campaign again.');
      }
    } catch (err) {
      setWorkspaceNotice(err instanceof Error ? err.message : 'Campaign workspace could not be refreshed.');
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  const applyCampaignSelection = useCallback((selectedCampaign: FeedbackCampaign) => {
    void loadCampaignWorkspace(selectedCampaign.id, selectedCampaign);
  }, [loadCampaignWorkspace]);

  useEffect(() => {
    if (!storedWorkspace.campaignId) return;
    void loadCampaignWorkspace(storedWorkspace.campaignId);
  }, [loadCampaignWorkspace, storedWorkspace.campaignId]);

  useEffect(() => {
    writeStoredWorkspace({
      campaignId: campaign?.id ?? storedWorkspace.campaignId ?? null,
      evalConfig: normalizeEvaluatorConfig(evalConfig),
    });
  }, [campaign?.id, evalConfig, storedWorkspace.campaignId]);

  useEffect(() => {
    if (!targetsDirty || (activeModule !== 'assignment-preview' && activeModule !== 'monitoring')) {
      return;
    }

    setWorkspaceNotice(
        'You have unsaved target changes. Save Targets before moving to Assignment Preview or Monitoring so the saved campaign and generated assignments stay consistent.',
    );
    navigate('/hr/feedback/targets', { replace: true });
  }, [activeModule, navigate, targetsDirty]);

  return (
      <div className="feedback-page feedback-page-subnav-mode">
        {!selfContainedQuestionPage && (
            <section className="feedback-hero compact">
              <div>
                <p className="feedback-eyebrow">{activeCopy.eyebrow}</p>
                <h1>{activeCopy.title}</h1>
                <p>{activeCopy.description}</p>
              </div>
            </section>
        )}

        {workspaceLoading && !selfContainedQuestionPage && (
            <div className="hfd-alert feedback-workspace-notice">
              <i className="bi bi-arrow-repeat" /> Refreshing campaign workspace from saved data...
            </div>
        )}

        {workspaceNotice && (
            <div className="hfd-alert hfd-alert-warning feedback-workspace-notice">
              <i className="bi bi-exclamation-triangle" />
              {workspaceNotice}
            </div>
        )}

        <Routes>
          <Route index element={<Navigate to="/hr/feedback/questions" replace />} />
          <Route path="dashboard" element={<Navigate to="/hr/feedback/questions" replace />} />
          <Route path="questions" element={<DynamicQuestionBankTab />} />
          <Route path="question-rules" element={<QuestionRulesTab />} />
          <Route path="rules" element={<Navigate to="/hr/feedback/question-rules" replace />} />
          <Route path="dynamic-preview" element={<DynamicFormPreviewTab />} />
          <Route path="preview" element={<Navigate to="/hr/feedback/dynamic-preview" replace />} />
          <Route path="forms" element={<Navigate to="/hr/feedback/questions" replace />} />

          <Route
              path="campaigns"
              element={
                <CampaignSetupTab
                    onCampaignCreated={(createdCampaign) => {
                      applyCampaignSelection(createdCampaign);
                    }}
                />
              }
          />

          <Route
              path="targets"
              element={
                <EmployeeTargetingTab
                    campaign={campaign}
                    targetIds={draftTargetIds}
                    savedTargetIds={savedTargetIds}
                    evalConfig={evalConfig}
                    onCampaignSelected={applyCampaignSelection}
                    onTargetsDraftChange={(ids) => {
                      setDraftTargetIds(normalizeIds(ids));
                      setAssignmentResult(null);
                    }}
                    onEvalConfigChange={(cfg) => {
                      setEvalConfig(normalizeEvaluatorConfig(cfg));
                      setAssignmentResult(null);
                    }}
                    onTargetsSaved={(ids, cfg, updatedCampaign) => {
                      const normalizedIds = normalizeIds(ids);
                      setSavedTargetIds(normalizedIds);
                      setDraftTargetIds(normalizedIds);
                      setEvalConfig(normalizeEvaluatorConfig(cfg));
                      setCampaign(updatedCampaign);
                      setAssignmentResult(null);
                      setWorkspaceNotice('');
                    }}
                    onTargetsSet={(ids, cfg) => {
                      const normalizedIds = normalizeIds(ids);
                      setSavedTargetIds(normalizedIds);
                      setDraftTargetIds(normalizedIds);
                      setEvalConfig(normalizeEvaluatorConfig(cfg));
                      setAssignmentResult(null);
                      setWorkspaceNotice('');
                      navigate('/hr/feedback/assignment-preview');
                    }}
                />
              }
          />

          <Route
              path="assignment-preview"
              element={
                <AssignmentPreviewTab
                    campaign={campaign}
                    targetIds={savedTargetIds}
                    evalConfig={evalConfig}
                    onCampaignSelected={applyCampaignSelection}
                    onAssignmentsGenerated={(res) => {
                      setAssignmentResult(res);
                    }}
                />
              }
          />

          <Route path="monitoring" element={<CampaignMonitoringTab activeCampaign={campaign} />} />
          <Route path="responses" element={<Navigate to="/hr/feedback/monitoring" replace />} />
          <Route path="requests" element={<Navigate to="/hr/feedback/targets" replace />} />
          <Route path="analytics" element={<AnalyticsTab />} />
          <Route path="audit" element={<FeedbackAuditPage />} />
        </Routes>
      </div>
  );
};

export default FeedbackLayoutPage;
