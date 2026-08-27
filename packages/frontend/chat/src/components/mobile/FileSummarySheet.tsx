import { RADIUS, Sheet, type ThemeTokens } from '@vendor/ui';
import { FileText } from 'lucide-react';
import type { FileSummaryPhase, FileSummaryState } from '../../hooks/useFileSummary';

interface FileSummarySheetProps {
  state: FileSummaryState;
  theme: ThemeTokens;
  onPublish: () => void;
  onClose: () => void;
}

const TITLE: Record<FileSummaryPhase, string> = {
  idle: '',
  working: 'Читаю документ',
  draft: 'Вот что:',
  publishing: 'Отправляю',
  error: 'Не получилось',
};

/**
 * Черновик пересказа: его видит только тот, кто позвал помощника, и в чат
 * он попадает лишь по кнопке «Отправить» (spec ai/file-summary).
 */
export function FileSummarySheet({ state, theme, onPublish, onClose }: FileSummarySheetProps) {
  const open = state.phase !== 'idle';

  return (
    <Sheet
      open={open}
      title={TITLE[state.phase]}
      subtitle={state.fileName ?? undefined}
      onClose={onClose}
      theme={theme}
      accent={theme.amberText}
    >
      {state.phase === 'working' ? (
        <div className="px-5 pb-6">
          <p aria-busy="true" role="status" className="text-[15px]" style={{ color: theme.muted }}>
            Документ обрабатывается внешним ИИ…
          </p>
          <div
            aria-hidden="true"
            className="mt-3 overflow-hidden"
            style={{ height: 4, borderRadius: 2, background: theme.surfaceAlt }}
          >
            <div
              style={{
                width: `${Math.max(5, state.progress)}%`,
                height: '100%',
                background: theme.amberText,
                transition: 'width .4s ease',
              }}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 px-4 py-2 tap text-[15px]"
            style={{ background: theme.surfaceAlt, color: theme.text, borderRadius: RADIUS.sm }}
          >
            Скрыть
          </button>
        </div>
      ) : null}

      {state.phase === 'error' ? (
        <div className="px-5 pb-6">
          <p role="alert" className="text-[15px]" style={{ color: theme.danger }}>
            {state.error ?? 'Помощник недоступен. Переписка работает как обычно.'}
          </p>
          {/* Не «Закрыть»: тем же словом подписан крестик листа, и две
              одинаковые кнопки читаются как одна и та же. */}
          <button
            type="button"
            onClick={onClose}
            className="mt-4 px-4 py-2 tap text-[15px]"
            style={{ background: theme.surfaceAlt, color: theme.text, borderRadius: RADIUS.sm }}
          >
            Понятно
          </button>
        </div>
      ) : null}

      {(state.phase === 'draft' || state.phase === 'publishing') && state.summary?.summary ? (
        <div className="px-4 pb-5">
          <p className="flex items-center gap-2 text-[13px] mb-2" style={{ color: theme.muted }}>
            <FileText size={14} aria-hidden="true" />
            {state.summary.file.name}
          </p>

          <p
            data-testid="file-summary-draft"
            className="text-[15px] mb-4 px-3 py-2.5 whitespace-pre-line"
            style={{ background: theme.amberSoft, borderRadius: RADIUS.sm, color: theme.text, lineHeight: 1.45 }}
          >
            {state.summary.summary}
          </p>

          <p className="text-[12px] mb-3" style={{ color: theme.muted }}>
            Документ прочитан внешним ИИ. Пересказ увидите только вы — в чат он попадёт, если отправите.
          </p>

          <p className="text-[15px] mb-2" style={{ color: theme.text }}>
            Отправить пересказ в чат?
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPublish}
              disabled={state.phase === 'publishing'}
              className="flex-1 py-2.5 tap text-[15px] font-medium"
              style={{
                background: theme.text,
                color: theme.bg,
                borderRadius: RADIUS.sm,
                opacity: state.phase === 'publishing' ? 0.6 : 1,
              }}
            >
              {state.phase === 'publishing' ? 'Отправляю…' : 'Отправить'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 tap text-[15px]"
              style={{ background: theme.surfaceAlt, color: theme.muted, borderRadius: RADIUS.sm }}
            >
              Не отправлять
            </button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
