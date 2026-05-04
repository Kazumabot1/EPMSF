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
};

/**
 * Subscribes to per-user STOMP notifications pushed after {@code NotificationService.send}.
 */
export function useNotificationsWebSocket(onNotification: (n: WsNotificationPayload) => void) {
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  useEffect(() => {
    const token = authStorage.getAccessToken();
    if (!token) return;

    const sock = new SockJS(`/ws?token=${encodeURIComponent(token)}`);
    const client = new Client({
      webSocketFactory: () => sock as unknown as WebSocket,
      reconnectDelay: 4000,
      heartbeatIncoming: 15000,
      heartbeatOutgoing: 15000,
      debug: () => undefined,
      onConnect: () => {
        client.subscribe('/user/queue/notifications', (message: IMessage) => {
          try {
            const body = JSON.parse(message.body) as WsNotificationPayload;
            handlerRef.current(body);
          } catch {
            /* ignore malformed frames */
          }
        });
      },
    });

    client.activate();

    return () => {
      void client.deactivate();
    };
  }, []);
}
