import type { FeedbackCampaign, FeedbackCampaignTargetsResponse } from '../../../../../types/feedbackCampaign';
import { CampaignStat } from './CampaignStat';

type CampaignSetupStatsProps = {
    campaigns: FeedbackCampaign[];
    selectedCampaign: FeedbackCampaign | null;
    targetsResponse: FeedbackCampaignTargetsResponse;
};

export function CampaignSetupStats({ campaigns, selectedCampaign, targetsResponse }: CampaignSetupStatsProps) {
    const draftCampaigns = campaigns.filter(campaign => campaign.status === 'DRAFT').length;
    const activeCampaigns = campaigns.filter(campaign => campaign.status === 'ACTIVE').length;
    const readyCampaigns = campaigns.filter(campaign => campaign.status === 'READY_TO_ACTIVATE').length;
    const publishedCampaigns = campaigns.filter(campaign => campaign.status === 'PUBLISHED').length;

    return (
        <div className="hfdq-stats-grid hfdc-stats-grid">
            <CampaignStat icon="bi bi-collection" label="Total Campaigns" value={campaigns.length} note="All campaign records" tone="blue" />
            <CampaignStat icon="bi bi-pencil-square" label="Draft / Ready" value={draftCampaigns + readyCampaigns} note={`${draftCampaigns} draft, ${readyCampaigns} ready`} tone="green" />
            <CampaignStat icon="bi bi-person-check" label="Saved Targets" value={targetsResponse.targetCount} note={selectedCampaign ? 'Selected campaign' : 'No campaign selected'} tone="purple" />
            <CampaignStat icon="bi bi-send-check" label="Published" value={publishedCampaigns} note={`${activeCampaigns} active now`} tone="orange" />
        </div>
    );
}
