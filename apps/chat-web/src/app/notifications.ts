import type { IncomingMessage } from '@vendor/chat';

/** Счётчик непрочитанного в заголовке вкладки. */
export function applyTabCounter(unread: number): void {
  const base = document.title.replace(/^\(\d+\)\s*/, '');
  document.title = unread > 0 ? `(${unread}) ${base}` : base;
}

/**
 * Системное уведомление — только для фоновой вкладки и только при выданном
 * разрешении (design 1d). Активация открывает нужную комнату.
 */
export function raiseSystemNotification(message: IncomingMessage, onOpen: (roomId: string) => void): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;

  const notification = new Notification(message.roomName, {
    body: `${message.authorName}: ${message.body}`,
    tag: `room-${message.roomId}`,
  });

  notification.onclick = () => {
    window.focus();
    onOpen(message.roomId);
    notification.close();
  };
}
