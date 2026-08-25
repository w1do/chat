import { RADIUS, overlayOnOwn, type ThemeTokens } from '@vendor/ui';
import { Download, FileText, ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { formatFileSize } from '../../format';
import type { Attachment } from '../../schemas/message';

/** Сколько плиток видно до «Показать ещё» (spec chat/attachments). */
export const VISIBLE_TILES = 4;

export const isImageAttachment = (attachment: Attachment): boolean =>
  attachment.mime_type.startsWith('image/');

interface MessageAttachmentsProps {
  attachments: Attachment[];
  own: boolean;
  theme: ThemeTokens;
  fontSize: number;
  /** Открытие галереи с выбранного изображения. */
  onOpenImage: (attachmentId: string) => void;
}

/**
 * Вложения в сообщении: одно изображение — крупно, два-четыре — сеткой,
 * больше — четыре плитки и «Показать ещё». Плитки грузят миниатюры, а не
 * оригиналы; пока миниатюра готовится, стоит состояние ожидания.
 * Не-изображения — строкой с именем, размером и скачиванием.
 */
export function MessageAttachments({ attachments, own, theme, fontSize, onOpenImage }: MessageAttachmentsProps) {
  const [expanded, setExpanded] = useState(false);
  const images = attachments.filter(isImageAttachment);
  const files = attachments.filter((attachment) => !isImageAttachment(attachment));

  const hiddenCount = images.length - VISIBLE_TILES;
  const visibleImages = expanded || hiddenCount <= 0 ? images : images.slice(0, VISIBLE_TILES);

  return (
    <div className="flex flex-col gap-1" style={{ minWidth: images.length > 0 ? 200 : undefined }}>
      {images.length === 1 ? (
        <ImageTile image={images[0]!} single theme={theme} onOpen={onOpenImage} />
      ) : images.length > 1 ? (
        <div className="grid grid-cols-2 gap-1">
          {visibleImages.map((image, index) => (
            <ImageTile
              key={image.id}
              image={image}
              theme={theme}
              onOpen={onOpenImage}
              more={!expanded && hiddenCount > 0 && index === VISIBLE_TILES - 1 ? hiddenCount : 0}
              onShowMore={() => setExpanded(true)}
            />
          ))}
        </div>
      ) : null}

      {files.map((file) => (
        <a
          key={file.id}
          href={file.url}
          download={file.name}
          aria-label={`Скачать ${file.name}`}
          className="flex items-center gap-2 px-2 py-1.5 tap no-underline"
          style={{
            background: own ? overlayOnOwn(theme) : theme.surfaceAlt,
            borderRadius: 10,
            color: own ? theme.ownText : theme.text,
          }}
        >
          <FileText size={18} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate" style={{ fontSize: Math.min(fontSize, 14.5), fontWeight: 500 }}>
              {file.name}
            </span>
            <span className="block text-[11.5px] tnum" style={{ opacity: 0.75 }}>
              {formatFileSize(file.size)}
            </span>
          </span>
          <Download size={16} className="shrink-0" aria-hidden="true" style={{ opacity: 0.85 }} />
        </a>
      ))}
    </div>
  );
}

function ImageTile({
  image,
  theme,
  onOpen,
  single = false,
  more = 0,
  onShowMore,
}: {
  image: Attachment;
  theme: ThemeTokens;
  onOpen: (attachmentId: string) => void;
  single?: boolean;
  more?: number;
  onShowMore?: () => void;
}) {
  // Пропорции известны из контракта: плитка не прыгает при загрузке.
  const ratio = single && image.width && image.height ? `${image.width} / ${image.height}` : '1 / 1';

  return (
    <div className="relative" style={{ aspectRatio: ratio, maxHeight: single ? 320 : undefined }}>
      <button
        type="button"
        onClick={() => onOpen(image.id)}
        aria-label={`Открыть изображение ${image.name}`}
        className="tap w-full h-full overflow-hidden block"
        style={{ borderRadius: RADIUS.sm, background: theme.surfaceAlt }}
      >
        {image.thumb_url !== null ? (
          // Лента грузит миниатюру; оригинал — только в галерее (spec).
          <img src={image.thumb_url} alt={image.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span
            data-testid="attachment-waiting"
            role="status"
            aria-label={`${image.name}: миниатюра готовится`}
            className="grid place-items-center w-full h-full animate-pulse"
            style={{ color: theme.faint }}
          >
            <ImageIcon size={26} aria-hidden="true" />
          </span>
        )}
      </button>

      {more > 0 ? (
        <button
          type="button"
          onClick={onShowMore}
          className="absolute inset-0 grid place-items-center tap"
          style={{ background: 'rgba(20,19,26,.55)', color: '#fff', borderRadius: RADIUS.sm }}
        >
          <span className="text-[15px] font-semibold">+{more}</span>
          <span className="text-[12px]">Показать ещё</span>
        </button>
      ) : null}
    </div>
  );
}
