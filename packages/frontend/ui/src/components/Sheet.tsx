import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RADIUS, SPRING, type ThemeTokens } from '../styles/tokens';

// Столько же длится transform панели ниже.
const CLOSE_ANIMATION_MS = 420;

interface SheetProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  theme: ThemeTokens;
  accent?: string;
  children: ReactNode;
}

/** Выезжающий лист: им сделаны и помощник, и все настройки. */
export function Sheet({ open, title, subtitle, onClose, theme, accent, children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);

  // Содержимое живёт только у открытого листа (и ещё мгновение, пока он
  // уезжает). Иначе поля закрытых листов остаются в DOM: их видит менеджер
  // паролей браузера и до них доходит табуляция.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);

      return;
    }

    const timer = setTimeout(() => setMounted(false), CLOSE_ANIMATION_MS);

    return () => clearTimeout(timer);
  }, [open]);

  // Escape закрывает лист; фокус уходит внутрь при открытии.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    panel.current?.focus();

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className="absolute inset-0 z-40 overflow-hidden"
      style={{
        pointerEvents: open ? 'auto' : 'none',
        // Закрытый лист уезжает вниз — его нужно обрезать по слою, иначе шапка
        // торчит из-под края экрана; полностью убранный лист ещё и скрываем,
        // чтобы он не попадал в поиск по странице и в порядок табуляции.
        visibility: open || mounted ? 'visible' : 'hidden',
      }}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: 'rgba(10,10,14,.44)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          transition: 'opacity .3s ease',
        }}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal={open}
        aria-label={title}
        tabIndex={-1}
        className="absolute left-0 right-0 bottom-0 flex flex-col outline-none"
        style={{
          background: theme.surface,
          borderTopLeftRadius: RADIUS.sheet,
          borderTopRightRadius: RADIUS.sheet,
          transform: open ? 'translateY(0)' : 'translateY(103%)',
          transition: `transform .42s ${SPRING}`,
          maxHeight: '88%',
          boxShadow: '0 -20px 60px rgba(0,0,0,.28)',
        }}
      >
        <div className="flex justify-center pt-2.5 pb-1.5">
          <span aria-hidden="true" style={{ width: 38, height: 4, borderRadius: 2, background: theme.hairline }} />
        </div>
        <div className="flex items-start gap-3 px-5 pt-1 pb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-[19px] font-semibold" style={{ color: accent ?? theme.text, letterSpacing: '-0.02em' }}>
              {title}
            </h2>
            {subtitle ? (
              <p className="text-[13px] mt-0.5" style={{ color: theme.muted }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="tap shrink-0"
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              background: theme.surfaceAlt,
              color: theme.muted,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scroll-area safe-bottom">{mounted ? children : null}</div>
      </div>
    </div>
  );
}
