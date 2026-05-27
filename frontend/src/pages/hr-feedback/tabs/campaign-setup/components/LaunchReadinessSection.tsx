import { Link } from 'react-router-dom';
import type {
    FeedbackCampaign,
    FeedbackCampaignActivationCheck,
    FeedbackCampaignActivationReadiness,
    FeedbackCampaignScoringConfig,
    FeedbackCampaignStatus,
} from '../../../../../types/feedbackCampaign';

type LaunchQuestionFormSummary = {
    key: string;
    relationshipLabel: string;
    includedQuestionCount: number;
    questionCount: number;
    competencyCount: number;
};

type LaunchReadinessSectionProps = {
    selectedCampaign: FeedbackCampaign | null;
    questionReviewReady: boolean;
    campaignLaunched: boolean;
    launchReady: boolean;
    launchTargetCount: number;
    launchAssignmentCount: number;
    questionFormCount: number;
    loadingActivation: boolean;
    launchBannerTitle: string;
    launchBannerMessage: string;
    activationReadiness: FeedbackCampaignActivationReadiness;
    launchChecklist: FeedbackCampaignActivationCheck[];
    campaignWindowLabel: string;
    privacySummary: string;
    targetWarningCount: number;
    roleAssignmentSummary: string[];
    questionsPerFormLabel: string;
    competencyCountLabel: string;
    questionFormSummaries: LaunchQuestionFormSummary[];
    scoringConfig: FeedbackCampaignScoringConfig;
    competencyWeightsReady: boolean;
    competencyWeightTotal: number;
    canValidateSetup: boolean;
    canActivate: boolean;
    activatingCampaign: boolean;
    formatPercent: (value?: number | null) => string;
    onRefreshCheck: () => void;
    onBackToQuestionReview: () => void;
    onValidateSetup: () => void;
    onLaunchCampaign: () => void;
};

const statusLabels: Record<FeedbackCampaignStatus, string> = {
    DRAFT: 'Draft',
    READY_TO_ACTIVATE: 'Ready to activate',
    ACTIVE: 'Active',
    CLOSED: 'Closed',
    PUBLISHED: 'Published',
};

const activationCheckClass = (status?: string | null) => {
    const normalized = String(status ?? '').toUpperCase();
    if (normalized === 'PASS') return 'ready';
    if (normalized === 'WARNING') return 'warning';
    return 'blocked';
};

const activationCheckIcon = (status?: string | null) => {
    const normalized = String(status ?? '').toUpperCase();
    if (normalized === 'PASS') return 'bi-check-circle-fill';
    if (normalized === 'WARNING') return 'bi-exclamation-triangle-fill';
    return 'bi-x-circle-fill';
};

const launchCheckLabels: Record<string, string> = {
    LIFECYCLE: 'Lifecycle gate',
    CAMPAIGN_INFO: 'Campaign details',
    TARGETS: 'Recipients',
    EVALUATOR_ASSIGNMENTS: 'Evaluator assignments',
    QUESTION_SELECTION: 'Question review',
    RELATIONSHIP_WEIGHTS: 'Relationship weights',
    COMPETENCY_WEIGHTS: 'Competency weights',
    SUBMISSION_WINDOW: 'Submission window',
    PRIVACY_POLICY: 'Privacy settings',
};

const launchCheckLabel = (key?: string | null, fallback?: string | null) =>
    launchCheckLabels[String(key ?? '').toUpperCase()] ?? fallback ?? 'Setup check';

const launchCheckMessage = (key?: string | null, status?: string | null, fallback?: string | null) => {
    const normalizedKey = String(key ?? '').toUpperCase();
    const normalizedStatus = String(status ?? '').toUpperCase();
    if (normalizedStatus === 'PASS') return fallback ?? 'Ready.';
    if (normalizedKey === 'LIFECYCLE') return fallback ?? 'Validate setup before launching.';
    if (normalizedKey === 'QUESTION_SELECTION') return 'Save the question review before launching.';
    if (normalizedKey === 'RELATIONSHIP_WEIGHTS') return 'Evaluator role weights must total 100%.';
    if (normalizedKey === 'COMPETENCY_WEIGHTS') return 'Competency weights must total 100%.';
    if (normalizedKey === 'TARGETS') return 'Select and save at least one feedback recipient.';
    if (normalizedKey === 'EVALUATOR_ASSIGNMENTS') return 'Generate evaluator assignments before launching.';
    if (normalizedKey === 'SUBMISSION_WINDOW') return fallback ?? 'Review the submission window before launching.';
    return fallback ?? 'Review this item before launching.';
};

const readinessStatusLabel = (status?: string | null) => {
    const normalized = String(status ?? '').toUpperCase();
    if (normalized === 'PASS') return 'Ready';
    if (normalized === 'WARNING') return 'Warning';
    return 'Needs attention';
};

export function LaunchReadinessSection({
                                           selectedCampaign,
                                           questionReviewReady,
                                           campaignLaunched,
                                           launchReady,
                                           launchTargetCount,
                                           launchAssignmentCount,
                                           questionFormCount,
                                           loadingActivation,
                                           launchBannerTitle,
                                           launchBannerMessage,
                                           activationReadiness,
                                           launchChecklist,
                                           campaignWindowLabel,
                                           privacySummary,
                                           targetWarningCount,
                                           roleAssignmentSummary,
                                           questionsPerFormLabel,
                                           competencyCountLabel,
                                           questionFormSummaries,
                                           scoringConfig,
                                           competencyWeightsReady,
                                           competencyWeightTotal,
                                           canValidateSetup,
                                           canActivate,
                                           activatingCampaign,
                                           formatPercent,
                                           onRefreshCheck,
                                           onBackToQuestionReview,
                                           onValidateSetup,
                                           onLaunchCampaign,
                                       }: LaunchReadinessSectionProps) {
    return (
        <section className={`hfdq-table-card hfda-card ${!questionReviewReady && selectedCampaign?.status === 'DRAFT' ? 'disabled' : ''}`}>
            <div className="hfdc-card-head hfda-head">
                <div>
                    <span className="hfdq-kicker">Step 5</span>
                    <h3>Review &amp; Launch</h3>
                    <p>Check the final setup before opening feedback collection.</p>
                </div>
                <div className="hfdt-summary-pills">
                    <span><strong>{campaignLaunched && selectedCampaign ? statusLabels[selectedCampaign.status] : launchReady ? 'Ready' : 'Review'}</strong> status</span>
                    <span><strong>{launchTargetCount}</strong> recipients</span>
                    <span><strong>{launchAssignmentCount}</strong> assignments</span>
                    <span><strong>{questionFormCount}</strong> forms</span>
                </div>
            </div>

            {!selectedCampaign ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-save" /><strong>Save a draft campaign first</strong><p>Launch becomes available after the setup is saved.</p></div>
            ) : campaignLaunched ? (
                <div className="hfda-launched-state">
                    <span className="hfda-launched-icon"><i className="bi bi-rocket-takeoff" /></span>
                    <div>
                        <span className="hfdq-kicker">Campaign launched</span>
                        <h4>{selectedCampaign.status === 'ACTIVE' ? 'Feedback collection is active.' : `Campaign status: ${statusLabels[selectedCampaign.status] ?? selectedCampaign.status}`}</h4>
                        <p>Use Monitoring to track evaluator progress, follow up on incomplete assignments, and manage submission activity.</p>
                    </div>
                    <Link className="hfd-btn hfd-btn-primary" to="/hr/feedback/monitoring"><i className="bi bi-graph-up-arrow" /> Open Monitoring</Link>
                </div>
            ) : !questionReviewReady && selectedCampaign.status === 'DRAFT' ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-ui-checks-grid" /><strong>Save question review first</strong><p>Launch requires saved recipients, evaluator assignments, questions, and scoring weights.</p></div>
            ) : loadingActivation ? (
                <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading final launch check...</div>
            ) : (
                <div className="hfda-launch-stack">
                    <div className={`hfda-launch-banner ${launchReady ? 'ready' : 'blocked'}`}>
                        <i className={`bi ${launchReady ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} />
                        <div>
                            <strong>{launchBannerTitle}</strong>
                            <p>{launchBannerMessage}</p>
                        </div>
                    </div>

                    {activationReadiness.blockingIssues.length > 0 && (
                        <div className="hfdt-response-warnings blocked">
                            {activationReadiness.blockingIssues.map(item => <span key={item}><i className="bi bi-x-circle" /> {item}</span>)}
                        </div>
                    )}

                    {activationReadiness.warnings.length > 0 && (
                        <div className="hfdt-response-warnings">
                            {activationReadiness.warnings.map(item => <span key={item}><i className="bi bi-info-circle" /> {item}</span>)}
                        </div>
                    )}

                    <div className="hfda-launch-grid">
                        <div className="hfda-readiness-panel">
                            <div className="hfdt-policy-note">
                                <i className="bi bi-shield-lock" />
                                <div>
                                    <strong>Setup locks after launch</strong>
                                    <p>Feedback assignments become available, the question set is locked for this campaign, and setup changes will no longer be editable.</p>
                                </div>
                            </div>

                            <div className="hfda-check-list">
                                {launchChecklist.length === 0 ? (
                                    <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-clipboard-check" /><strong>No validation result yet</strong><p>Refresh the final check after saving setup changes.</p></div>
                                ) : launchChecklist.map(check => (
                                    <article key={check.key} className={`hfda-check-card ${activationCheckClass(check.status)}`}>
                                        <i className={`bi ${activationCheckIcon(check.status)}`} />
                                        <div>
                                            <strong>{launchCheckLabel(check.key, check.label)}</strong>
                                            <small>{launchCheckMessage(check.key, check.status, check.message)}</small>
                                        </div>
                                        <em>{readinessStatusLabel(check.status)}</em>
                                    </article>
                                ))}
                            </div>
                        </div>

                        <aside className="hfda-summary-panel">
                            <article className="hfda-summary-card">
                                <span className="hfdq-kicker">Campaign</span>
                                <h4>{selectedCampaign.name}</h4>
                                <p>Review year: {selectedCampaign.reviewYear}</p>
                                <p>Feedback period: {campaignWindowLabel}</p>
                                <p>{privacySummary}</p>
                            </article>

                            <article className="hfda-summary-card">
                                <span className="hfdq-kicker">Recipients</span>
                                <h4>{launchTargetCount} selected employee{launchTargetCount === 1 ? '' : 's'}</h4>
                                <p>{targetWarningCount > 0 ? `${targetWarningCount} recipient warning${targetWarningCount === 1 ? '' : 's'} to review.` : 'Recipient selection is ready.'}</p>
                            </article>

                            <article className="hfda-summary-card">
                                <span className="hfdq-kicker">Evaluator assignments</span>
                                <h4>{launchAssignmentCount} assignment{launchAssignmentCount === 1 ? '' : 's'}</h4>
                                <p>{roleAssignmentSummary.length > 0 ? roleAssignmentSummary.join(' · ') : 'Generate evaluator assignments before launch.'}</p>
                            </article>

                            <article className="hfda-summary-card">
                                <span className="hfdq-kicker">Question forms</span>
                                <h4>{questionFormCount} form{questionFormCount === 1 ? '' : 's'} · {questionsPerFormLabel}</h4>
                                <p>{competencyCountLabel}</p>
                                <div className="hfda-form-summary-list">
                                    {questionFormSummaries.map(group => (
                                        <span key={group.key}>{group.relationshipLabel}: {group.includedQuestionCount}/{group.questionCount} questions · {group.competencyCount} competencies</span>
                                    ))}
                                </div>
                            </article>

                            <article className="hfda-summary-card">
                                <span className="hfdq-kicker">Scoring</span>
                                <h4>{scoringConfig.relationshipWeightsReady && competencyWeightsReady ? 'Scoring ready' : 'Review scoring setup'}</h4>
                                <p>Relationship weights: {formatPercent(scoringConfig.totalRelationshipWeight)}%</p>
                                <p>Competency weights: {formatPercent(competencyWeightTotal)}%</p>
                                <p>Missing role handling: {scoringConfig.redistributeMissingRelationshipWeight ? 'Redistribute available weight' : 'Require every weighted role'}</p>
                            </article>
                        </aside>
                    </div>

                    <div className="hfda-launch-actions">
                        <button className="hfd-btn hfd-btn-secondary" type="button" disabled={loadingActivation} onClick={onRefreshCheck}>
                            <i className="bi bi-arrow-clockwise" /> Refresh Check
                        </button>
                        <button className="hfd-btn hfd-btn-secondary" type="button" onClick={onBackToQuestionReview}>
                            <i className="bi bi-ui-checks-grid" /> Back to Question Review
                        </button>
                        {selectedCampaign.status === 'DRAFT' && (
                            <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canValidateSetup || activatingCampaign} onClick={onValidateSetup}>
                                <i className="bi bi-shield-check" /> {activatingCampaign ? 'Validating...' : 'Validate Setup'}
                            </button>
                        )}
                        {selectedCampaign.status === 'READY_TO_ACTIVATE' && (
                            <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canActivate || activatingCampaign} onClick={onLaunchCampaign}>
                                <i className="bi bi-rocket-takeoff" /> {activatingCampaign ? 'Launching...' : 'Launch Campaign'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
