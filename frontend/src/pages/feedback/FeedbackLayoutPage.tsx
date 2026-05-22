import { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import DynamicQuestionBankTab from '../hr-feedback/tabs/DynamicQuestionBankTab';
import QuestionRulesTab from '../hr-feedback/tabs/QuestionRulesTab';
import DynamicFormPreviewTab from '../hr-feedback/tabs/DynamicFormPreviewTab';
import CampaignSetupTab from '../hr-feedback/tabs/CampaignSetupTab';
import CampaignMonitoringTab from '../hr-feedback/tabs/CampaignActivationTab';
import AnalyticsTab from '../hr-feedback/tabs/AnalyticsTab';
import FeedbackAuditPage from './FeedbackAuditPage';
import type { FeedbackCampaign } from '../../types/feedbackCampaign';
import '../hr/performance-kpi/kpi-ui.css';
import '../hr-feedback/hr-feedback-dashboard.css';
import './feedback-layout.css';

type FeedbackModuleKey =
    | 'questions'
    | 'question-rules'
    | 'dynamic-preview'
    | 'campaigns'
    | 'monitoring'
    | 'analytics'
    | 'audit';

const MODULE_COPY: Record<FeedbackModuleKey, { eyebrow: string; title: string; description: string }> = {
    questions: {
        eyebrow: 'Question library',
        title: 'Question Bank',
        description: 'Manage reusable 360 feedback questions without mixing targeting rules into question creation.',
    },
    'question-rules': {
        eyebrow: 'Targeting rules',
        title: 'Question Rules',
        description: 'Control who sees each question by employee level, evaluator role, section, department, or position.',
    },
    'dynamic-preview': {
        eyebrow: 'Generated form preview',
        title: 'Dynamic Preview',
        description: 'Preview the exact adaptive form before HR activates a campaign.',
    },
    campaigns: {
        eyebrow: 'Campaign workspace',
        title: 'Campaign Setup',
        description: 'Create campaigns, select recipients, prepare evaluator assignments, review questions, and launch collection.',
    },
    monitoring: {
        eyebrow: 'Campaign operations',
        title: 'Campaign Monitoring',
        description: 'Track feedback collection progress and follow up on pending evaluators.',
    },
    analytics: {
        eyebrow: 'Insights',
        title: 'Analytics',
        description: 'Review closed-campaign results, charts, competency trends, and publish employee summaries.',
    },
    audit: {
        eyebrow: 'Governance',
        title: 'Audit Trail',
        description: 'Review system and HR actions for traceability without exposing feedback identities unnecessarily.',
    },
};

const getModuleKey = (pathname: string): FeedbackModuleKey => {
    if (pathname.includes('/question-rules') || pathname.includes('/rules')) return 'question-rules';
    if (pathname.includes('/dynamic-preview')) return 'dynamic-preview';
    if (pathname.includes('/campaigns') || pathname.includes('/targets') || pathname.includes('/assignment-preview')) return 'campaigns';
    if (pathname.includes('/monitoring')) return 'monitoring';
    if (pathname.includes('/analytics')) return 'analytics';
    if (pathname.includes('/audit')) return 'audit';
    return 'questions';
};

const FeedbackLayoutPage = () => {
    const location = useLocation();
    const [campaign, setCampaign] = useState<FeedbackCampaign | null>(null);

    const activeModule = getModuleKey(location.pathname);
    const activeCopy = MODULE_COPY[activeModule];
    const selfContainedQuestionPage = activeModule === 'questions' || activeModule === 'question-rules' || activeModule === 'dynamic-preview';

    return (
        <div className="feedback-page feedback-page-subnav-mode">
            {!selfContainedQuestionPage && (
                <section className="feedback-hero feedback-hero-compact">
                    <span className="feedback-hero-badge">360 Feedback</span>
                    <div className="feedback-hero-copy">
                        <p className="feedback-hero-eyebrow">{activeCopy.eyebrow}</p>
                        <h1>{activeCopy.title}</h1>
                        <p>{activeCopy.description}</p>
                    </div>
                </section>
            )}

            <Routes>
                <Route index element={<Navigate to="/hr/feedback/questions" replace />} />
                <Route path="dashboard" element={<Navigate to="/hr/feedback/questions" replace />} />
                <Route path="forms" element={<Navigate to="/hr/feedback/questions" replace />} />
                <Route path="questions" element={<DynamicQuestionBankTab />} />
                <Route path="question-rules" element={<QuestionRulesTab />} />
                <Route path="rules" element={<Navigate to="/hr/feedback/question-rules" replace />} />
                <Route path="dynamic-preview" element={<DynamicFormPreviewTab />} />
                <Route
                    path="campaigns"
                    element={(
                        <CampaignSetupTab
                            onCampaignCreated={(createdCampaign) => {
                                setCampaign(createdCampaign);
                            }}
                        />
                    )}
                />
                <Route path="targets" element={<Navigate to="/hr/feedback/campaigns" replace />} />
                <Route path="assignment-preview" element={<Navigate to="/hr/feedback/campaigns" replace />} />
                <Route path="monitoring" element={<CampaignMonitoringTab activeCampaign={campaign} />} />
                <Route path="responses" element={<Navigate to="/hr/feedback/monitoring" replace />} />
                <Route path="requests" element={<Navigate to="/hr/feedback/campaigns" replace />} />
                <Route path="analytics" element={<AnalyticsTab />} />
                <Route path="audit" element={<FeedbackAuditPage />} />
            </Routes>
        </div>
    );
};

export default FeedbackLayoutPage;
