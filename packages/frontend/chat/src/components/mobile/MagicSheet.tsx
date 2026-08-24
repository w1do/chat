import { RADIUS, Sheet, type ThemeTokens } from '@vendor/ui';
import { Sparkles } from 'lucide-react';

/** Действия помощника над черновиком (этап 10 roadmap: /ai/message-revisions). */
export const MAGIC_ACTIONS = [
  { id: 'improve', label: 'Понятнее', hint: 'Та же мысль, но яснее' },
  { id: 'shorten', label: 'Короче', hint: 'Убрать лишние слова' },
  { id: 'expand', label: 'Подробнее', hint: 'Добавить деталей' },
  { id: 'soften', label: 'Мягче', hint: 'Без резкости' },
  { id: 'grammar', label: 'Исправить', hint: 'Орфография и запятые' },
] as const;

export type MagicAction = (typeof MAGIC_ACTIONS)[number]['id'];
export type MagicPhase = 'menu' | 'loading' | 'preview' | 'error' | 'unavailable';

interface MagicSheetProps {
  open: boolean;
  phase: MagicPhase;
  action: MagicAction | null;
  original: string;
  suggestion: string | null;
  error: string | null;
  theme: ThemeTokens;
  onRun: (action: MagicAction) => void;
  onApply: () => void;
  onClose: () => void;
}

export function MagicSheet({
  open,
  phase,
  action,
  original,
  suggestion,
  error,
  theme,
  onRun,
  onApply,
  onClose,
}: MagicSheetProps) {
  const meta = MAGIC_ACTIONS.find((item) => item.id === action);

  const title =
    phase === 'unavailable'
      ? 'Помощник выключен'
      : phase === 'menu'
        ? 'Помощник'
        : phase === 'loading'
          ? 'Подбираю слова'
          : phase === 'error'
            ? 'Не получилось'
            : (meta?.label ?? 'Помощник');

  const subtitle =
    phase === 'unavailable'
      ? 'Администратор может включить его в настройках сервера'
      : phase === 'menu'
        ? 'Поправит черновик, а отправите вы'
        : phase === 'preview'
          ? 'Сравните и решите'
          : undefined;

  return (
    <Sheet open={open} title={title} subtitle={subtitle} onClose={onClose} theme={theme} accent={theme.amberText}>
      {phase === 'unavailable' ? (
        <p className="px-5 pb-6 text-[15px]" style={{ color: theme.muted }}>
          Обработка текста внешним ИИ отключена на этом сервере. Сообщения отправляются как обычно.
        </p>
      ) : null}

      {phase === 'menu' ? (
        <div className="px-3 pb-4">
          {MAGIC_ACTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onRun(item.id)}
              className="w-full flex items-center gap-3 px-3 py-3 text-left tap"
              style={{ borderBottom: `1px solid ${theme.hairline}` }}
            >
              <span
                aria-hidden="true"
                className="grid place-items-center shrink-0"
                style={{ width: 32, height: 32, borderRadius: 16, background: theme.amberSoft, color: theme.amberText }}
              >
                <Sparkles size={16} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[16px]" style={{ color: theme.text }}>
                  {item.label}
                </span>
                <span className="block text-[13px] mt-0.5" style={{ color: theme.muted }}>
                  {item.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {phase === 'loading' ? (
        <p aria-busy="true" className="px-5 pb-6 text-[15px]" style={{ color: theme.muted }}>
          Текст обрабатывается внешним ИИ…
        </p>
      ) : null}

      {phase === 'error' ? (
        <p role="alert" className="px-5 pb-6 text-[15px]" style={{ color: theme.danger }}>
          {error ?? 'Помощник недоступен. Сообщение можно отправить как есть.'}
        </p>
      ) : null}

      {phase === 'preview' && suggestion !== null ? (
        <div className="px-4 pb-5">
          <p className="text-[12px] uppercase mb-1" style={{ color: theme.muted, letterSpacing: '0.07em' }}>
            Было
          </p>
          <p className="text-[15px] mb-3 px-3 py-2" style={{ background: theme.surfaceAlt, borderRadius: RADIUS.sm, color: theme.muted }}>
            {original}
          </p>
          <p className="text-[12px] uppercase mb-1" style={{ color: theme.amberText, letterSpacing: '0.07em' }}>
            Стало
          </p>
          <p className="text-[15px] mb-4 px-3 py-2" style={{ background: theme.amberSoft, borderRadius: RADIUS.sm, color: theme.text }}>
            {suggestion}
          </p>
          <p className="text-[12px] mb-3" style={{ color: theme.muted }}>
            Текст обработан внешним ИИ. Решение за вами.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onApply}
              className="flex-1 py-2.5 tap text-[15px] font-medium"
              style={{ background: theme.text, color: theme.bg, borderRadius: RADIUS.sm }}
            >
              Заменить черновик
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 tap text-[15px]"
              style={{ background: theme.surfaceAlt, color: theme.muted, borderRadius: RADIUS.sm }}
            >
              Оставить своё
            </button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
