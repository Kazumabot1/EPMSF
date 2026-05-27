import type { FeedbackCampaign } from '../../../../../types/feedbackCampaign';
import type { CampaignSetupStep } from '../hooks/useCampaignSetupSteps';
import type { SetupStepKey } from '../types/campaignSetupTypes';

type CampaignSetupStepperProps = {
    selectedCampaign: FeedbackCampaign | null;
    setupSteps: CampaignSetupStep[];
    activeStepKey: SetupStepKey;
    setActiveStepKey: (step: SetupStepKey) => void;
    statusClass: (status: FeedbackCampaign['status']) => string;
    statusLabels: Record<string, string>;
};

export function CampaignSetupStepper({
                                         selectedCampaign,
                                         setupSteps,
                                         activeStepKey,
                                         setActiveStepKey,
                                         statusClass,
                                         statusLabels,
                                     }: CampaignSetupStepperProps) {
    return (
        <section className="hfdq-table-card hfdc-stepper-shell">
            <div className="hfdc-stepper-head">
                <div>
                    <span className="hfdq-kicker">Setup path</span>
                    <h3>Campaign Setup Wizard</h3>
                    <p>Use one focused step at a time. Completed steps stay accessible, and locked steps open automatically when prerequisites are saved.</p>
                </div>
                {selectedCampaign
                    ? <span className={statusClass(selectedCampaign.status)}>{statusLabels[selectedCampaign.status] ?? selectedCampaign.status}</span>
                    : <span className="hfd-status-badge DRAFT">New Draft</span>}
            </div>
            <div className="hfdc-top-stepper" role="tablist" aria-label="Campaign setup steps">
                {setupSteps.map((step, index) => (
                    <div key={step.key} className={`hfdc-top-step-wrap ${index < setupSteps.length - 1 ? 'has-line' : ''}`}>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeStepKey === step.key}
                            className={`hfdc-top-step ${activeStepKey === step.key ? 'active' : ''} ${step.done ? 'done' : ''} ${step.unlocked ? '' : 'locked'}`}
                            onClick={() => step.unlocked && setActiveStepKey(step.key)}
                            disabled={!step.unlocked}
                        >
                  <span className="hfdc-top-step-icon">
                    <i className={`bi ${step.done ? 'bi-check-lg' : step.icon}`} />
                  </span>
                            <span className="hfdc-top-step-copy">
                    <strong>{step.label}</strong>
                    <small>{step.status}</small>
                  </span>
                        </button>
                        {index < setupSteps.length - 1 ? <span className={`hfdc-top-step-line ${setupSteps[index + 1].unlocked ? 'ready' : ''}`} aria-hidden="true" /> : null}
                    </div>
                ))}
            </div>
        </section>
    );
}
