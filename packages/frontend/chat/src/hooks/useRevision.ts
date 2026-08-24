import { isApiError } from '@vendor/api-client';
import { useCallback, useRef, useState } from 'react';
import { aiApi } from '../api';
import { useChatClient } from '../adapters/ChatProvider';
import type { RevisionOperation, RevisionRequest } from '../schemas/revision';

export type RevisionPhase = 'idle' | 'loading' | 'preview' | 'error';

export interface RevisionState {
  phase: RevisionPhase;
  operation: RevisionOperation | null;
  suggestion: string | null;
  error: string | null;
}

const IDLE: RevisionState = { phase: 'idle', operation: null, suggestion: null, error: null };

/**
 * Запрос к помощнику: результат — предложение, применяет его пользователь.
 * Ожидание можно отменить, ошибка не мешает отправить исходный текст.
 */
export function useRevision(): {
  state: RevisionState;
  run: (input: RevisionRequest) => Promise<void>;
  cancel: () => void;
  reset: () => void;
} {
  const client = useChatClient();
  const [state, setState] = useState<RevisionState>(IDLE);
  const controller = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setState(IDLE);
  }, []);

  const run = useCallback(
    async (input: RevisionRequest) => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;

      setState({ phase: 'loading', operation: input.operation, suggestion: null, error: null });

      try {
        const revision = await aiApi.revise(client, input, abort.signal);
        setState({ phase: 'preview', operation: input.operation, suggestion: revision.suggestion, error: null });
      } catch (error) {
        if (abort.signal.aborted) return;

        const message = isApiError(error)
          ? error.status === 503
            ? 'Помощник сейчас недоступен. Сообщение можно отправить как есть.'
            : error.status === 429
              ? 'Слишком много обращений к помощнику. Попробуйте чуть позже.'
              : 'Помощник не смог обработать текст.'
          : 'Помощник не отвечает. Сообщение можно отправить как есть.';

        setState({ phase: 'error', operation: input.operation, suggestion: null, error: message });
      } finally {
        if (controller.current === abort) controller.current = null;
      }
    },
    [client],
  );

  return { state, run, cancel, reset: () => setState(IDLE) };
}
