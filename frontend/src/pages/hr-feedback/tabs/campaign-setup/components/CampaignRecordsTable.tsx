import type { FeedbackCampaign } from '../../../../../types/feedbackCampaign';

type CampaignRecordsTableProps = {
    campaigns: FeedbackCampaign[];
    loadingCampaigns: boolean;
    statusClass: (status: FeedbackCampaign['status']) => string;
    statusLabels: Record<string, string>;
    statusDescriptions: Record<string, string>;
    completionLabel: (campaign: FeedbackCampaign) => string;
    formatWindow: (campaign: FeedbackCampaign) => string;
    onOpenCampaign: (campaignId: string) => void;
};

export function CampaignRecordsTable({
                                         campaigns,
                                         loadingCampaigns,
                                         statusClass,
                                         statusLabels,
                                         statusDescriptions,
                                         completionLabel,
                                         formatWindow,
                                         onOpenCampaign,
                                     }: CampaignRecordsTableProps) {
    return (
        <section className="hfdq-table-card hfdc-list-card">
            <div className="hfdc-card-head">
                <div>
                    <span className="hfdq-kicker">Campaign records</span>
                    <h3>Campaign List</h3>
                    <p>Confirm target count and campaign windows before evaluator rules start.</p>
                </div>
            </div>

            {loadingCampaigns ? (
                <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
                <div className="hfd-empty-state hfdc-empty-state"><i className="bi bi-inbox" /><strong>No campaigns yet</strong><p>Save a campaign draft to start the new setup flow.</p></div>
            ) : (
                <div className="hfd-table-wrap hfdq-modern-table-wrap">
                    <table className="hfd-table hfdq-modern-table hfdc-campaign-table">
                        <thead>
                        <tr>
                            <th>Campaign</th>
                            <th>Review Year</th>
                            <th>Status</th>
                            <th>Targets</th>
                            <th>Assignments</th>
                            <th>Completion</th>
                            <th>Window</th>
                            <th />
                        </tr>
                        </thead>
                        <tbody>
                        {campaigns.map(campaign => (
                            <tr key={campaign.id}>
                                <td><div className="hfd-campaign-name-cell"><strong>{campaign.name}</strong><small>Reference #{campaign.id}</small></div></td>
                                <td>{campaign.reviewYear}</td>
                                <td><span className={statusClass(campaign.status)}>{statusLabels[campaign.status] ?? campaign.status}</span><small>{statusDescriptions[campaign.status] ?? ''}</small></td>
                                <td>{campaign.targetCount ?? 0}</td>
                                <td>{campaign.assignmentCount ?? 0}</td>
                                <td>{completionLabel(campaign)}</td>
                                <td>{formatWindow(campaign)}</td>
                                <td><button className="hfd-btn hfd-btn-secondary" type="button" onClick={() => onOpenCampaign(String(campaign.id))}>Open</button></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
