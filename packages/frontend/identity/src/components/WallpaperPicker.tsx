import { RADIUS, type ThemeTokens } from '@vendor/ui';
import { useRef, useState } from 'react';

interface WallpaperPickerProps {
  currentUrl: string | null;
  theme: ThemeTokens;
  onUpload: (file: File) => Promise<unknown>;
  onClear: () => Promise<unknown>;
}

/**
 * Обои переписки — личная настройка: их видит только тот, кто поставил.
 * Собеседник в той же комнате видит свой фон.
 */
export function WallpaperPicker({ currentUrl, theme, onUpload, onClear }: WallpaperPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Обои" className="px-3 mb-5">
      <div className="p-3 flex flex-col gap-3" style={{ background: theme.surface, borderRadius: RADIUS.md }}>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="shrink-0"
            style={{
              width: 46,
              height: 64,
              borderRadius: RADIUS.sm,
              background: currentUrl ? `center / cover no-repeat url(${currentUrl})` : theme.surfaceAlt,
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[15px]" style={{ color: theme.text }}>
              {currentUrl ? 'Ваши обои' : 'Обычный фон'}
            </p>
            <p className="text-[13px] mt-0.5" style={{ color: theme.muted }}>
              Обои видите только вы — у собеседника свой фон.
            </p>
          </div>
        </div>

        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Файл обоев"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void run(() => onUpload(file), 'Не удалось поставить обои.');
          }}
        />

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="flex-1 py-2.5 tap text-[15px] font-medium"
            style={{ background: theme.text, color: theme.bg, borderRadius: RADIUS.sm, opacity: busy ? 0.6 : 1 }}
          >
            Выбрать обои
          </button>
          {currentUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(onClear, 'Не удалось убрать обои.')}
              className="flex-1 py-2.5 tap text-[15px]"
              style={{ background: theme.surfaceAlt, color: theme.text, borderRadius: RADIUS.sm }}
            >
              Обычный фон
            </button>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="text-[13px]" style={{ color: theme.danger }}>
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
