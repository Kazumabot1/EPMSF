/*
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { UserRole } from '../../config/roleNavigation';
import {
  dashboardPathByRole,
  displayRoleName,
} from '../../config/roleNavigation';
import { useAuth } from '../../contexts/AuthContext';
import {
  notificationService,
  type NotificationDto,
} from '../../services/notificationService';

interface UserLike {
  fullName?: string;
  email?: string;
  employeeCode?: string;
  position?: string;
}

interface EmployeeHeaderProps {
  user?: UserLike | null;
  role?: UserRole;
  collapsed?: boolean;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return 'EP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const formatDate = (value?: string | null) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString();
};

const EmployeeHeader = ({
  user,
  role = 'Employee',
  collapsed = false,
}: EmployeeHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { logout } = useAuth();

  const displayName = user?.fullName?.trim() || 'EPMS User';
  const initials = getInitials(displayName);
  const email = user?.email || '-';
  const employeeCode = user?.employeeCode || '-';
  const position = user?.position || displayRoleName(role);
  const roleLabel = displayRoleName(role);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      setNotificationLoading(true);

      const [list, count] = await Promise.all([
        notificationService.list(),
        notificationService.unreadCount(),
      ]);

      setNotifications(list);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load notifications', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!menuOpen && !notificationOpen) return;

    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, notificationOpen]);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/login', { replace: true });
  };

  const goToDashboard = () => {
    closeMenu();
    navigate(dashboardPathByRole[role] ?? '/employee/dashboard');
  };

  const markAsRead = async (notification: NotificationDto) => {
    try {
      if (!notification.isRead) {
        await notificationService.markAsRead(notification.id);
        await loadNotifications();
      }
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  return (
    <header className={`employee-header ${collapsed ? 'collapsed' : ''}`}>
      <div className="employee-header-search">
        <i className="bi bi-search" />
        <input type="text" placeholder="Search employees, KPIs, appraisals..." />
      </div>

      <div className="employee-header-actions">
        <div ref={notificationRef} style={{ position: 'relative' }}>
          <button
            type="button"
            aria-label="Notifications"
            className="employee-header-notification"
            onClick={() => {
              setNotificationOpen((prev) => !prev);
              setMenuOpen(false);
              void loadNotifications();
            }}
          >
            <i className="bi bi-bell" />
            {unreadCount > 0 && (
              <span>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {notificationOpen && (
            <div
              className="employee-user-dropdown"
              role="menu"
              style={{
                right: 0,
                left: 'auto',
                width: 360,
                maxWidth: 'calc(100vw - 24px)',
                padding: 0,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <strong style={{ display: 'block', color: '#0f172a' }}>
                  Notifications
                </strong>
                <small style={{ color: '#64748b' }}>{unreadCount} unread</small>
              </div>

              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notificationLoading ? (
                  <div style={{ padding: 16, color: '#64748b', fontSize: 13 }}>
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: 16, color: '#64748b', fontSize: 13 }}>
                    No notifications.
                  </div>
                ) : (
                  notifications.slice(0, 8).map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void markAsRead(notification)}
                      style={{
                        width: '100%',
                        border: 0,
                        borderBottom: '1px solid #f1f5f9',
                        background: notification.isRead ? '#fff' : '#eff6ff',
                        padding: '12px 16px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <strong style={{ color: '#0f172a', fontSize: 13 }}>
                          {notification.title}
                        </strong>

                        {!notification.isRead && (
                          <span
                            style={{
                              color: '#2563eb',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            New
                          </span>
                        )}
                      </div>

                      <p
                        style={{
                          margin: '5px 0',
                          color: '#475569',
                          fontSize: 12,
                          lineHeight: 1.4,
                        }}
                      >
                        {notification.message}
                      </p>

                      <small style={{ color: '#94a3b8' }}>
                        {formatDate(notification.createdAt)}
                      </small>
                    </button>
                  ))
                )}
              </div>

              <Link
                to="/notifications"
                className="employee-user-dropdown-item"
                onClick={() => setNotificationOpen(false)}
                style={{ borderTop: '1px solid #e5e7eb' }}
              >
                <i className="bi bi-list-check" />
                View all notifications
              </Link>
            </div>
          )}
        </div>

        <div className="employee-header-divider" />

        <div className="employee-user-menu" ref={menuRef}>
          <button
            type="button"
            className="employee-user-chip"
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setNotificationOpen(false);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="employee-user-dropdown"
          >
            <span className="employee-user-avatar">{initials}</span>

            <span className="employee-user-meta">
              <span>{displayName}</span>
              <small>{roleLabel}</small>
            </span>

            <i className={`bi ${menuOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
          </button>

          {menuOpen && (
            <div
              className="employee-user-dropdown"
              id="employee-user-dropdown"
              role="menu"
            >
              <button
                type="button"
                className="employee-user-dropdown-item"
                onClick={() => {
                  closeMenu();
                  setProfileOpen(true);
                }}
              >
                <i className="bi bi-person" />
                Profile
              </button>

              <button
                type="button"
                className="employee-user-dropdown-item"
                onClick={goToDashboard}
              >
                <i className="bi bi-house-door" />
                Dashboard
              </button>

              <button
                type="button"
                className="employee-user-dropdown-item employee-user-dropdown-item-danger"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {profileOpen && (
        <div
          className="employee-profile-modal-overlay"
          role="presentation"
          onClick={() => setProfileOpen(false)}
        >
          <div
            className="employee-profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-profile-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="employee-profile-modal-head">
              <h2 id="employee-profile-title">User Profile</h2>

              <button
                type="button"
                className="employee-profile-modal-close"
                aria-label="Close profile modal"
                onClick={() => setProfileOpen(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="employee-profile-summary">
              <span className="employee-user-avatar">{initials}</span>

              <div>
                <strong>{displayName}</strong>
                <p>{roleLabel}</p>
              </div>
            </div>

            <div className="employee-profile-grid">
              <div>
                <label>Full Name</label>
                <span>{displayName}</span>
              </div>

              <div>
                <label>Email</label>
                <span>{email}</span>
              </div>

              <div>
                <label>Employee Code</label>
                <span>{employeeCode}</span>
              </div>

              <div>
                <label>Position</label>
                <span>{position}</span>
              </div>

              <div>
                <label>Current Role</label>
                <span>{roleLabel}</span>
              </div>
            </div>

            <div className="employee-profile-actions">
              <button type="button" onClick={() => setProfileOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default EmployeeHeader; */



import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import type { UserRole } from '../../config/roleNavigation';
import { dashboardPathByRole, displayRoleName } from '../../config/roleNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationsWebSocket } from '../../hooks/useNotificationsWebSocket';
import KpiNotificationMessageBody from '../notifications/KpiNotificationMessageBody';
import SignatureModal from '../signature/SignatureModal';

interface UserLike {
  fullName?: string;
  email?: string;
  employeeCode?: string;
  position?: string;
}

interface EmployeeHeaderProps {
  user?: UserLike | null;
  role?: UserRole;
  collapsed?: boolean;
}

type NotifItem = {
  id: number;
  title: string;
  message: string;
  type?: string | null;
  isRead?: boolean | null;
  createdAt?: string | number | number[] | null;
  referenceId?: number | null;
};

function unwrap<T>(res: { data?: { data?: T } & T }): T | undefined {
  const body = res?.data as { data?: T } | undefined;

  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data;
  }

  return res?.data as T | undefined;
}

function mergeByLatest(prev: NotifItem[], incoming: NotifItem) {
  const ix = prev.findIndex((x) => x.id === incoming.id);

  if (ix >= 0) {
    const next = [...prev];
    next[ix] = { ...next[ix], ...incoming };
    return next;
  }

  return [incoming, ...prev];
}

function formatNotifTime(createdAt: NotifItem['createdAt']) {
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

function notifIconClass(type?: string | null) {
  const t = String(type ?? '')
    .trim()
    .toUpperCase();

  if (t === 'GENERAL') return 'bi bi-info-circle';
  if (t === 'MEETING') return 'bi bi-calendar-event';
  if (t === 'PIP') return 'bi bi-clipboard2-pulse';
  if (t === 'APPRAISAL') return 'bi bi-exclamation-triangle';
  if (t === 'KPI' || t.startsWith('KPI_')) return 'bi bi-bullseye';
  if (t === 'FEEDBACK') return 'bi bi-chat-dots';

  return 'bi bi-bell';
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return 'EP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const EmployeeHeader = ({
  user,
  role = 'Employee',
  collapsed = false,
}: EmployeeHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [notifItems, setNotifItems] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logout, user: authUser } = useAuth();

  const displayName = user?.fullName?.trim() || 'EPMS User';
  const initials = getInitials(displayName);
  const email = user?.email || '-';
  const employeeCode = user?.employeeCode || '-';
  const position = user?.position || displayRoleName(role);
  const roleLabel = displayRoleName(role);
  const notificationsPath = role === 'Employee' ? '/employee/notifications' : '/notifications';

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const closeNotif = useCallback(() => {
    setNotifOpen(false);
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);

      const list = unwrap<NotifItem[]>(listRes);
      const count = unwrap<number>(countRes);

      setNotifItems(Array.isArray(list) ? list.slice(0, 5) : []);
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch {
      setNotifItems([]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!notifOpen) return;
    void loadNotifications();
  }, [notifOpen, loadNotifications]);

  const onWsNotification = useCallback((payload: NotifItem) => {
    setNotifItems((prev) => mergeByLatest(prev, payload).slice(0, 5));
    setUnreadCount((prev) => prev + 1);
  }, []);

  useNotificationsWebSocket(onWsNotification);

  useEffect(() => {
    if (!menuOpen) return;

    const onDocMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!notifOpen) return;

    const onDocMouseDown = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [notifOpen]);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/login', { replace: true });
  };

  const goToDashboard = () => {
    closeMenu();
    navigate(dashboardPathByRole[role] ?? '/employee/dashboard');
  };

  const markAllRead = async (event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      await api.put('/notifications/read-all');
      await loadNotifications();
    } catch {
      /* ignore */
    }
  };

  const onNotifItemClick = async (id: number, isRead: boolean | null | undefined) => {
    if (isRead) return;

    try {
      await api.put(`/notifications/${id}/read`);
      await loadNotifications();
    } catch {
      /* ignore */
    }
  };

  const goToNotifications = () => {
    closeNotif();
    navigate(notificationsPath);
  };

  return (
    <header className={`employee-header ${collapsed ? 'collapsed' : ''}`}>
      <div className="employee-header-search">
        <i className="bi bi-search" />
        <input type="text" placeholder="Search employees, KPIs, appraisals..." />
      </div>

      <div className="employee-header-actions">
        <div className="hr-notification-wrap" ref={notifRef}>
          <button
            type="button"
            aria-label="Notifications"
            className={`hr-icon-button hr-notification-trigger ${notifOpen ? 'is-open' : ''}`}
            aria-expanded={notifOpen}
            aria-haspopup="dialog"
            onClick={() => {
              setMenuOpen(false);
              setNotifOpen((prev) => !prev);
            }}
          >
            <i className="bi bi-bell" />

            {unreadCount > 0 ? (
              <span className="hr-notification-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>

          {notifOpen && (
            <div className="hr-notif-popover" role="dialog" aria-label="Notifications">
              <div className="hr-notif-popover__header">
                <span className="hr-notif-popover__title">Notifications</span>

                <button type="button" className="hr-notif-popover__mark-all" onClick={markAllRead}>
                  Mark all read
                </button>
              </div>

              <div className="hr-notif-popover__body">
                {notifItems.length === 0 ? (
                  <p className="hr-notif-popover__empty">No notifications yet.</p>
                ) : (
                  notifItems.map((n) => (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      className={`hr-notif-popover__item ${n.isRead ? '' : 'is-unread'}`}
                      onClick={() => onNotifItemClick(n.id, n.isRead)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onNotifItemClick(n.id, n.isRead);
                        }
                      }}
                    >
                      <i
                        className={`hr-notif-popover__item-icon ${notifIconClass(n.type)}`}
                        aria-hidden
                      />

                      <span className="hr-notif-popover__item-main">
                        <span className="hr-notif-popover__item-title">{n.title}</span>
                        <span className="hr-notif-popover__item-msg">
                          <KpiNotificationMessageBody
                            message={n.message}
                            type={n.type}
                            referenceId={n.referenceId}
                            user={authUser}
                            onKpiLinkNavigate={() => onNotifItemClick(n.id, n.isRead)}
                          />
                        </span>
                        <span className="hr-notif-popover__item-time">
                          {formatNotifTime(n.createdAt)}
                        </span>
                      </span>

                      <span
                        className={`hr-notif-popover__item-dot ${n.isRead ? 'is-read' : ''}`}
                        aria-hidden
                      />
                    </div>
                  ))
                )}
              </div>

              <div className="hr-notif-popover__footer">
                <button
                  type="button"
                  className="hr-notif-popover__view-all"
                  style={{ border: 0, background: 'transparent', cursor: 'pointer' }}
                  onClick={goToNotifications}
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="employee-header-divider" />

        <div className="employee-user-menu" ref={menuRef}>
          <button
            type="button"
            className="employee-user-chip"
            onClick={() => {
              setNotifOpen(false);
              setMenuOpen((prev) => !prev);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="employee-user-dropdown"
          >
            <span className="employee-user-avatar">{initials}</span>

            <span className="employee-user-meta">
              <span>{displayName}</span>
              <small>{roleLabel}</small>
            </span>

            <i className={`bi ${menuOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
          </button>

          {menuOpen && (
            <div className="employee-user-dropdown" id="employee-user-dropdown" role="menu">
              <button
                type="button"
                className="employee-user-dropdown-item"
                onClick={() => {
                  closeMenu();
                  setProfileOpen(true);
                }}
              >
                <i className="bi bi-person" />
                Profile
              </button>

              <button type="button" className="employee-user-dropdown-item" onClick={goToDashboard}>
                <i className="bi bi-house-door" />
                Dashboard
              </button>
              <button
                type="button"
                className="employee-user-dropdown-item"
                onClick={() => {
                  closeMenu();
                  setSignatureOpen(true);
                }}
              >
                <i className="bi bi-pen" />
                Signature
              </button>

              <button
                type="button"
                className="employee-user-dropdown-item employee-user-dropdown-item-danger"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {profileOpen && (
        <div
          className="employee-profile-modal-overlay"
          role="presentation"
          onClick={() => setProfileOpen(false)}
        >
          <div
            className="employee-profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-profile-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="employee-profile-modal-head">
              <h2 id="employee-profile-title">User Profile</h2>

              <button
                type="button"
                className="employee-profile-modal-close"
                aria-label="Close profile modal"
                onClick={() => setProfileOpen(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="employee-profile-summary">
              <span className="employee-user-avatar">{initials}</span>

              <div>
                <strong>{displayName}</strong>
                <p>{roleLabel}</p>
              </div>
            </div>

            <div className="employee-profile-grid">
              <div>
                <label>Full Name</label>
                <span>{displayName}</span>
              </div>

              <div>
                <label>Email</label>
                <span>{email}</span>
              </div>

              <div>
                <label>Employee Code</label>
                <span>{employeeCode}</span>
              </div>

              <div>
                <label>Position</label>
                <span>{position}</span>
              </div>

              <div>
                <label>Current Role</label>
                <span>{roleLabel}</span>
              </div>
            </div>

            <div className="employee-profile-actions">
              <button type="button" onClick={() => setProfileOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <SignatureModal open={signatureOpen} onClose={() => setSignatureOpen(false)} />
    </header>
  );
};

export default EmployeeHeader;
