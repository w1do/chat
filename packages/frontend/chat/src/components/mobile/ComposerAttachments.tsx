import { RADIUS, type ThemeTokens } from '@vendor/ui';
import { FileText, Loader2, RotateCcw, X } from 'lucide-react';
import { formatFileSize } from '../../format';
import type { PendingAttachment } from '../../hooks/useAttachmentUploads';

interface ComposerAttachmentsProps {
  items: PendingAttachment[];
  theme: ThemeTokens;
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
}

/**
 * Выбранные файлы до отправки: плитки с ходом загрузки и ошибкой по каждому
 * файлу отдельно. Лишний снимается крестиком, неудавшийся повторяется.
 */
export function ComposerAttachments({ items, theme, onRemove, onRetry }: ComposerAttachmentsProps) {
  if (items.length === 0) return null;

  return (
    <ul aria-label="Файлы к отправке" className="flex gap-2 mb-2 px-1 overflow-x-auto list-none">
      {items.map((item) => (
        <li
          key={item.localId}
          data-testid="composer-attachment"
          data-status={item.status}
          className="relative shrink-0"
          style={{ width: 64 }}
        >
          <div
            className="grid place-items-center overflow-hidden"
            style={{
              width: 64,
              height: 64,
              borderRadius: RADIUS.sm,
              background: theme.surfaceAlt,
              boxShadow: item.status === 'error' ? `0 0 0 2px ${theme.danger}` : 'none',
            }}
          >
            {item.previewUrl ? (
              <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <span className="grid place-items-center gap-0.5 text-center" style={{ color: theme.muted }}>
                <FileText size={20} aria-hidden="true" />
              </span>
            )}

            {item.status === 'uploading' ? (
              <span
                role="status"
                aria-label={`${item.name}: загружается`}
                className="absolute inset-0 grid place-items-center"
                style={{ background: 'rgba(20,19,26,.45)', color: '#fff', borderRadius: RADIUS.sm }}
              >
                <Loader2 size={20} className="animate-spin" />
              </span>
            ) : null}

            {item.status === 'error' ? (
              <button
                type="button"
                onClick={() => onRetry(item.localId)}
                aria-label={`Повторить загрузку ${item.name}`}
                className="absolute inset-0 grid place-items-center tap"
                style={{ background: 'rgba(20,19,26,.55)', color: '#fff', borderRadius: RADIUS.sm }}
              >
                <RotateCcw size={18} />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => onRemove(item.localId)}
            aria-label={`Убрать файл ${item.name}`}
            className="absolute grid place-items-center tap"
            style={{
              top: -6,
              right: -6,
              width: 20,
              height: 20,
              borderRadius: 10,
              background: theme.text,
              color: theme.bg,
            }}
          >
            <X size={12} />
          </button>

          <span className="block truncate text-[10.5px] mt-0.5" style={{ color: theme.muted }} title={item.name}>
            {item.name}
          </span>
          {item.error ? (
            <span role="alert" className="block text-[10.5px] leading-tight" style={{ color: theme.danger }}>
              {item.error}
            </span>
          ) : (
            <span className="block text-[10.5px] tnum" style={{ color: theme.faint }}>
              {formatFileSize(item.size)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
