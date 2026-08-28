import { AuthorizedImage } from '@vendor/ui';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Attachment } from '../../schemas/message';

interface AttachmentGalleryProps {
  /** Изображения одного сообщения в порядке вложений. */
  images: Attachment[];
  initialIndex: number;
  onClose: () => void;
}

/**
 * Галерея во весь экран: листание свайпом и стрелками, Esc закрывает.
 * Края не заворачиваются — за последним изображением пустоты нет. Лента под
 * галереей не размонтируется, поэтому закрытие возвращает на то же место.
 */
export function AttachmentGallery({ images, initialIndex, onClose }: AttachmentGalleryProps) {
  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), images.length - 1));
  const touchStartX = useRef<number | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const step = (delta: number) => {
    // Края галереи: дальше не листается (spec chat/attachments).
    setIndex((current) => Math.min(Math.max(current + delta, 0), images.length - 1));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    };

    window.addEventListener('keydown', onKeyDown);
    closeButton.current?.focus();

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const image = images[index];
  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Просмотр изображения ${image.name}`}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(10,10,14,.94)' }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        const end = event.changedTouches[0]?.clientX;
        if (start === null || end === undefined) return;

        // Свайп: влево — следующее, вправо — предыдущее.
        if (end - start < -40) step(1);
        if (end - start > 40) step(-1);
      }}
    >
      <div className="flex items-center justify-between p-3 safe-top">
        <span className="text-[13px] tnum" style={{ color: 'rgba(255,255,255,.8)' }} role="status">
          {index + 1} из {images.length}
        </span>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="Закрыть галерею"
          className="tap grid place-items-center"
          style={{ width: 38, height: 38, borderRadius: 19, background: 'rgba(255,255,255,.12)', color: '#fff' }}
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 grid place-items-center px-2 pb-4">
        {/* В галерее открывается оригинал — единственное место, где он нужен. */}
        <AuthorizedImage
          src={image.url}
          alt={image.name}
          className="max-w-full max-h-full object-contain"
          style={{ borderRadius: 6 }}
          // Без role="status": счётчик «N из M» в шапке уже занимает эту
          // роль, а два живых региона в одном окне сбивают чтение с экрана.
          fallback={
            <span className="text-[13px]" style={{ color: 'rgba(255,255,255,.7)' }}>
              Загружаем изображение…
            </span>
          }
        />

        {index > 0 ? (
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Предыдущее изображение"
            className="absolute left-2 tap grid place-items-center"
            style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,.12)', color: '#fff' }}
          >
            <ChevronLeft size={22} />
          </button>
        ) : null}

        {index < images.length - 1 ? (
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Следующее изображение"
            className="absolute right-2 tap grid place-items-center"
            style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,.12)', color: '#fff' }}
          >
            <ChevronRight size={22} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
