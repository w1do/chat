/* ============================================================================
   useKeyboardInsets — клавиатура iOS и безопасные зоны
   Веб-версия (Safari на iPhone, PWA, WKWebView).

   Что чинит:
     · при фокусе в поле Safari прокручивает страницу и уводит шапку вверх;
     · 100vh не учитывает клавиатуру и нижнюю панель Safari;
     · шрифт меньше 16px заставляет iOS зумить экран при фокусе;
     · без viewport-fit=cover env(safe-area-inset-*) всегда равен нулю.

   Как пользоваться:

     const { height, keyboard } = useKeyboardInsets();

     <div style={{ height: height ? `${height}px` : '100dvh', overflow: 'hidden' }}>
       <header className="safe-top">…</header>
       <main className="flex-1 overflow-y-auto scroll-area">…</main>
       <footer className={keyboard > 0 ? 'pb-2' : 'safe-bottom'}>поле ввода</footer>
     </div>

   Нужные CSS-классы:

     .safe-top    { padding-top:    calc(env(safe-area-inset-top, 0px)    + 12px); }
     .safe-bottom { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); }
     .scroll-area { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }

   В React Native тот же результат даёт react-native-keyboard-controller
   (KeyboardAvoidingView / useKeyboardHandler) вместе с
   react-native-safe-area-context: <SafeAreaView edges={['top','bottom']}>.
   ========================================================================== */

import { useEffect, useState } from 'react';

export interface KeyboardInsets {
  /** Высота видимой области в px. null — до первого замера. */
  height: number | null;
  /** Сколько пикселей окна перекрыто клавиатурой. 0 — клавиатура закрыта. */
  keyboard: number;
}

/** Минимальный размер шрифта в полях ввода: ниже — iOS зумит страницу. */
export const MIN_INPUT_FONT = 16;

const VIEWPORT_META =
  'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content';

export function useKeyboardInsets(): KeyboardInsets {
  const [state, setState] = useState<KeyboardInsets>({ height: null, keyboard: 0 });

  useEffect(() => {
    /* 1. viewport-fit=cover — иначе env(safe-area-inset-*) вернёт 0 */
    let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    const prevMeta = meta.content;
    meta.content = VIEWPORT_META;

    /* 2. Документ не должен прокручиваться — двигается только лента сообщений */
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlHeight: html.style.height,
      height: body.style.height,
      overflow: body.style.overflow,
      position: body.style.position,
      width: body.style.width,
      overscroll: body.style.overscrollBehavior,
    };
    html.style.height = '100%';
    body.style.height = '100%';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.width = '100%';
    body.style.overscrollBehavior = 'none';

    /* 3. Следим за видимой областью */
    const vv = window.visualViewport;

    const sync = () => {
      if (!vv) {
        setState({ height: window.innerHeight, keyboard: 0 });
        return;
      }
      const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setState({ height: vv.height, keyboard });
      // iOS всё равно подтягивает страницу вверх — отматываем обратно
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    sync();
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('orientationchange', sync);

    return () => {
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('orientationchange', sync);
      meta!.content = prevMeta;
      html.style.height = prev.htmlHeight;
      body.style.height = prev.height;
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.width = prev.width;
      body.style.overscrollBehavior = prev.overscroll;
    };
  }, []);

  return state;
}
