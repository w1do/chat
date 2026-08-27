import { isApiError } from '@vendor/api-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { aiApi } from '../api';
import { useChatClient } from '../adapters/ChatProvider';
import type { RealtimeAdapter } from '../adapters/RealtimeAdapter';
import type { FileSummary, FileSummaryError } from '../schemas/fileSummary';

export type FileSummaryPhase = 'idle' | 'working' | 'draft' | 'publishing' | 'error';

export interface FileSummaryState {
  phase: FileSummaryPhase;
  /** Ход выполнения 0–100: показывается полосой над лентой. */
  progress: number;
  summary: FileSummary | null;
  /** Имя документа известно до готовности пересказа — им подписан индикатор. */
  fileName: string | null;
  error: string | null;
}

const IDLE: FileSummaryState = { phase: 'idle', progress: 0, summary: null, fileName: null, error: null };

/** Сколько ждём готовности, опрашивая HTTP, если события не пришли. */
const POLL_INTERVAL_MS = 2500;
const POLL_LIMIT_MS = 180_000;

const ERROR_TEXT: Record<FileSummaryError, string> = {
  provider_timeout: 'Помощник не успел прочитать документ. Попробуйте ещё раз чуть позже.',
  provider_unavailable: 'Помощник сейчас недоступен. Переписка работает как обычно.',
  file_unreadable: 'В этом документе нет текста, который можно прочитать.',
  ai_disabled: 'Обработка документов внешним ИИ отключена на этом сервере.',
};

/**
 * Пересказ приложенного документа: запуск, ожидание и публикация.
 * Событие с личного канала приходит первым, но состояние всегда
 * подтверждается запросом — после переподключения ничего не теряется
 * (spec ai/file-summary: HTTP resync).
 */
export function useFileSummary(
  adapter: RealtimeAdapter | null,
  currentUserId: string,
): {
  state: FileSummaryState;
  run: (input: { messageId: string; body: string; fileName: string }) => Promise<void>;
  publish: () => Promise<boolean>;
  dismiss: () => void;
} {
  const client = useChatClient();
  const [state, setState] = useState<FileSummaryState>(IDLE);
  const operation = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);

  const stopPolling = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const apply = useCallback(
    (summary: FileSummary) => {
      if (summary.id !== operation.current) return;

      if (summary.status === 'succeeded' || summary.status === 'published') {
        stopPolling();
        setState({ phase: 'draft', progress: 100, summary, fileName: summary.file.name, error: null });

        return;
      }

      if (summary.status === 'failed') {
        stopPolling();
        setState({
          phase: 'error',
          progress: 100,
          summary,
          fileName: summary.file.name,
          error: ERROR_TEXT[summary.error_code ?? 'provider_unavailable'],
        });

        return;
      }

      setState((current) => ({
        ...current,
        phase: 'working',
        progress: summary.status === 'processing' ? 50 : 10,
        fileName: summary.file.name,
      }));
    },
    [stopPolling],
  );

  /** Опрос — страховка: она же единственный путь без WebSocket. */
  const poll = useCallback(() => {
    stopPolling();

    timer.current = setTimeout(() => {
      const id = operation.current;
      if (id === null) return;

      if (Date.now() - startedAt.current > POLL_LIMIT_MS) {
        setState((current) => ({
          ...current,
          phase: 'error',
          error: ERROR_TEXT.provider_timeout,
        }));

        return;
      }

      void aiApi
        .fileSummary(client, id)
        .then((summary) => {
          apply(summary);
          if (summary.status === 'pending' || summary.status === 'processing') poll();
        })
        .catch(() => poll());
    }, POLL_INTERVAL_MS);
  }, [apply, client, stopPolling]);

  // Личный канал: событие ускоряет реакцию, но не заменяет запрос состояния.
  useEffect(() => {
    if (!adapter?.subscribeUser || currentUserId === '') return;

    const subscription = adapter.subscribeUser(currentUserId, (event) => {
      if (event.event !== 'ai.file_summary.updated.v1' || event.data.id !== operation.current) return;

      if (event.data.status === 'pending' || event.data.status === 'processing') {
        setState((current) => ({ ...current, phase: 'working', progress: event.data.progress }));

        return;
      }

      void aiApi.fileSummary(client, event.data.id).then(apply).catch(() => undefined);
    });

    return () => subscription.unsubscribe();
  }, [adapter, apply, client, currentUserId]);

  useEffect(() => stopPolling, [stopPolling]);

  const run = useCallback(
    async ({ messageId, body, fileName }: { messageId: string; body: string; fileName: string }) => {
      stopPolling();
      operation.current = null;
      startedAt.current = Date.now();
      setState({ phase: 'working', progress: 5, summary: null, fileName, error: null });

      try {
        const summary = await aiApi.summarizeFile(client, { message_id: messageId, body });
        operation.current = summary.id;
        apply(summary);
        poll();
      } catch (error) {
        operation.current = null;
        setState({
          phase: 'error',
          progress: 0,
          summary: null,
          fileName,
          error: summaryRequestError(error),
        });
      }
    },
    [apply, client, poll, stopPolling],
  );

  const publish = useCallback(async (): Promise<boolean> => {
    const id = operation.current;
    if (id === null) return false;

    setState((current) => ({ ...current, phase: 'publishing' }));

    try {
      await aiApi.publishFileSummary(client, id);
      operation.current = null;
      stopPolling();
      setState(IDLE);

      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        phase: 'error',
        error: isApiError(error) && error.status === 409
          ? 'Этот пересказ уже опубликован или больше не действителен.'
          : 'Не удалось отправить пересказ в чат. Попробуйте ещё раз.',
      }));

      return false;
    }
  }, [client, stopPolling]);

  const dismiss = useCallback(() => {
    stopPolling();
    operation.current = null;
    setState(IDLE);
  }, [stopPolling]);

  return { state, run, publish, dismiss };
}

/** Отказ на запуске: код ответа объясняется словами, а не пустотой. */
function summaryRequestError(error: unknown): string {
  if (!isApiError(error)) return 'Помощник не отвечает. Сообщение можно отправить как есть.';

  if (error.status === 503) return ERROR_TEXT.ai_disabled;
  if (error.status === 429) return 'Слишком много обращений к помощнику. Попробуйте чуть позже.';
  if (error.status === 403 || error.status === 404) return 'Этот документ недоступен помощнику.';
  if (error.status === 422) return 'Помощник пересказывает только документы: .pdf, .docx или .txt.';

  return 'Помощник не смог прочитать документ.';
}
