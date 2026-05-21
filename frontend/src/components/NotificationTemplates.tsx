import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import './notification-templates.css';

type Channel = 'email' | 'in_app';
type TargetRole = 'Employee' | 'Manager' | 'DepartmentHead' | 'HR' | 'Admin' | 'Executive';

interface NotificationTemplate {
  id: number;
  channelType?: string | null;
  channels?: Channel[];
  targetRoles?: TargetRole[];
  targetEmails?: string[];
  subjectTemplate: string;
  bodyTemplate: string;
}

type DeliveryResult = {
  channel: Channel;
  attemptedCount: number;
  sentCount: number;
  skippedCount: number;
  firstFailure?: string | null;
  failures?: string[];
  recipients?: Array<{
    userId?: number | null;
    displayName?: string | null;
    role?: string | null;
    email?: string | null;
    status?: string | null;
    failure?: string | null;
  }>;
};

type TemplateForm = {
  subjectTemplate: string;
  bodyTemplate: string;
  channels: Channel[];
  targetRoles: TargetRole[];
};

const CHANNELS: Array<{ value: Channel; label: string; icon: string }> = [
  { value: 'email', label: 'email', icon: 'bi-envelope' },
  { value: 'in_app', label: 'in_app', icon: 'bi-window' },
];

const TARGET_ROLES: Array<{ value: TargetRole; label: string }> = [
  { value: 'Employee', label: 'Employee' },
  { value: 'Manager', label: 'Manager' },
  { value: 'DepartmentHead', label: 'Department Head' },
  { value: 'HR', label: 'HR' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Executive', label: 'Executive' },
];

const emptyForm: TemplateForm = {
  subjectTemplate: '',
  bodyTemplate: '',
  channels: ['email', 'in_app'],
  targetRoles: ['Employee'],
};

function normalizeChannels(template: NotificationTemplate): Channel[] {
  if (template.channels?.length) return template.channels;

  return String(template.channelType ?? '')
    .split(',')
    .map((channel) => channel.trim().toLowerCase().replace('-', '_'))
    .map((channel) => (channel === 'system' || channel === 'inapp' ? 'in_app' : channel))
    .filter((channel): channel is Channel => channel === 'email' || channel === 'in_app');
}

function templateKey(subject: string) {
  return subject
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

const NotificationTemplates = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [deliveryResult, setDeliveryResult] = useState<DeliveryResult | null>(null);

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => b.id - a.id),
    [templates],
  );

  useEffect(() => {
    void fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notification-templates');
      setTemplates(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching notification templates:', error);
      toast.error('Failed to load notification templates.');
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (channel: Channel) => {
    setForm((current) => {
      const exists = current.channels.includes(channel);
      const channels = exists
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel];

      return { ...current, channels };
    });
  };

  const toggleRole = (role: TargetRole) => {
    setForm((current) => {
      const exists = current.targetRoles.includes(role);
      const targetRoles = exists
        ? current.targetRoles.filter((item) => item !== role)
        : [...current.targetRoles, role];

      return { ...current, targetRoles };
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (template: NotificationTemplate) => {
    setEditing(template);
    setForm({
      subjectTemplate: template.subjectTemplate,
      bodyTemplate: template.bodyTemplate,
      channels: normalizeChannels(template).length ? normalizeChannels(template) : ['email'],
      targetRoles: template.targetRoles?.length ? template.targetRoles : ['Employee'],
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.channels.length) {
      toast.error('Select at least one channel.');
      return;
    }

    if (!form.targetRoles.length) {
      toast.error('Select at least one target role.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        channelType: form.channels.join(','),
        channels: form.channels,
        targetRoles: form.targetRoles,
        subjectTemplate: form.subjectTemplate,
        bodyTemplate: form.bodyTemplate,
      };

      if (editing) {
        await api.put(`/notification-templates/${editing.id}`, payload);
        toast.success('Notification template updated.');
      } else {
        await api.post('/notification-templates', payload);
        toast.success('Notification template created.');
      }

      closeForm();
      await fetchTemplates();
    } catch (error) {
      console.error('Error saving notification template:', error);
      toast.error('Failed to save notification template.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this notification template?')) return;

    setLoading(true);
    try {
      await api.delete(`/notification-templates/${id}`);
      toast.success('Notification template deleted.');
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting notification template:', error);
      toast.error('Failed to delete notification template.');
    } finally {
      setLoading(false);
    }
  };

  const deliveryMessage = (result: DeliveryResult) => {
    const label = result.channel === 'email' ? 'Email' : 'In-app notification';
    const attempted = result.attemptedCount ?? 0;
    const sent = result.sentCount ?? 0;
    const skipped = result.skippedCount ?? 0;

    if (sent === 0) {
      const suffix = result.firstFailure ? ` ${result.firstFailure}` : '';
      return `${label} delivery completed with no recipients sent (${attempted} attempted, ${skipped} skipped).${suffix}`;
    }

    const suffix = skipped > 0 && result.firstFailure ? ` First issue: ${result.firstFailure}` : '';
    return `${label} sent to ${sent} recipient${sent === 1 ? '' : 's'} (${attempted} attempted, ${skipped} skipped).${suffix}`;
  };

  const sendTemplate = async (template: NotificationTemplate, channel: Channel) => {
    const label = channel === 'email' ? 'email' : 'in-app notification';
    const roles = template.targetRoles?.length
      ? template.targetRoles.map((role) => (role === 'DepartmentHead' ? 'Department Head' : role)).join(', ')
      : 'configured target roles';

    if (!window.confirm(`Send this ${label} template to ${roles}?`)) {
      return;
    }

    const key = `${template.id}:${channel}`;
    setSendingKey(key);

    try {
      const endpoint = channel === 'email' ? 'send-email' : 'send-in-app';
      const response = await api.post<DeliveryResult>(`/notification-templates/${template.id}/${endpoint}`);
      const result = response.data;

      if (result.sentCount > 0) {
        toast.success(deliveryMessage(result));
      } else {
        toast.error(deliveryMessage(result));
      }

      setDeliveryResult(result);

      if (channel === 'in_app') {
        window.dispatchEvent(new Event('epms:notifications-updated'));
      }
    } catch (error) {
      console.error(`Error sending ${channel} template:`, error);
      toast.error(`Failed to send ${label}.`);
    } finally {
      setSendingKey(null);
    }
  };

  return (
    <div className="nt-page">
      <div className="nt-page-header">
        <div>
          <h1>Notification Templates</h1>
        </div>

        <button type="button" className="nt-primary-button" onClick={openCreate}>
          <i className="bi bi-plus-lg" aria-hidden />
          <span>Create Template</span>
        </button>
      </div>

      {loading && !showForm ? (
        <div className="nt-empty">Loading notification templates...</div>
      ) : sortedTemplates.length === 0 ? (
        <div className="nt-empty">No notification templates yet.</div>
      ) : (
        <div className="nt-grid">
          {sortedTemplates.map((template) => {
            const channels = normalizeChannels(template);

            return (
              <article className="nt-card" key={template.id}>
                <div className="nt-card-head">
                  <div className="nt-card-copy">
                    <h2>{template.subjectTemplate}</h2>
                    <p className="nt-card-key">{templateKey(template.subjectTemplate)}</p>
                    <p className="nt-card-preview">{template.bodyTemplate}</p>
                  </div>

                  <span className="nt-status">
                    <span aria-hidden />
                    Active
                  </span>
                </div>

                <div className="nt-chip-row" aria-label="Template channels">
                  {channels.includes('email') && (
                    <button
                      type="button"
                      className="nt-chip nt-chip-button"
                      title="Send email to target role recipients"
                      disabled={sendingKey === `${template.id}:email`}
                      onClick={() => void sendTemplate(template, 'email')}
                    >
                      <i className="bi bi-envelope" aria-hidden />
                      {sendingKey === `${template.id}:email` ? 'sending' : 'email'}
                    </button>
                  )}

                  {channels.includes('in_app') && (
                    <button
                      type="button"
                      className="nt-chip nt-chip-button"
                      title="Send to system notification center"
                      disabled={sendingKey === `${template.id}:in_app`}
                      onClick={() => void sendTemplate(template, 'in_app')}
                    >
                      <i className="bi bi-window" aria-hidden />
                      {sendingKey === `${template.id}:in_app` ? 'sending' : 'in_app'}
                    </button>
                  )}
                </div>

                <div className="nt-card-footer">
                  <div className="nt-role-row" aria-label="Target roles">
                    {(template.targetRoles ?? []).map((role) => (
                      <span key={role} className="nt-role-chip">
                        {role === 'DepartmentHead' ? 'Department Head' : role}
                      </span>
                    ))}
                  </div>

                  <div className="nt-card-actions">
                    <button type="button" title="Edit" onClick={() => openEdit(template)}>
                      <i className="bi bi-pencil" aria-hidden />
                    </button>
                    <button type="button" title="Delete" onClick={() => void handleDelete(template.id)}>
                      <i className="bi bi-trash" aria-hidden />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="nt-modal-backdrop" role="presentation">
          <section className="nt-modal" role="dialog" aria-modal="true" aria-label="Notification template form">
            <div className="nt-modal-head">
              <h2>{editing ? 'Edit Notification Template' : 'Create Notification Template'}</h2>
              <button type="button" className="nt-icon-button" onClick={closeForm} aria-label="Close">
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="nt-form">
              <label className="nt-field">
                <span>Template Name</span>
                <input
                  type="text"
                  value={form.subjectTemplate}
                  onChange={(e) => setForm({ ...form, subjectTemplate: e.target.value })}
                  placeholder="Appraisal Submitted"
                  required
                />
              </label>

              <label className="nt-field">
                <span>Message</span>
                <textarea
                  value={form.bodyTemplate}
                  onChange={(e) => setForm({ ...form, bodyTemplate: e.target.value })}
                  placeholder="Appraisal Submitted for Review"
                  rows={5}
                  required
                />
              </label>

              <fieldset className="nt-fieldset">
                <legend>Send Via</legend>
                <div className="nt-option-grid">
                  {CHANNELS.map((channel) => (
                    <label key={channel.value} className="nt-check-option">
                      <input
                        type="checkbox"
                        checked={form.channels.includes(channel.value)}
                        onChange={() => toggleChannel(channel.value)}
                      />
                      <i className={`bi ${channel.icon}`} aria-hidden />
                      <span>{channel.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="nt-fieldset">
                <legend>Target Roles</legend>
                <div className="nt-option-grid nt-role-options">
                  {TARGET_ROLES.map((role) => (
                    <label key={role.value} className="nt-check-option">
                      <input
                        type="checkbox"
                        checked={form.targetRoles.includes(role.value)}
                        onChange={() => toggleRole(role.value)}
                      />
                      <span>{role.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="nt-modal-actions">
                <button type="button" className="nt-secondary-button" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="nt-primary-button" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create Template'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deliveryResult && (
        <div className="nt-modal-backdrop" role="presentation">
          <section className="nt-modal nt-delivery-modal" role="dialog" aria-modal="true" aria-label="Delivery result">
            <div className="nt-modal-head">
              <div>
                <h2>
                  {deliveryResult.channel === 'email' ? 'Email Delivery' : 'In-App Delivery'}
                </h2>
                <p className="nt-delivery-summary">
                  {deliveryResult.sentCount} sent, {deliveryResult.skippedCount} skipped, {deliveryResult.attemptedCount} attempted
                </p>
              </div>

              <button
                type="button"
                className="nt-icon-button"
                onClick={() => setDeliveryResult(null)}
                aria-label="Close delivery result"
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>

            <div className="nt-delivery-table-wrap">
              <table className="nt-delivery-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {(deliveryResult.recipients ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5}>No target recipients were found.</td>
                    </tr>
                  ) : (
                    (deliveryResult.recipients ?? []).map((recipient, index) => (
                      <tr key={`${recipient.userId ?? 'recipient'}-${index}`}>
                        <td>{recipient.displayName || `User #${recipient.userId ?? '-'}`}</td>
                        <td>{recipient.role || '-'}</td>
                        <td>{recipient.email || '-'}</td>
                        <td>
                          <span className={`nt-delivery-status ${recipient.status === 'sent' ? 'is-sent' : 'is-skipped'}`}>
                            {recipient.status || 'unknown'}
                          </span>
                        </td>
                        <td>{recipient.failure || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {deliveryResult.firstFailure && (
              <p className="nt-delivery-note">First issue: {deliveryResult.firstFailure}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default NotificationTemplates;
