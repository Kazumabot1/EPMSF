import { useEffect, useRef } from 'react';
import { Client, type IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { authStorage } from '../services/authStorage';

export type WsNotificationPayload = {
  id: number;
  title: string;
  message: string;
  type: string | null;
  isRead: boolean | null;
  createdAt: string | number | number[] | null;
  referenceId?: number | null;
};

export type WsRealtimeEventPayload = {
  eventType: 'NOTIFICATIONS_READ_STATE_CHANGED' | 'ONE_ON_ONE_MEETINGS_CHANGED' | string;
  unreadCount?: number;
  notificationIds?: number[];
  allRead?: boolean;
  meetingId?: number;
  action?: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'FINISHED' | 'FOLLOW_UP_SET' | 'AUTO_STATUS_CHANGED' | string;
};

type NotificationHandler = (n: WsNotificationPayload) => void;

const subscribers = new Set<NotificationHandler>();

let client: Client | null = null;
let activeToken: string | null = null;
let retryTimer: number | null = null;
let retryCount = 0;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 15000;

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(window.atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

function isExpiredToken(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now() + 5000;
}

function notifySessionExpired() {
  authStorage.clearSession();
  window.dispatchEvent(new Event('epms:auth-expired'));
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

function clearRetryTimer() {
  if (retryTimer != null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function deactivateClient() {
  clearRetryTimer();

  if (client) {
    const current = client;
    client = null;
    void current.deactivate();
  }

  activeToken = null;
  retryCount = 0;
}

function emitNotification(payload: WsNotificationPayload) {
  subscribers.forEach((handler) => {
    try {
      handler(payload);
    } catch {
      /* subscriber failures must not break the shared socket */
    }
  });

  window.dispatchEvent(
    new CustomEvent('epms:notification-received', {
      detail: payload,
    }),
  );
}

function emitRealtimeEvent(payload: WsRealtimeEventPayload) {
  const eventName =
    payload.eventType === 'NOTIFICATIONS_READ_STATE_CHANGED'
      ? 'epms:notifications-read-state-changed'
      : payload.eventType === 'ONE_ON_ONE_MEETINGS_CHANGED'
        ? 'epms:one-on-one-meetings-changed'
        : 'epms:realtime-event';

  window.dispatchEvent(
    new CustomEvent(eventName, {
      detail: payload,
    }),
  );
}

function scheduleReconnect() {
  if (retryTimer != null || subscribers.size === 0 || retryCount >= MAX_RETRIES) {
    return;
  }

  retryCount += 1;
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    client = null;
    activeToken = null;
    ensureClient();
  }, RETRY_DELAY_MS);
}

function ensureClient() {
  const token = authStorage.getAccessToken();
  if (!token) {
    deactivateClient();
    return;
  }

  if (isExpiredToken(token)) {
    deactivateClient();
    notifySessionExpired();
    return;
  }

  if (client && activeToken === token) {
    return;
  }

  deactivateClient();
  activeToken = token;

  const sock = new SockJS(`/ws?token=${encodeURIComponent(token)}`);
  const nextClient = new Client({
    webSocketFactory: () => sock as unknown as WebSocket,
    reconnectDelay: 0,
    heartbeatIncoming: 15000,
    heartbeatOutgoing: 15000,
    debug: () => undefined,
    onConnect: () => {
      retryCount = 0;
      nextClient.subscribe('/user/queue/notifications', (message: IMessage) => {
        try {
          const body = JSON.parse(message.body) as WsNotificationPayload;
          emitNotification(body);
        } catch {
          /* ignore malformed frames */
        }
      });

      nextClient.subscribe('/user/queue/events', (message: IMessage) => {
        try {
          const body = JSON.parse(message.body) as WsRealtimeEventPayload;
          emitRealtimeEvent(body);
        } catch {
          /* ignore malformed frames */
        }
      });
    },
    onWebSocketClose: () => {
      if (client !== nextClient) {
        return;
      }

      if (activeToken && isExpiredToken(activeToken)) {
        deactivateClient();
        notifySessionExpired();
        return;
      }

      scheduleReconnect();
    },
    onStompError: () => {
      if (client !== nextClient) {
        return;
      }

      scheduleReconnect();
    },
  });

  client = nextClient;
  nextClient.activate();
}

/**
 * Subscribes to per-user STOMP notifications pushed after {@code NotificationService.send}.
 */
export function useNotificationsWebSocket(onNotification: (n: WsNotificationPayload) => void) {
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  useEffect(() => {
    const handler: NotificationHandler = (payload) => handlerRef.current(payload);
    subscribers.add(handler);
    ensureClient();

    return () => {
      subscribers.delete(handler);
    };
  }, []);
}
