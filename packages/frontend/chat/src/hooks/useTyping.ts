import { useRef } from 'react';
import { useChatClient } from '../adapters/ChatProvider';

/** Отправка сигнала набора с троттлингом; остановка — при отправке сообщения. */
export function useTyping(roomId: string, throttleMs = 3000) {
  const client = useChatClient();
  const lastSent = useRef(0);

  return {
    notifyTyping: () => {
      const now = Date.now();
      if (now - lastSent.current < throttleMs) return;
      lastSent.current = now;
      void client.post(`/rooms/${roomId}/typing`, { body: { is_typing: true } }).catch(() => {});
    },
    stopTyping: () => {
      lastSent.current = 0;
      void client.post(`/rooms/${roomId}/typing`, { body: { is_typing: false } }).catch(() => {});
    },
  };
}
