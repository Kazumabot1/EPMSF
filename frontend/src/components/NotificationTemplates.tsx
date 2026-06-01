import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import api from '../api';
import ConfirmModal from './ConfirmModal';
import {
  btnIconNudeRed,
  btnIconSecondary,
  btnNudeRed,
  btnPrimary,
  btnSecondary,
  inputClass,
  modalOverlayClass,
  POSITION_FONT,
  positionHeroGradient,
} from '../pages/position/positionPageUi';

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

type PendingSend = { template: NotificationTemplate; channel: Channel } | null;

const CHANNELS: Array<{ value: Channel; label: string; icon: string }> = [
  { value: 'email', label: 'Email', icon: 'bi-envelope' },
  { value: 'in_app', label: 'In-app', icon: 'bi-bell' },
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

function roleLabel(role: TargetRole) {
  return role === 'DepartmentHead' ? 'Department Head' : role;
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
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingSend, setPendingSend] = useState<PendingSend>(null);

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
      const response = await api.get('/announcements');
      setTemplates(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements.');
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
    const channels = normalizeChannels(template);
    setEditing(template);
    setForm({
      subjectTemplate: template.subjectTemplate,
      bodyTemplate: template.bodyTemplate,
      channels: channels.length ? channels : ['email'],
      targetRoles: template.targetRoles?.length ? template.targetRoles : ['Employee'],
    });
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

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
        await api.put(`/announcements/${editing.id}`, payload);
        toast.success('Announcement updated.');
      } else {
        await api.post('/announcements', payload);
        toast.success('Announcement created.');
      }

      closeForm();
      await fetchTemplates();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    try {
      await api.delete(`/announcements/${deleteId}`);
      toast.success('Announcement deleted.');
      setDeleteId(null);
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement.');
    } finally {
      setDeleting(false);
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

  const executeSend = async (template: NotificationTemplate, channel: Channel) => {
    const label = channel === 'email' ? 'email' : 'in-app notification';
    const key = `${template.id}:${channel}`;
    setSendingKey(key);

    try {
      const endpoint = channel === 'email' ? 'send-email' : 'send-in-app';
      const response = await api.post<DeliveryResult>(`/announcements/${template.id}/${endpoint}`);
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
      console.error(`Error sending ${channel} announcement:`, error);
      toast.error(`Failed to send ${label}.`);
    } finally {
      setSendingKey(null);
      setPendingSend(null);
    }
  };

  const modalShell = (children: ReactNode, onClose: () => void, maxWidth = 'max-w-lg') =>
    createPortal(
      <div
        role="presentation"
        className={modalOverlayClass}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          className={`max-h-[min(92vh,800px)] w-full ${maxWidth} overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl`}
          style={{ fontFamily: POSITION_FONT }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>,
      document.body,
    );

  const checkOptionClass = (checked: boolean) =>
    `flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
      checked
        ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200'
        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
    }`;

  return (
    <div
      className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700"
      style={{ fontFamily: POSITION_FONT }}
    >
      <div className="mx-auto max-w-6xl px-4 py-5 pb-16">
        <header
          className={`rounded-xl border border-blue-200/70 px-4 py-3 shadow-sm ${positionHeroGradient}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800 shadow-sm backdrop-blur-sm">
                <i className="bi bi-megaphone text-xs" aria-hidden />
                Notifications
              </span>
              <h1 className="mt-1.5 text-xl font-bold leading-tight text-blue-950">Announcements</h1>
              <p className="mt-0.5 max-w-2xl text-xs leading-5 text-slate-700">
                Create and send email or in-app announcements to selected roles across the organization.
              </p>
            </div>
            <button type="button" onClick={openCreate} className={`${btnPrimary} shrink-0`}>
              <i className="bi bi-plus-lg" aria-hidden />
              Create announcement
            </button>
          </div>
        </header>

        {loading && !showForm ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm animate-pulse">
            Loading announcements…
          </div>
        ) : sortedTemplates.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <i
              className="bi bi-megaphone mb-4 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-2xl text-blue-700"
              aria-hidden
            />
            <h2 className="text-lg font-bold text-blue-950">No announcements yet</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Create your first announcement to notify employees, managers, or other roles by email or in-app.
            </p>
            <button type="button" onClick={openCreate} className={`${btnPrimary} mt-6`}>
              <i className="bi bi-plus-lg" aria-hidden />
              Create announcement
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {sortedTemplates.map((template) => {
              const channels = normalizeChannels(template);

              return (
                <article
                  key={template.id}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-bold text-blue-950">
                          {template.subjectTemplate}
                        </h2>
                        <p className="mt-0.5 font-mono text-xs text-slate-400">
                          {templateKey(template.subjectTemplate)}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                        Active
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {template.bodyTemplate}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 px-4 py-3" aria-label="Send channels">
                    {channels.includes('email') && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100 disabled:opacity-50"
                        title="Send email to target role recipients"
                        disabled={sendingKey === `${template.id}:email`}
                        onClick={() => setPendingSend({ template, channel: 'email' })}
                      >
                        <i className="bi bi-envelope" aria-hidden />
                        {sendingKey === `${template.id}:email` ? 'Sending…' : 'Send email'}
                      </button>
                    )}
                    {channels.includes('in_app') && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-800 transition hover:border-indigo-300 hover:bg-indigo-100 disabled:opacity-50"
                        title="Send to notification center"
                        disabled={sendingKey === `${template.id}:in_app`}
                        onClick={() => setPendingSend({ template, channel: 'in_app' })}
                      >
                        <i className="bi bi-bell" aria-hidden />
                        {sendingKey === `${template.id}:in_app` ? 'Sending…' : 'Send in-app'}
                      </button>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                    <div className="flex flex-wrap gap-1.5" aria-label="Target roles">
                      {(template.targetRoles ?? []).map((role) => (
                        <span
                          key={role}
                          className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                        >
                          {roleLabel(role)}
                        </span>
                      ))}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        title="Edit"
                        aria-label="Edit"
                        onClick={() => openEdit(template)}
                        className={btnIconSecondary}
                      >
                        <i className="bi bi-pencil-square" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        aria-label="Delete"
                        onClick={() => setDeleteId(template.id)}
                        className={btnIconNudeRed}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {showForm &&
        modalShell(
          <>
            <div className={`border-b border-blue-200/60 px-5 py-4 ${positionHeroGradient}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
                {editing ? 'Edit' : 'New'}
              </p>
              <h2 className="text-lg font-bold text-blue-950">
                {editing ? 'Edit announcement' : 'Create announcement'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Announcement name <span className="text-red-600">*</span>
                <input
                  type="text"
                  className={inputClass}
                  value={form.subjectTemplate}
                  onChange={(event) =>
                    setForm({ ...form, subjectTemplate: event.target.value })
                  }
                  placeholder="e.g. Appraisal submitted"
                  required
                />
              </label>

              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Message <span className="text-red-600">*</span>
                <textarea
                  className={`${inputClass} min-h-[120px] resize-y`}
                  value={form.bodyTemplate}
                  onChange={(event) => setForm({ ...form, bodyTemplate: event.target.value })}
                  placeholder="Write the announcement message…"
                  rows={5}
                  required
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-slate-700">Send via</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CHANNELS.map((channel) => (
                    <label
                      key={channel.value}
                      className={checkOptionClass(form.channels.includes(channel.value))}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.channels.includes(channel.value)}
                        onChange={() => toggleChannel(channel.value)}
                      />
                      <i className={`bi ${channel.icon}`} aria-hidden />
                      <span>{channel.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-slate-700">Target roles</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TARGET_ROLES.map((role) => (
                    <label
                      key={role.value}
                      className={checkOptionClass(form.targetRoles.includes(role.value))}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.targetRoles.includes(role.value)}
                        onChange={() => toggleRole(role.value)}
                      />
                      <span>{role.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" className={btnSecondary} onClick={closeForm} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className={btnPrimary} disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create announcement'}
                </button>
              </div>
            </form>
          </>,
          closeForm,
          'max-w-2xl',
        )}

      {deliveryResult &&
        modalShell(
          <>
            <div className={`border-b border-blue-200/60 px-5 py-4 ${positionHeroGradient}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Delivery result</p>
              <h2 className="text-lg font-bold text-blue-950">
                {deliveryResult.channel === 'email' ? 'Email delivery' : 'In-app delivery'}
              </h2>
              <p className="mt-1 text-xs text-slate-700">
                {deliveryResult.sentCount} sent · {deliveryResult.skippedCount} skipped ·{' '}
                {deliveryResult.attemptedCount} attempted
              </p>
            </div>

            <div className="overflow-x-auto p-5">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Recipient</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(deliveryResult.recipients ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                        No target recipients were found.
                      </td>
                    </tr>
                  ) : (
                    (deliveryResult.recipients ?? []).map((recipient, index) => (
                      <tr key={`${recipient.userId ?? 'recipient'}-${index}`}>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {recipient.displayName || `User #${recipient.userId ?? '—'}`}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{recipient.role || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{recipient.email || '—'}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              recipient.status === 'sent'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {recipient.status || 'unknown'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{recipient.failure || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {deliveryResult.firstFailure && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  First issue: {deliveryResult.firstFailure}
                </p>
              )}

              <div className="mt-4 flex justify-end">
                <button type="button" className={btnPrimary} onClick={() => setDeliveryResult(null)}>
                  Close
                </button>
              </div>
            </div>
          </>,
          () => setDeliveryResult(null),
          'max-w-4xl',
        )}

      <ConfirmModal
        open={deleteId != null}
        title="Delete announcement"
        message="This announcement will be permanently removed. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => {
          if (!deleting) setDeleteId(null);
        }}
      />

      <ConfirmModal
        open={pendingSend != null}
        title="Send announcement"
        message={
          pendingSend
            ? `Send this ${pendingSend.channel === 'email' ? 'email' : 'in-app'} announcement "${
                pendingSend.template.subjectTemplate
              }" to ${
                pendingSend.template.targetRoles?.length
                  ? pendingSend.template.targetRoles.map(roleLabel).join(', ')
                  : 'configured target roles'
              }?`
            : ''
        }
        confirmText="Send"
        cancelText="Cancel"
        loading={sendingKey != null}
        onConfirm={() => {
          if (pendingSend) void executeSend(pendingSend.template, pendingSend.channel);
        }}
        onCancel={() => {
          if (!sendingKey) setPendingSend(null);
        }}
      />
    </div>
  );
};

export default NotificationTemplates;
