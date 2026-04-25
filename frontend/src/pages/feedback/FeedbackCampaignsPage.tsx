import { useEffect, useState } from 'react';
import { feedbackService } from '../../services/feedbackService';
import type { FeedbackCampaign, FeedbackCampaignPayload, FeedbackCampaignStatus } from '../../types/feedback';
import {
  EmptyState,
  MetricCard,
  SectionIntro,
  StatusBadge,
  formatDate,
  formatDateTime,
  storeRecentId,
} from './feedback-ui';

const defaultCampaignForm = (): FeedbackCampaignPayload => ({
  name: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  status: 'DRAFT',
});

const statusOptions: FeedbackCampaignStatus[] = ['DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED'];

const FeedbackCampaignsPage = () => {
  const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
  const [form, setForm] = useState<FeedbackCampaignPayload>(defaultCampaignForm);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await feedbackService.getCampaigns();
      setCampaigns(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCampaigns();
  }, []);

  const resetForm = () => {
    setSelectedCampaignId('');
    setForm(defaultCampaignForm());
    setSuccess('');
    setError('');
  };

  const handleSelectCampaign = (campaignId: number | '') => {
    setSelectedCampaignId(campaignId);
    setSuccess('');
    setError('');

    if (campaignId === '') {
      setForm(defaultCampaignForm());
      return;
    }

    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      return;
    }

    setForm({
      name: campaign.name,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      status: campaign.status,
    });
  };

  const handleSave = async () => {
    try {
      setBusy(true);
      setError('');
      setSuccess('');

      const savedCampaign = selectedCampaignId === ''
        ? await feedbackService.createCampaign(form)
        : await feedbackService.updateCampaign(selectedCampaignId, form);

      setSuccess(
        selectedCampaignId === ''
          ? `Campaign "${savedCampaign.name}" created. Reference #${savedCampaign.id}.`
          : `Campaign "${savedCampaign.name}" updated. Reference #${savedCampaign.id}.`,
      );
      storeRecentId('campaigns', savedCampaign.id);
      await loadCampaigns();
      setSelectedCampaignId(savedCampaign.id);
      setForm({
        name: savedCampaign.name,
        startDate: savedCampaign.startDate,
        endDate: savedCampaign.endDate,
        status: savedCampaign.status,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Campaign could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'ACTIVE').length;

  return (
    <div className="feedback-stack">
      <div className="feedback-module-grid">
        <section className="feedback-panel soft">
          <SectionIntro
            title={selectedCampaignId === '' ? 'Create campaign' : 'Edit campaign'}
            body="Use clear campaign names and dates so HR can understand the feedback window without checking raw records."
            aside="The selected record fills this form automatically."
          />

          <div className="feedback-form-grid">
            <div className="feedback-field full">
              <label htmlFor="campaign-picker">Campaign to edit</label>
              <select
                id="campaign-picker"
                className="kpi-select"
                value={selectedCampaignId}
                onChange={(e) => handleSelectCampaign(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Create a new campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} #{campaign.id}
                  </option>
                ))}
              </select>
              <small>Pick an existing campaign to edit it, or leave this empty to create a new one.</small>
            </div>

            <div className="feedback-field full">
              <label htmlFor="campaign-name">Campaign name</label>
              <input
                id="campaign-name"
                className="kpi-input"
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="Example: Mid-Year Leadership 360"
              />
            </div>

            <div className="feedback-field">
              <label htmlFor="campaign-start">Start date</label>
              <input
                id="campaign-start"
                className="kpi-input"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((current) => ({ ...current, startDate: e.target.value }))}
              />
            </div>

            <div className="feedback-field">
              <label htmlFor="campaign-end">End date</label>
              <input
                id="campaign-end"
                className="kpi-input"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((current) => ({ ...current, endDate: e.target.value }))}
              />
            </div>

            <div className="feedback-field full">
              <label htmlFor="campaign-status">Status</label>
              <select
                id="campaign-status"
                className="kpi-select"
                value={form.status}
                onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as FeedbackCampaignStatus }))}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="feedback-actions">
            <button className="kpi-btn-primary" disabled={busy} onClick={() => void handleSave()}>
              {busy ? 'Saving...' : selectedCampaignId === '' ? 'Create campaign' : 'Update campaign'}
            </button>
            <button className="kpi-btn-ghost" type="button" onClick={resetForm}>
              Clear form
            </button>
            <button className="kpi-btn-ghost" type="button" onClick={() => void loadCampaigns()}>
              Refresh list
            </button>
          </div>

          {success ? <div className="feedback-message info">{success}</div> : null}
          {error ? <div className="feedback-message error">{error}</div> : null}
        </section>

        <aside className="feedback-panel">
          <SectionIntro
            title="Campaign snapshot"
            body="A quick read of how many campaigns are available and how many are currently running."
          />
          <div className="feedback-inline-metrics">
            <MetricCard label="Total campaigns" value={campaigns.length} />
            <MetricCard label="Active now" value={activeCampaigns} />
            <MetricCard label="Selected record" value={selectedCampaignId === '' ? 'New' : `#${selectedCampaignId}`} />
          </div>

          <div className="feedback-note" style={{ marginTop: 16 }}>
            <strong>Why this is clearer</strong>
            Campaign editing is now tied to a named record picker. You no longer have to remember which raw ID belongs to which campaign before editing.
          </div>
        </aside>
      </div>

      <section className="feedback-panel">
        <SectionIntro
          title="All campaigns"
          body="Use this table to confirm windows and statuses before creating requests."
        />

        {loading ? (
          <div className="feedback-message info">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            body="Create the first 360 feedback campaign to start requesting feedback."
          />
        ) : (
          <div className="feedback-list-table-wrap">
            <table className="feedback-list-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Window</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <div className="feedback-table-title">
                        <strong>{campaign.name}</strong>
                        <small>Reference #{campaign.id}</small>
                      </div>
                    </td>
                    <td>
                      {formatDate(campaign.startDate)} to {formatDate(campaign.endDate)}
                    </td>
                    <td><StatusBadge status={campaign.status} /></td>
                    <td>{formatDateTime(campaign.createdAt)}</td>
                    <td>
                      <button
                        className="kpi-btn-ghost"
                        type="button"
                        onClick={() => handleSelectCampaign(campaign.id)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default FeedbackCampaignsPage;
