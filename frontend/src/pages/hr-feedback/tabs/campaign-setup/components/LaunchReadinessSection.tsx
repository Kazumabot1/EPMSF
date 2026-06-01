import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type {
    FeedbackCampaign,
    FeedbackCampaignActivationCheck,
    FeedbackCampaignActivationReadiness,
    FeedbackCampaignScoringConfig,
    FeedbackCampaignStatus,
} from '../../../../../types/feedbackCampaign';

type LaunchStepTarget = 'foundation' | 'targets' | 'evaluators' | 'questions';

type LaunchReadinessSectionProps = {
    selectedCampaign: FeedbackCampaign | null;
    questionReviewReady: boolean;
    campaignLaunched: boolean;
    launchReady: boolean;
    launchTargetCount: number;
    launchAssignmentCount: number;
    questionSetCount: number;
    loadingActivation: boolean;
    launchBannerTitle: string;
    launchBannerMessage: string;
    activationReadiness: FeedbackCampaignActivationReadiness;
    launchChecklist: FeedbackCampaignActivationCheck[];
    campaignWindowLabel: string;
    privacySummary: string;
    targetWarningCount: number;
    roleAssignmentSummary: string[];
    scoringConfig: FeedbackCampaignScoringConfig;
    competencyWeightsReady: boolean;
    competencyWeightTotal: number;
    canValidateSetup: boolean;
    canActivate: boolean;
    activatingCampaign: boolean;
    formatPercent: (value?: number | null) => string;
    onRefreshCheck: () => void;
    onGoToStep: (step: LaunchStepTarget) => void;
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
    LIFECYCLE_STATE: 'Lifecycle gate',
    CAMPAIGN_INFO: 'Campaign Details',
    TARGETS: 'Recipients',
    EVALUATOR_ASSIGNMENTS: 'Evaluator Assignments',
    QUESTION_SELECTION: 'Campaign Question Preview',
    QUESTION_SNAPSHOT: 'Campaign Question Preview',
    RELATIONSHIP_WEIGHTS: 'Evaluator & Weight Rules',
    COMPETENCY_WEIGHTS: 'Competency Weights',
    SUBMISSION_WINDOW: 'Launch Window',
    PRIVACY_POLICY: 'Feedback Visibility',
};

const launchCheckFixTargets: Record<string, LaunchStepTarget> = {
    LIFECYCLE: 'foundation',
    LIFECYCLE_STATE: 'foundation',
    CAMPAIGN_INFO: 'foundation',
    SUBMISSION_WINDOW: 'foundation',
    PRIVACY_POLICY: 'foundation',
    TARGETS: 'targets',
    EVALUATOR_ASSIGNMENTS: 'evaluators',
    RELATIONSHIP_WEIGHTS: 'evaluators',
    QUESTION_SELECTION: 'questions',
    QUESTION_SNAPSHOT: 'questions',
    COMPETENCY_WEIGHTS: 'questions',
};

const launchStepNames: Record<LaunchStepTarget, string> = {
    foundation: 'Campaign Details',
    targets: 'Recipients',
    evaluators: 'Evaluator & Weight Rules',
    questions: 'Campaign Question Preview',
};

const launchCheckLabel = (key?: string | null, fallback?: string | null) =>
    launchCheckLabels[String(key ?? '').toUpperCase()] ?? fallback ?? 'Setup check';

const launchCheckMessage = (key?: string | null, status?: string | null, fallback?: string | null) => {
    const normalizedKey = String(key ?? '').toUpperCase();
    const normalizedStatus = String(status ?? '').toUpperCase();
    if (normalizedStatus === 'PASS') return fallback ?? 'Ready.';
    if (normalizedKey === 'LIFECYCLE' || normalizedKey === 'LIFECYCLE_STATE') return fallback ?? 'Validate and lock setup before launch.';
    if (normalizedKey === 'QUESTION_SELECTION' || normalizedKey === 'QUESTION_SNAPSHOT') return fallback ?? 'Save campaign questions before launch.';
    if (normalizedKey === 'RELATIONSHIP_WEIGHTS') return fallback ?? 'Evaluator relationship weights must total 100%.';
    if (normalizedKey === 'COMPETENCY_WEIGHTS') return fallback ?? 'Competency weights must total 100%.';
    if (normalizedKey === 'TARGETS') return fallback ?? 'Select and save at least one feedback recipient.';
    if (normalizedKey === 'EVALUATOR_ASSIGNMENTS') return fallback ?? 'Generate evaluator assignments before launch.';
    if (normalizedKey === 'SUBMISSION_WINDOW') return fallback ?? 'Review the launch window before launch.';
    if (normalizedKey === 'PRIVACY_POLICY') return fallback ?? 'Review feedback visibility before launch.';
    return fallback ?? 'Review this item before launch.';
};

const readinessStatusLabel = (status?: string | null) => {
    const normalized = String(status ?? '').toUpperCase();
    if (normalized === 'PASS') return 'Ready';
    if (normalized === 'WARNING') return 'Warning';
    return 'Needs attention';
};

const buildRelationshipWeightLabel = (
    scoringConfig: FeedbackCampaignScoringConfig,
    formatPercent: (value?: number | null) => string,
) => {
    const weights = scoringConfig.relationshipWeights ?? [];
    if (weights.length === 0) return 'Not saved yet';
    return weights
        .filter(item => Number(item.weightPercent ?? 0) > 0)
        .map(item => `${String(item.relationshipType ?? '').replace('_', ' ')} ${formatPercent(item.weightPercent)}%`)
        .join(' · ') || 'No weighted evaluator groups';
};

export function LaunchReadinessSection({
                                           selectedCampaign,
                                           questionReviewReady,
                                           campaignLaunched,
                                           launchReady,
                                           launchTargetCount,
                                           launchAssignmentCount,
                                           questionSetCount,
                                           loadingActivation,
                                           launchBannerTitle,
                                           launchBannerMessage,
                                           activationReadiness,
                                           launchChecklist,
                                           campaignWindowLabel,
                                           privacySummary,
                                           targetWarningCount,
                                           roleAssignmentSummary,
                                           scoringConfig,
                                           competencyWeightsReady,
                                           competencyWeightTotal,
                                           canValidateSetup,
                                           canActivate,
                                           activatingCampaign,
                                           formatPercent,
                                           onRefreshCheck,
                                           onGoToStep,
                                           onValidateSetup,
                                           onLaunchCampaign,
                                       }: LaunchReadinessSectionProps) {
    const blockingCount = activationReadiness.blockingIssues.length;
    const warningCount = activationReadiness.warnings.length;
    const readyCheckCount = launchChecklist.filter(check => String(check.status ?? '').toUpperCase() === 'PASS').length;
    const totalCheckCount = launchChecklist.length;
    const readinessPercent = totalCheckCount === 0 ? 0 : Math.round((readyCheckCount / totalCheckCount) * 100);
    const relationshipWeightLabel = useMemo(
        () => buildRelationshipWeightLabel(scoringConfig, formatPercent),
        [formatPercent, scoringConfig],
    );

    return (
        <section className={`hfdq-table-card hfda-card ${!questionReviewReady && selectedCampaign?.status === 'DRAFT' ? 'disabled' : ''}`}>
            <div className="hfdc-card-head hfda-head">
                <div>
                    <span className="hfdq-kicker">Step 5</span>
                    <h3>Review &amp; Launch</h3>
                    <p>Review the saved setup and launch when everything is ready.</p>
                </div>
                <div className="hfdt-summary-pills">
                    <span><strong>{campaignLaunched && selectedCampaign ? statusLabels[selectedCampaign.status] : launchReady ? 'Ready' : 'Review'}</strong> status</span>
                    <span><strong>{launchTargetCount}</strong> recipients</span>
                    <span><strong>{launchAssignmentCount}</strong> assignments</span>
                    <span><strong>{questionSetCount}</strong> question forms</span>
                </div>
            </div>

            {!selectedCampaign ? (
                <div className="hfd-empty-state hfdt-empty"><i className="bi bi-save" /><strong>Save a draft campaign first</strong><p>Launch becomes available after the setup is saved.</p></div>
            ) : campaignLaunched ? (
                <div className="hfda-launched-state hfda-launched-state-v2">
                    <span className="hfda-launched-icon"><i className="bi bi-rocket-takeoff" /></span>
                    <div>
                        <span className="hfdq-kicker">Campaign launched</span>
                        <h4>{selectedCampaign.status === 'ACTIVE' ? 'Feedback collection is active.' : `Campaign status: ${statusLabels[selectedCampaign.status] ?? selectedCampaign.status}`}</h4>
                        <p>Created {launchTargetCount} recipient record{launchTargetCount === 1 ? '' : 's'}, {launchAssignmentCount} evaluator task{launchAssignmentCount === 1 ? '' : 's'}, and locked {questionSetCount} question form{questionSetCount === 1 ? '' : 's'} for this campaign.</p>
                    </div>
                    <Link className="hfd-btn hfd-btn-primary" to="/hr/feedback/monitoring"><i className="bi bi-graph-up-arrow" /> Open Monitoring</Link>
                </div>
            ) : !questionReviewReady && selectedCampaign.status === 'DRAFT' ? (
                <div className="hfd-empty-state hfdt-empty">
                    <i className="bi bi-ui-checks-grid" />
                    <strong>Save campaign questions first</strong>
                    <p>Launch requires saved recipients, evaluator assignments, campaign questions, and scoring weights.</p>
                    <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => onGoToStep('questions')}>
                        <i className="bi bi-arrow-left" /> Back to Campaign Question Preview
                    </button>
                </div>
            ) : loadingActivation ? (
                <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading final launch check...</div>
            ) : (
                <div className="hfda-launch-stack hfda-final-stack hfda-final-compact">
                    <div className={`hfda-compact-status ${launchReady ? 'ready' : blockingCount > 0 ? 'blocked' : 'warning'}`}>
                        <i className={`bi ${launchReady ? 'bi-check-circle-fill' : blockingCount > 0 ? 'bi-x-circle-fill' : 'bi-info-circle-fill'}`} />
                        <div>
                            <strong>{launchBannerTitle}</strong>
                            <span>{launchBannerMessage}</span>
                        </div>
                        <em>{readinessPercent}% ready</em>
                    </div>

                    <div className="hfda-final-summary-grid hfda-final-summary-grid-compact">
                        <article className="hfda-final-summary-card">
                            <span>Campaign</span>
                            <strong>{selectedCampaign.name}</strong>
                            <small>Review year {selectedCampaign.reviewYear} · {campaignWindowLabel}</small>
                        </article>
                        <article className="hfda-final-summary-card">
                            <span>Recipients</span>
                            <strong>{launchTargetCount}</strong>
                            <small>{targetWarningCount > 0 ? `${targetWarningCount} need review` : 'Selection ready'}</small>
                        </article>
                        <article className="hfda-final-summary-card">
                            <span>Evaluator tasks</span>
                            <strong>{launchAssignmentCount}</strong>
                            <small>{roleAssignmentSummary.length > 0 ? roleAssignmentSummary.join(' · ') : 'Assignments required'}</small>
                        </article>
                        <article className="hfda-final-summary-card">
                            <span>Campaign questions</span>
                            <strong>{questionSetCount}</strong>
                            <small>{activationReadiness.summary.questionSelectionCount || 0} saved questions</small>
                        </article>
                        <article className="hfda-final-summary-card">
                            <span>Scoring</span>
                            <strong>{scoringConfig.relationshipWeightsReady && competencyWeightsReady ? '100%' : 'Review'}</strong>
                            <small>Relationship {formatPercent(scoringConfig.totalRelationshipWeight)}% · Competency {formatPercent(competencyWeightTotal)}%</small>
                        </article>
                        <article className="hfda-final-summary-card">
                            <span>Visibility</span>
                            <strong>Grouped</strong>
                            <small>{privacySummary}</small>
                        </article>
                    </div>

                    <div className="hfda-readiness-board hfda-readiness-board-compact">
                        <div className="hfda-readiness-title-row">
                            <div>
                                <span className="hfdq-kicker">Launch readiness</span>
                                <h4>{blockingCount > 0 ? `${blockingCount} item${blockingCount === 1 ? '' : 's'} must be fixed` : warningCount > 0 ? `${warningCount} warning${warningCount === 1 ? '' : 's'} to review` : 'All launch checks passed'}</h4>
                            </div>
                            <div className="hfda-readiness-meter">
                                <strong>{readinessPercent}%</strong>
                                <span>{readyCheckCount}/{totalCheckCount || 0} ready</span>
                            </div>
                        </div>

                        {activationReadiness.blockingIssues.length > 0 && (
                            <div className="hfda-issue-strip blocked">
                                {activationReadiness.blockingIssues.slice(0, 3).map(item => <span key={item}><i className="bi bi-x-circle" /> {item}</span>)}
                            </div>
                        )}

                        {activationReadiness.warnings.length > 0 && (
                            <div className="hfda-issue-strip warning">
                                {activationReadiness.warnings.slice(0, 3).map(item => <span key={item}><i className="bi bi-info-circle" /> {item}</span>)}
                            </div>
                        )}

                        <div className="hfda-check-list hfda-check-list-v2 hfda-check-list-compact">
                            {launchChecklist.length === 0 ? (
                                <div className="hfd-empty-state hfdt-mini-empty"><i className="bi bi-clipboard-check" /><strong>No validation result yet</strong><p>Refresh the final check after saving setup changes.</p></div>
                            ) : launchChecklist.map(check => {
                                const key = String(check.key ?? '').toUpperCase();
                                const target = launchCheckFixTargets[key];
                                const blocked = String(check.status ?? '').toUpperCase() !== 'PASS';
                                return (
                                    <article key={`${check.key}-${check.label}`} className={`hfda-check-card ${activationCheckClass(check.status)}`}>
                                        <i className={`bi ${activationCheckIcon(check.status)}`} />
                                        <div>
                                            <strong>{launchCheckLabel(check.key, check.label)}</strong>
                                            <small>{launchCheckMessage(check.key, check.status, check.message)}</small>
                                            {blocked && target && (
                                                <button className="hfda-inline-fix" type="button" onClick={() => onGoToStep(target)}>
                                                    Go to {launchStepNames[target]}
                                                </button>
                                            )}
                                        </div>
                                        <em>{readinessStatusLabel(check.status)}</em>
                                    </article>
                                );
                            })}
                        </div>
                    </div>

                    <div className="hfda-compact-note">
                        <span><i className="bi bi-sliders" /> Scoring policy</span>
                        <p>{relationshipWeightLabel}</p>
                    </div>

                    <div className="hfda-launch-actions hfda-final-actions">
                        <button className="hfd-btn hfd-btn-secondary" type="button" disabled={loadingActivation} onClick={onRefreshCheck}>
                            <i className="bi bi-arrow-clockwise" /> Refresh Check
                        </button>
                        <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => onGoToStep('questions')}>
                            <i className="bi bi-ui-checks-grid" /> Back to Campaign Question Preview
                        </button>
                        {selectedCampaign.status === 'DRAFT' && (
                            <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canValidateSetup || activatingCampaign} onClick={onValidateSetup}>
                                <i className="bi bi-shield-check" /> {activatingCampaign ? 'Validating...' : 'Validate & Lock Setup'}
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
