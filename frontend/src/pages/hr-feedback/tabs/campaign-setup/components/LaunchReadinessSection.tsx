import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
    FeedbackCampaign,
    FeedbackCampaignActivationCheck,
    FeedbackCampaignActivationReadiness,
    FeedbackCampaignScoringConfig,
    FeedbackCampaignStatus,
} from '../../../../../types/feedbackCampaign';

type LaunchStepTarget = 'foundation' | 'targets' | 'evaluators' | 'questions';
type LaunchConfirmationMode = 'validate' | 'launch' | null;

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
    if (normalizedKey === 'QUESTION_SELECTION' || normalizedKey === 'QUESTION_SNAPSHOT') return fallback ?? 'Save the question snapshot before launch.';
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

const buildRelationshipWeightLabel = (scoringConfig: FeedbackCampaignScoringConfig, formatPercent: (value?: number | null) => string) => {
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
    const [confirmationMode, setConfirmationMode] = useState<LaunchConfirmationMode>(null);
    const [launchConfirmationText, setLaunchConfirmationText] = useState('');

    const blockingCount = activationReadiness.blockingIssues.length;
    const warningCount = activationReadiness.warnings.length;
    const readyCheckCount = launchChecklist.filter(check => String(check.status ?? '').toUpperCase() === 'PASS').length;
    const totalCheckCount = launchChecklist.length;
    const readinessPercent = totalCheckCount === 0 ? 0 : Math.round((readyCheckCount / totalCheckCount) * 100);
    const relationshipWeightLabel = useMemo(
        () => buildRelationshipWeightLabel(scoringConfig, formatPercent),
        [formatPercent, scoringConfig],
    );
    const confirmationCampaignName = selectedCampaign?.name ?? 'this campaign';
    const isLaunchConfirmation = confirmationMode === 'launch';
    const confirmationAllowed = confirmationMode === 'validate'
        || (isLaunchConfirmation && launchConfirmationText.trim().toUpperCase() === 'LAUNCH');

    const closeConfirmation = () => {
        setConfirmationMode(null);
        setLaunchConfirmationText('');
    };

    const confirmAction = () => {
        if (!confirmationAllowed) return;
        if (confirmationMode === 'validate') {
            onValidateSetup();
        } else if (confirmationMode === 'launch') {
            onLaunchCampaign();
        }
        closeConfirmation();
    };

    return (
        <section className={`hfdq-table-card hfda-card ${!questionReviewReady && selectedCampaign?.status === 'DRAFT' ? 'disabled' : ''}`}>
            <div className="hfdc-card-head hfda-head">
                <div>
                    <span className="hfdq-kicker">Step 5</span>
                    <h3>Review &amp; Launch</h3>
                    <p>Review readiness, understand what will be locked, then launch safely.</p>
                </div>
                <div className="hfdt-summary-pills">
                    <span><strong>{campaignLaunched && selectedCampaign ? statusLabels[selectedCampaign.status] : launchReady ? 'Ready' : 'Review'}</strong> status</span>
                    <span><strong>{launchTargetCount}</strong> recipients</span>
                    <span><strong>{launchAssignmentCount}</strong> assignments</span>
                    <span><strong>{questionSetCount}</strong> question sets</span>
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
                        <p>Created {launchTargetCount} recipient record{launchTargetCount === 1 ? '' : 's'}, {launchAssignmentCount} evaluator task{launchAssignmentCount === 1 ? '' : 's'}, and locked {questionSetCount} question set{questionSetCount === 1 ? '' : 's'} for this campaign.</p>
                    </div>
                    <Link className="hfd-btn hfd-btn-primary" to="/hr/feedback/monitoring"><i className="bi bi-graph-up-arrow" /> Open Monitoring</Link>
                </div>
            ) : !questionReviewReady && selectedCampaign.status === 'DRAFT' ? (
                <div className="hfd-empty-state hfdt-empty">
                    <i className="bi bi-ui-checks-grid" />
                    <strong>Save question snapshot first</strong>
                    <p>Launch requires saved recipients, evaluator assignments, question snapshot, and scoring weights.</p>
                    <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => onGoToStep('questions')}>
                        <i className="bi bi-arrow-left" /> Back to Campaign Question Preview
                    </button>
                </div>
            ) : loadingActivation ? (
                <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading final launch check...</div>
            ) : (
                <div className="hfda-launch-stack hfda-final-stack">
                    <div className={`hfda-launch-banner ${launchReady ? 'ready' : 'blocked'}`}>
                        <i className={`bi ${launchReady ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} />
                        <div>
                            <strong>{launchBannerTitle}</strong>
                            <p>{launchBannerMessage}</p>
                        </div>
                    </div>

                    <div className="hfda-final-summary-grid">
                        <article className="hfda-final-summary-card primary">
                            <span className="hfdq-kicker">Campaign</span>
                            <h4>{selectedCampaign.name}</h4>
                            <p>Review year {selectedCampaign.reviewYear} · {campaignWindowLabel}</p>
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
                            <span>Question snapshot</span>
                            <strong>{questionSetCount}</strong>
                            <small>{activationReadiness.summary.questionSelectionCount || 0} saved questions</small>
                        </article>
                        <article className="hfda-final-summary-card">
                            <span>Scoring</span>
                            <strong>{scoringConfig.relationshipWeightsReady && competencyWeightsReady ? '100%' : 'Review'}</strong>
                            <small>Relationship {formatPercent(scoringConfig.totalRelationshipWeight)}% · Competency {formatPercent(competencyWeightTotal)}%</small>
                        </article>
                    </div>

                    <div className="hfda-readiness-board">
                        <div className="hfda-readiness-title-row">
                            <div>
                                <span className="hfdq-kicker">Launch readiness</span>
                                <h4>{blockingCount > 0 ? `${blockingCount} item${blockingCount === 1 ? '' : 's'} must be fixed` : warningCount > 0 ? `${warningCount} warning${warningCount === 1 ? '' : 's'} to review` : 'All launch checks passed'}</h4>
                                <p>Each check shows where HR should go if something needs attention.</p>
                            </div>
                            <div className="hfda-readiness-meter">
                                <strong>{readinessPercent}%</strong>
                                <span>{readyCheckCount}/{totalCheckCount || 0} ready</span>
                            </div>
                        </div>

                        {activationReadiness.blockingIssues.length > 0 && (
                            <div className="hfda-issue-strip blocked">
                                {activationReadiness.blockingIssues.slice(0, 4).map(item => <span key={item}><i className="bi bi-x-circle" /> {item}</span>)}
                            </div>
                        )}

                        {activationReadiness.warnings.length > 0 && (
                            <div className="hfda-issue-strip warning">
                                {activationReadiness.warnings.slice(0, 4).map(item => <span key={item}><i className="bi bi-info-circle" /> {item}</span>)}
                            </div>
                        )}

                        <div className="hfda-check-list hfda-check-list-v2">
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

                    <div className="hfda-launch-impact-grid">
                        <article className="hfda-impact-card">
                            <span className="hfdq-kicker">Launch impact</span>
                            <h4>What happens after launch</h4>
                            <ul>
                                <li>Campaign details, recipients, evaluator assignments, question snapshot, and scoring setup are locked.</li>
                                <li>Evaluator feedback tasks become available according to the campaign window.</li>
                                <li>Question text, competencies, rating scale, and required-comment rules are frozen for this campaign.</li>
                                <li>HR can monitor progress, send reminders, and close the campaign after collection.</li>
                            </ul>
                        </article>
                        <article className="hfda-impact-card subtle">
                            <span className="hfdq-kicker">Scoring policy</span>
                            <h4>Unavailable relationship handling</h4>
                            <p>{scoringConfig.redistributeMissingRelationshipWeight
                                ? 'If a recipient naturally has no weighted evaluator relationship, that unavailable relationship weight is redistributed across the recipient’s available evaluator groups.'
                                : 'Every weighted evaluator relationship is required. Missing weighted relationships block launch until HR adjusts assignments or weights.'}</p>
                            <p>{relationshipWeightLabel}</p>
                        </article>
                        <article className="hfda-impact-card subtle">
                            <span className="hfdq-kicker">Feedback visibility</span>
                            <h4>Recipient view</h4>
                            <p>{privacySummary}</p>
                            <p>HR/Admin can still audit evaluator identity for assignment management.</p>
                        </article>
                    </div>

                    <div className="hfda-launch-actions hfda-final-actions">
                        <button className="hfd-btn hfd-btn-secondary" type="button" disabled={loadingActivation} onClick={onRefreshCheck}>
                            <i className="bi bi-arrow-clockwise" /> Refresh Check
                        </button>
                        <button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => onGoToStep('questions')}>
                            <i className="bi bi-ui-checks-grid" /> Back to Campaign Question Preview
                        </button>
                        {selectedCampaign.status === 'DRAFT' && (
                            <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canValidateSetup || activatingCampaign} onClick={() => setConfirmationMode('validate')}>
                                <i className="bi bi-shield-check" /> {activatingCampaign ? 'Validating...' : 'Validate & Lock Setup'}
                            </button>
                        )}
                        {selectedCampaign.status === 'READY_TO_ACTIVATE' && (
                            <button className="hfd-btn hfd-btn-primary" type="button" disabled={!canActivate || activatingCampaign} onClick={() => setConfirmationMode('launch')}>
                                <i className="bi bi-rocket-takeoff" /> {activatingCampaign ? 'Launching...' : 'Launch Campaign'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {confirmationMode && selectedCampaign && (
                <div className="hfda-confirm-backdrop" role="presentation">
                    <div className="hfda-confirm-modal" role="dialog" aria-modal="true" aria-label={isLaunchConfirmation ? 'Launch campaign confirmation' : 'Validate setup confirmation'}>
                        <button className="hfda-confirm-close" type="button" onClick={closeConfirmation} aria-label="Close confirmation">
                            <i className="bi bi-x-lg" />
                        </button>
                        <span className="hfda-confirm-icon"><i className={`bi ${isLaunchConfirmation ? 'bi-rocket-takeoff' : 'bi-shield-check'}`} /></span>
                        <span className="hfdq-kicker">{isLaunchConfirmation ? 'Final launch confirmation' : 'Setup lock confirmation'}</span>
                        <h3>{isLaunchConfirmation ? `Launch “${confirmationCampaignName}”?` : `Validate and lock “${confirmationCampaignName}”?`}</h3>
                        <p>{isLaunchConfirmation
                            ? 'This will open the campaign workflow, create active evaluator tasks, and keep the saved question snapshot locked for this campaign.'
                            : 'This will lock the setup for final launch review. Launch becomes available after validation passes.'}</p>
                        <div className="hfda-confirm-facts">
                            <span><strong>{launchTargetCount}</strong> recipients</span>
                            <span><strong>{launchAssignmentCount}</strong> evaluator tasks</span>
                            <span><strong>{questionSetCount}</strong> question sets</span>
                        </div>
                        {isLaunchConfirmation && (
                            <label className="hfda-confirm-type">
                                Type <strong>LAUNCH</strong> to confirm.
                                <input value={launchConfirmationText} onChange={(event) => setLaunchConfirmationText(event.target.value)} placeholder="LAUNCH" />
                            </label>
                        )}
                        <div className="hfda-confirm-actions">
                            <button className="hfd-btn hfd-btn-secondary" type="button" onClick={closeConfirmation}>Cancel</button>
                            <button className="hfd-btn hfd-btn-primary" type="button" disabled={!confirmationAllowed || activatingCampaign} onClick={confirmAction}>
                                <i className={`bi ${isLaunchConfirmation ? 'bi-rocket-takeoff' : 'bi-shield-check'}`} />
                                {isLaunchConfirmation ? 'Launch Campaign' : 'Validate & Lock Setup'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
