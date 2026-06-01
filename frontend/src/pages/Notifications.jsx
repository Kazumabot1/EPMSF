import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationsWebSocket } from '../hooks/useNotificationsWebSocket';
import KpiNotificationMessageBody from '../components/notifications/KpiNotificationMessageBody';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'general', label: 'General' },
  { id: 'appraisal', label: 'Appraisals' },
  { id: 'kpi', label: 'KPIs' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'meeting', label: 'Meetings' },
  { id: 'pip', label: 'PIP' },
];

function unwrapList(res) {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.content)) return body.content;
  return [];
}

function normType(n) {
  return String(n?.type ?? '')
      .trim()
      .toUpperCase();
}

function typeForTab(tabId) {
  const map = {
    general: 'GENERAL',
    appraisal: 'APPRAISAL',
    kpi: 'KPI',
    feedback: 'FEEDBACK',
    meeting: 'MEETING',
    pip: 'PIP',
  };

  return map[tabId] ?? null;
}

function matchesType(n, want) {
  const t = normType(n);
  if (!want) return true;
  if (want === 'KPI') return t === 'KPI' || t.startsWith('KPI_');
  if (want === 'FEEDBACK') return t === 'FEEDBACK' || t.startsWith('FEEDBACK_');
  if (want === 'GENERAL') return t === 'GENERAL' || !t;
  return t === want;
}

function categoryLabel(type) {
  const t = normType({ type });

  if (t === 'GENERAL' || !t) return 'General';
  if (t === 'MEETING') return 'Meeting';
  if (t === 'PIP') return 'PIP';
  if (t === 'APPRAISAL') return 'Appraisal';
  if (t === 'KPI' || t.startsWith('KPI_')) return 'KPI';
  if (t === 'FEEDBACK') return 'Feedback';

  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(createdAt) {
  if (createdAt == null) return '';

  try {
    if (Array.isArray(createdAt)) {
      const [y, mo, d, h = 0, mi = 0, s = 0] = createdAt;

      return new Date(y, mo - 1, d, h, mi, s).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    }

    const d = new Date(createdAt);

    if (Number.isNaN(d.getTime())) return '';

    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '';
  }
}

function typeUi(type) {
  const t = normType({ type });

  if (t === 'GENERAL') {
    return {
      icon: 'bi bi-info-circle',
      iconWrap: 'bg-sky-50 text-sky-700 ring-sky-100',
      badge: 'bg-sky-50 text-sky-700 ring-sky-100',
    };
  }

  if (t === 'MEETING') {
    return {
      icon: 'bi bi-calendar-event',
      iconWrap: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
      badge: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    };
  }

  if (t === 'PIP') {
    return {
      icon: 'bi bi-clipboard2-pulse',
      iconWrap: 'bg-rose-50 text-rose-700 ring-rose-100',
      badge: 'bg-rose-50 text-rose-700 ring-rose-100',
    };
  }

  if (t === 'APPRAISAL') {
    return {
      icon: 'bi bi-exclamation-triangle',
      iconWrap: 'bg-amber-50 text-amber-700 ring-amber-100',
      badge: 'bg-amber-50 text-amber-700 ring-amber-100',
    };
  }

  if (t === 'KPI' || t.startsWith('KPI_')) {
    return {
      icon: 'bi bi-bullseye',
      iconWrap: 'bg-blue-50 text-blue-700 ring-blue-100',
      badge: 'bg-blue-50 text-blue-700 ring-blue-100',
    };
  }

  if (t === 'FEEDBACK') {
    return {
      icon: 'bi bi-chat-dots',
      iconWrap: 'bg-teal-50 text-teal-700 ring-teal-100',
      badge: 'bg-teal-50 text-teal-700 ring-teal-100',
    };
  }

  return {
    icon: 'bi bi-bell',
    iconWrap: 'bg-slate-100 text-slate-700 ring-slate-200',
    badge: 'bg-slate-100 text-slate-700 ring-slate-200',
  };
}

function mergeByLatest(prev, incoming) {
  const ix = prev.findIndex((x) => x.id === incoming.id);

  if (ix >= 0) {
    const next = [...prev];
    next[ix] = { ...next[ix], ...incoming };
    return next;
  }

  return [incoming, ...prev];
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);

  const canTemplates =
      user?.roles?.some((r) => {
        const x = String(r).toUpperCase().replace(/^ROLE_/, '');
        return x === 'HR' || x === 'ADMIN';
      }) ?? false;

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get('/notifications');
      setNotifications(unwrapList(res));
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      load();
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [load]);

  const onWsNotification = useCallback((payload) => {
    setNotifications((prev) => mergeByLatest(prev, payload));
  }, []);

  useNotificationsWebSocket(onWsNotification);

  useEffect(() => {
    const onNotificationsReadStateChanged = (event) => {
      const detail = event?.detail ?? {};

      setNotifications((prev) => {
        if (detail.allRead) {
          return prev.map((item) => ({ ...item, isRead: true }));
        }

        const ids = new Set(detail.notificationIds ?? []);
        if (ids.size === 0) {
          return prev;
        }

        return prev.map((item) => (ids.has(item.id) ? { ...item, isRead: true } : item));
      });

      if (!detail.allRead && !Array.isArray(detail.notificationIds)) {
        void load();
      }
    };

    window.addEventListener('epms:notifications-read-state-changed', onNotificationsReadStateChanged);

    return () => {
      window.removeEventListener('epms:notifications-read-state-changed', onNotificationsReadStateChanged);
    };
  }, [load]);

  const counts = useMemo(() => {
    const unread = notifications.filter((n) => !n.isRead).length;
    const byType = (want) => notifications.filter((n) => matchesType(n, want)).length;
    const unreadByType = (want) =>
        notifications.filter((n) => matchesType(n, want) && !n.isRead).length;

    return {
      all: notifications.length,
      unread,
      general: byType('GENERAL'),
      appraisal: byType('APPRAISAL'),
      kpi: byType('KPI'),
      feedback: byType('FEEDBACK'),
      meeting: byType('MEETING'),
      pip: byType('PIP'),
      unreadGeneral: unreadByType('GENERAL'),
      unreadAppraisal: unreadByType('APPRAISAL'),
      unreadKpi: unreadByType('KPI'),
      unreadFeedback: unreadByType('FEEDBACK'),
      unreadMeeting: unreadByType('MEETING'),
      unreadPip: unreadByType('PIP'),
    };
  }, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (tab === 'all') return true;
      if (tab === 'unread') return !n.isRead;

      const want = typeForTab(tab);

      if (!want) return true;

      return matchesType(n, want);
    });
  }, [notifications, tab]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await load();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      await load();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const tabBadge = (tid) => {
    if (tid === 'all') return counts.all;
    if (tid === 'unread') return counts.unread;
    if (tid === 'general') return counts.general;
    if (tid === 'appraisal') return counts.appraisal;
    if (tid === 'kpi') return counts.kpi;
    if (tid === 'feedback') return counts.feedback;
    if (tid === 'meeting') return counts.meeting;
    if (tid === 'pip') return counts.pip;

    return 0;
  };

  return (
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
            <span>Dashboard</span>
            <i className="bi bi-chevron-right text-xs text-slate-300" aria-hidden />
            <span className="text-slate-700">Notifications</span>
          </nav>

          <section className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-br from-white via-sky-50/60 to-slate-50 px-5 py-6 sm:px-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-blue-700 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    All Dashboard
                  </div>
                  <h1 className="text-3xl font-black tracking-normal text-slate-950 sm:text-4xl">
                    Notifications
                  </h1>
                  <p className="mt-2 max-w-2xl text-base font-medium leading-7 text-slate-600">
                    Stay updated on your tasks, appraisal activity, KPI requests, feedback, meetings, and PIP workflows.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                      type="button"
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 text-sm font-extrabold text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-55"
                      onClick={markAllRead}
                      disabled={counts.unread === 0}
                  >
                    <i className="bi bi-check2-all text-base" aria-hidden />
                    Mark all read
                  </button>

                  <Link
                      to="/notification-settings"
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
                  >
                    <i className="bi bi-sliders" aria-hidden />
                    Settings
                  </Link>

                  {canTemplates && (
                      <Link
                          to="/announcements"
                          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
                      >
                        <i className="bi bi-megaphone" aria-hidden />
                        Announcements
                      </Link>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500">Total</span>
                    <i className="bi bi-bell text-blue-600" aria-hidden />
                  </div>
                  <strong className="mt-3 block text-3xl font-black text-slate-950">{counts.all}</strong>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white/85 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500">Unread</span>
                    <i className="bi bi-envelope-exclamation text-blue-600" aria-hidden />
                  </div>
                  <strong className="mt-3 block text-3xl font-black text-blue-700">{counts.unread}</strong>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-white/85 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500">Appraisals</span>
                    <i className="bi bi-clipboard-check text-amber-600" aria-hidden />
                  </div>
                  <strong className="mt-3 block text-3xl font-black text-slate-950">{counts.appraisal}</strong>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-white/85 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500">KPI Tasks</span>
                    <i className="bi bi-bullseye text-sky-600" aria-hidden />
                  </div>
                  <strong className="mt-3 block text-3xl font-black text-slate-950">{counts.kpi}</strong>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-7">
              <div className="mb-5 overflow-x-auto pb-1">
                <div className="flex min-w-max items-center gap-2" role="tablist">
                  {TABS.map((t) => {
                    const active = tab === t.id;

                    return (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-extrabold transition ${
                                active
                                    ? 'border-blue-200 bg-blue-600 text-white shadow-sm shadow-blue-200'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                            }`}
                            onClick={() => setTab(t.id)}
                        >
                          {t.label}
                          <span
                              className={`grid min-w-7 place-items-center rounded-full px-2 py-0.5 text-xs font-black ${
                                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                          >
                            {tabBadge(t.id)}
                          </span>
                        </button>
                    );
                  })}
                </div>
              </div>

              {loading ? (
                  <div className="grid gap-3">
                    {[0, 1, 2].map((item) => (
                        <div
                            key={item}
                            className="flex animate-pulse gap-4 rounded-2xl border border-slate-200 bg-white p-5"
                        >
                          <div className="h-12 w-12 rounded-2xl bg-slate-100" />
                          <div className="flex-1 space-y-3">
                            <div className="h-4 w-2/5 rounded bg-slate-100" />
                            <div className="h-4 w-4/5 rounded bg-slate-100" />
                            <div className="h-3 w-32 rounded bg-slate-100" />
                          </div>
                        </div>
                    ))}
                  </div>
              ) : filtered.length === 0 ? (
                  <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-16 text-center">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl text-slate-400 shadow-sm">
                      <i className="bi bi-inbox" aria-hidden />
                    </div>
                    <h2 className="mt-4 text-lg font-black text-slate-900">No notifications</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">No notifications in this view.</p>
                  </div>
              ) : (
                  <div className="grid gap-3">
                    {filtered.map((n) => {
                      const ui = typeUi(n.type);

                      return (
                          <article
                              key={n.id}
                              role="button"
                              tabIndex={0}
                              className={`group relative flex cursor-pointer gap-4 rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-5 ${
                                  n.isRead ? 'border-slate-200' : 'border-blue-200 ring-1 ring-blue-100'
                              }`}
                              onClick={() => {
                                if (!n.isRead) markAsRead(n.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  if (!n.isRead) markAsRead(n.id);
                                }
                              }}
                          >
                            {!n.isRead && (
                                <span className="absolute left-0 top-6 h-10 w-1 rounded-r-full bg-blue-600" aria-hidden />
                            )}

                            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl ring-1 ${ui.iconWrap}`}>
                              <i className={ui.icon} aria-hidden />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="break-words text-base font-black leading-6 text-slate-950">
                                      {n.title}
                                    </h2>
                                    {!n.isRead && (
                                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white">
                                          New
                                        </span>
                                    )}
                                  </div>
                                  <div className="mt-2 text-sm font-medium leading-6 text-slate-600">
                                    <KpiNotificationMessageBody
                                        message={n.message}
                                        type={n.type}
                                        referenceId={n.referenceId}
                                        user={user}
                                        onKpiLinkNavigate={() => {
                                          if (!n.isRead) markAsRead(n.id);
                                        }}
                                    />
                                  </div>
                                </div>

                                <span className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-black ring-1 ${ui.badge}`}>
                                  {categoryLabel(n.type)}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <i className="bi bi-clock" aria-hidden />
                                  {formatTime(n.createdAt)}
                                </span>
                                <span className={n.isRead ? 'text-slate-400' : 'text-blue-700'}>
                                  {n.isRead ? 'Read' : 'Unread'}
                                </span>
                              </div>
                            </div>
                          </article>
                      );
                    })}
                  </div>
              )}
            </div>
          </section>
        </div>
      </main>
  );
}
