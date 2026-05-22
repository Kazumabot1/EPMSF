import { useEffect, useMemo, useState } from 'react';
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

interface FeedbackWorkspaceState {
  campaignId: number | null;
  savedTargetIds: number[];
  draftTargetIds: number[];
  evalConfig: EvaluatorConfigInput;
}

const DEFAULT_EVAL_CONFIG: EvaluatorConfigInput = {
  includeManager: true,
  includeTeamPeers: true,
  includeDepartmentPeers: true,
  includeProjectPeers: false,
  includeCrossTeamPeers: false,
  includeSubordinates: true,
  includeSelf: false,
  peerCount: 3,
};

const WORKSPACE_STORAGE_KEY = 'epms.hrFeedback.workspaceState.v2';

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
      'Control who sees each question by employee level, evaluator role, section, department, or position.',
  },
  'dynamic-preview': {
    eyebrow: 'Generated form preview',
    title: 'Dynamic Preview',
    description: 'Preview the exact adaptive form before HR activates a campaign.',
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

const normalizeIds = (ids: number[]) => [...new Set(ids)].sort((left, right) => left - right);

const sameIds = (left: number[], right: number[]) => {
  const a = normalizeIds(left);
  const b = normalizeIds(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
};

const readStoredWorkspace = (): FeedbackWorkspaceState => {
  if (typeof window === 'undefined') {
    return {
      campaignId: null,
      savedTargetIds: [],
      draftTargetIds: [],
      evalConfig: DEFAULT_EVAL_CONFIG,
    };
  }

  try {
    const raw = window.sessionStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) throw new Error('No saved 360 feedback workspace state.');

    const parsed = JSON.parse(raw) as Partial<FeedbackWorkspaceState>;

    return {
      campaignId: parsed.campaignId ?? null,
      savedTargetIds: Array.isArray(parsed.savedTargetIds) ? parsed.savedTargetIds : [],
      draftTargetIds: Array.isArray(parsed.draftTargetIds) ? parsed.draftTargetIds : [],
      evalConfig: { ...DEFAULT_EVAL_CONFIG, ...(parsed.evalConfig ?? {}) },
    };
  } catch {
    return {
      campaignId: null,
      savedTargetIds: [],
      draftTargetIds: [],
      evalConfig: DEFAULT_EVAL_CONFIG,
    };
  }
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
  const [savedTargetIds, setSavedTargetIds] = useState<number[]>(storedWorkspace.savedTargetIds);
  const [draftTargetIds, setDraftTargetIds] = useState<number[]>(
    storedWorkspace.draftTargetIds.length
      ? storedWorkspace.draftTargetIds
      : storedWorkspace.savedTargetIds,
  );
  const [evalConfig, setEvalConfig] = useState<EvaluatorConfigInput>(
    storedWorkspace.evalConfig,
  );
  const [, setAssignmentResult] = useState<FeedbackAssignmentGenerationResponse | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState('');

  const activeModule = getModuleKey(location.pathname);
  const activeCopy = MODULE_COPY[activeModule];

  const selfContainedQuestionPage =
    activeModule === 'questions' ||
    activeModule === 'question-rules' ||
    activeModule === 'dynamic-preview';

  const targetsDirty = !sameIds(savedTargetIds, draftTargetIds);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const payload: FeedbackWorkspaceState = {
      campaignId: campaign?.id ?? storedWorkspace.campaignId ?? null,
      savedTargetIds,
      draftTargetIds,
      evalConfig,
    };

    window.sessionStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(payload));
  }, [
    campaign?.id,
    draftTargetIds,
    evalConfig,
    savedTargetIds,
    storedWorkspace.campaignId,
  ]);

  const applyCampaignSelection = (selectedCampaign: FeedbackCampaign) => {
    const ids = selectedCampaign.targetEmployeeIds ?? [];

    setCampaign(selectedCampaign);
    setSavedTargetIds(ids);
    setDraftTargetIds(ids);
    setAssignmentResult(null);
    setWorkspaceNotice('');
  };

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
                setDraftTargetIds(ids);
                setAssignmentResult(null);
              }}
              onEvalConfigChange={(cfg) => {
                setEvalConfig(cfg);
                setAssignmentResult(null);
              }}
              onTargetsSaved={(ids, cfg, updatedCampaign) => {
                setSavedTargetIds(ids);
                setDraftTargetIds(ids);
                setEvalConfig(cfg);
                setCampaign(updatedCampaign);
                setAssignmentResult(null);
                setWorkspaceNotice('');
              }}
              onTargetsSet={(ids, cfg) => {
                setSavedTargetIds(ids);
                setDraftTargetIds(ids);
                setEvalConfig(cfg);
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