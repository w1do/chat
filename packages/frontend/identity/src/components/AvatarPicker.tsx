import { AuthorizedImage, Avatar, RADIUS, type ThemeTokens } from '@vendor/ui';
import { useRef, useState } from 'react';
import type { ProfileImage } from '../api';

interface AvatarPickerProps {
  /** Кто выбирает — для оттенка буквы, когда аватарки нет. */
  userId: string;
  name: string;
  avatars: ProfileImage[];
  currentUrl: string | null;
  theme: ThemeTokens;
  onUpload: (file: File) => Promise<unknown>;
  onSelect: (avatarId: string) => Promise<unknown>;
  onDelete: (avatarId: string) => Promise<unknown>;
  onClear: () => Promise<unknown>;
}

/**
 * Аватарки человека: загруженные копятся, и из них выбирается та, что
 * показывается сейчас. Набор виден только владельцу — чужие прежние
 * аватарки не показываются нигде.
 */
export function AvatarPicker({
  userId,
  name,
  avatars,
  currentUrl,
  theme,
  onUpload,
  onSelect,
  onDelete,
  onClear,
}: AvatarPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      // Заполненный набор — не поломка, а понятное правило: показываем его
      // словами сервера, если они есть.
      const message = cause instanceof Error && cause.message ? cause.message : failure;
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Аватарка" className="px-3 mb-5">
      <div className="p-3 flex flex-col gap-3" style={{ background: theme.surface, borderRadius: RADIUS.md }}>
        <div className="flex items-center gap-3">
          <Avatar userId={userId} name={name} src={currentUrl} size={64} theme={theme} />
          <div className="flex-1 min-w-0">
            <p className="text-[15px]" style={{ color: theme.text }}>
              {currentUrl ? 'Ваша аватарка' : 'Аватарки пока нет'}
            </p>
            <p className="text-[13px] mt-0.5" style={{ color: theme.muted }}>
              {currentUrl ? 'Её видят в списках и в переписке.' : 'Пока показывается буква имени.'}
            </p>
          </div>
        </div>

        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Файл аватарки"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void run(() => onUpload(file), 'Не удалось загрузить аватарку.');
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
            Загрузить
          </button>
          {currentUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(onClear, 'Не удалось снять аватарку.')}
              className="flex-1 py-2.5 tap text-[15px]"
              style={{ background: theme.surfaceAlt, color: theme.text, borderRadius: RADIUS.sm }}
            >
              Снять
            </button>
          ) : null}
        </div>

        {avatars.length > 0 ? (
          <>
            <p className="text-[13px]" style={{ color: theme.muted }}>
              Загруженные — выберите, какую показывать.
            </p>
            <ul className="flex flex-wrap gap-2">
              {avatars.map((avatar) => (
                <li key={avatar.id} className="relative">
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Показывать эту аватарку${avatar.current ? ' (показывается)' : ''}`}
                    aria-pressed={Boolean(avatar.current)}
                    onClick={() => void run(() => onSelect(avatar.id), 'Не удалось выбрать аватарку.')}
                    className="block tap"
                    style={{
                      borderRadius: RADIUS.sm,
                      boxShadow: avatar.current ? `0 0 0 2.5px ${theme.text}` : 'none',
                    }}
                  >
                    <AuthorizedImage
                      src={avatar.thumb_url ?? avatar.url}
                      alt=""
                      width={56}
                      height={56}
                      className="object-cover"
                      style={{ width: 56, height: 56, borderRadius: RADIUS.sm, background: theme.surfaceAlt }}
                      fallback={
                        <span
                          aria-hidden="true"
                          style={{
                            display: 'block',
                            width: 56,
                            height: 56,
                            borderRadius: RADIUS.sm,
                            background: theme.surfaceAlt,
                          }}
                        />
                      }
                    />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Удалить эту аватарку"
                    onClick={() => void run(() => onDelete(avatar.id), 'Не удалось удалить аватарку.')}
                    className="absolute grid place-items-center tap"
                    style={{
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      background: theme.surfaceAlt,
                      color: theme.danger,
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {error ? (
          <p role="alert" className="text-[13px]" style={{ color: theme.danger }}>
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
