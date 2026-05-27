type CampaignSetupHeaderProps = {
    loadingCampaigns: boolean;
    error: string;
    success: string;
    onRefresh: () => void;
    onNewDraft: () => void;
};

export function CampaignSetupHeader({
                                        loadingCampaigns,
                                        error,
                                        success,
                                        onRefresh,
                                        onNewDraft,
                                    }: CampaignSetupHeaderProps) {
    return (
        <>
            <div className="hfdq-page-head">
                <div>
                    <p className="hfdq-breadcrumb"><i className="bi bi-house" /> 360 Feedback / Campaign Setup</p>
                    <h2>Campaign Setup</h2>
                    <p>Set up the campaign, choose feedback recipients, prepare evaluators, review questions, and launch with confidence.</p>
                </div>
                <div className="hfdq-actions">
                    <button className="hfd-btn hfd-btn-secondary" type="button" onClick={onRefresh} disabled={loadingCampaigns}>
                        <i className="bi bi-arrow-clockwise" /> Refresh
                    </button>
                    <button className="hfd-btn hfd-btn-primary" type="button" onClick={onNewDraft}>
                        <i className="bi bi-plus-lg" /> New Draft
                    </button>
                </div>
            </div>

            {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}
            {success && <div className="hfd-alert hfd-alert-success"><i className="bi bi-check-circle" />{success}</div>}
        </>
    );
}
