import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationsWebSocket } from '../hooks/useNotificationsWebSocket';
import KpiNotificationMessageBody from '../components/notifications/KpiNotificationMessageBody';
import './notifications-page.css';

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

function iconClass(type) {
  const t = normType({ type });

  if (t === 'GENERAL') return 'notif-card-icon notif-card-icon-default bi bi-info-circle';
  if (t === 'MEETING') return 'notif-card-icon notif-card-icon-meeting bi bi-calendar-event';
  if (t === 'PIP') return 'notif-card-icon notif-card-icon-pip bi bi-clipboard2-pulse';
  if (t === 'APPRAISAL') return 'notif-card-icon notif-card-icon-warn bi bi-exclamation-triangle';
  if (t === 'KPI' || t.startsWith('KPI_')) return 'notif-card-icon notif-card-icon-default bi bi-bullseye';
  if (t === 'FEEDBACK') return 'notif-card-icon notif-card-icon-default bi bi-chat-dots';

  return 'notif-card-icon notif-card-icon-default bi bi-bell';
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
    <div className="notif-page">
      <div className="notif-breadcrumb">
        Dashboard <span>/</span> Notifications
      </div>

      <div className="notif-page-header">
        <div className="notif-page-title-block">
          <h1>Notifications</h1>
          <p>Stay updated on your tasks and activities.</p>
        </div>

        <div className="notif-page-actions">
          <button type="button" className="notif-btn-ghost" onClick={markAllRead}>
            Mark all read
          </button>

          {canTemplates && (
            <Link to="/notification-templates" className="notif-btn-outline">
              <i className="bi bi-gear" aria-hidden />
              Templates
            </Link>
          )}
        </div>
      </div>

      <div className="notif-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`notif-tab ${tab === t.id ? 'notif-tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className="notif-tab-count">{tabBadge(t.id)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="notif-empty">Loading notifications…</div>
      ) : filtered.length === 0 ? (
        <div className="notif-empty">No notifications in this view.</div>
      ) : (
        filtered.map((n) => (
          <div
            key={n.id}
            role="button"
            tabIndex={0}
            className={`notif-card ${n.isRead ? '' : 'notif-card-unread'}`}
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
            <i className={iconClass(n.type)} aria-hidden />

            <div className="notif-card-body">
              <div className="notif-card-headline">
                <span className="notif-card-title">{n.title}</span>
                <span className="notif-card-badge">{categoryLabel(n.type)}</span>
              </div>

              <p className="notif-card-msg">
                <KpiNotificationMessageBody
                  message={n.message}
                  type={n.type}
                  referenceId={n.referenceId}
                  user={user}
                  onKpiLinkNavigate={() => {
                    if (!n.isRead) markAsRead(n.id);
                  }}
                />
              </p>

              <div className="notif-card-time">{formatTime(n.createdAt)}</div>
            </div>

            <span
              className={`notif-card-dot ${n.isRead ? 'notif-card-dot-read' : ''}`}
              aria-hidden
            />
          </div>
        ))
      )}
    </div>
  );
}
