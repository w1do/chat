import { useEffect, useState } from 'react';

/**
 * Порог, ниже которого уменьшение вьюпорта — это панель браузера, а не
 * клавиатура. На iOS layout-вьюпорт выше визуального из-за адресной строки, и
 * без порога приложение считало бы клавиатуру открытой всегда — а значит
 * убирало бы нижний безопасный отступ и прятало панель ввода под системной
 * чертой.
 */
const KEYBOARD_MIN_PX = 120;

/**
 * Допуск сравнения масштаба с единицей: браузеры отдают дробные значения вроде
 * `1.0000001`, и строгое равенство давало бы ложные срабатывания.
 */
const ZOOM_EPSILON = 0.01;

/**
 * Паузы повторных измерений после возврата из фона. В момент разворачивания
 * браузер ещё двигает системные панели и убирает клавиатуру, поэтому одного
 * замера мало: меряем сразу, после кадра и ещё несколько раз с возрастающими
 * паузами примерно до секунды. Побеждает последнее измерение — оно снято по
 * устоявшейся геометрии.
 */
const RESUME_DELAYS_MS = [80, 200, 450, 1000];

export interface KeyboardInsets {
  height: number;
  keyboard: number;
  offsetTop: number;
}

/**
 * Геометрия видимой области: её высота, высота экранной клавиатуры и сдвиг
 * вьюпорта. Сдвиг нужен отдельно: iOS Safari при открытии клавиатуры сам
 * прокручивает документ, и без компенсации шапка уезжает за верхний край.
 *
 * Полоса браузера отдельным числом не нужна: оболочка задаёт себе высоту по
 * видимой области, то есть полоса уже вычтена. Закреплённому низу остаётся
 * только вырез устройства — его считает CSS по `env(safe-area-inset-bottom)`.
 *
 * Хук — единственный источник этой геометрии: масштаб страницы и возврат из
 * фона разбираются здесь, а экраны получают уже пригодные числа.
 */
export function useKeyboardInsets(): KeyboardInsets {
  const [state, setState] = useState<KeyboardInsets>({ height: 0, keyboard: 0, offsetTop: 0 });

  useEffect(() => {
    const viewport = window.visualViewport;
    let timers: ReturnType<typeof setTimeout>[] = [];
    let frame: number | null = null;

    const measure = () => {
      const visible = viewport?.height ?? window.innerHeight;
      // Увеличенная страница тоже уменьшает видимую область и получает сдвиг.
      // Без этой проверки масштаб принимался бы за открытую клавиатуру:
      // оболочка сжималась бы и уезжала, а панель ввода всплывала к середине
      // экрана. Браузеру без `scale` ничего не выдумываем — поведение
      // остаётся прежним.
      const zoomed = (viewport?.scale ?? 1) > 1 + ZOOM_EPSILON;
      const offsetTop = zoomed ? 0 : (viewport?.offsetTop ?? 0);
      const shrink = viewport && !zoomed ? Math.max(0, window.innerHeight - visible - offsetTop) : 0;
      const keyboard = shrink >= KEYBOARD_MIN_PX ? shrink : 0;
      // При увеличении видимая область — окошко, скользящее по layout-вьюпорту.
      // Оболочка стоит `position: fixed`, то есть меряется layout-вьюпортом, и
      // обязана покрывать его целиком: иначе под ней открывается пустота, а
      // панель ввода зависает посреди экрана. При обычном масштабе высота
      // остаётся по видимой области — полоса браузера из неё уже вычтена, и
      // вторая поправка на ту же полосу унесла бы панель ввода за нижний край.
      const height = zoomed ? Math.max(visible, window.innerHeight) : visible;

      // Серия перемеров после возврата не должна превращаться в серию
      // рендеров: состояние меняется, только если изменились сами числа.
      setState((current) =>
        current.height === height && current.keyboard === keyboard && current.offsetTop === offsetTop
          ? current
          : { height, keyboard, offsetTop },
      );
    };

    const clearPending = () => {
      for (const timer of timers) clearTimeout(timer);
      timers = [];

      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    };

    /** Возврат из фона: одного замера мало, см. `RESUME_DELAYS_MS`. */
    const remeasure = () => {
      clearPending();
      measure();

      frame = requestAnimationFrame(() => {
        frame = null;
        measure();
      });

      timers = RESUME_DELAYS_MS.map((delay) => setTimeout(measure, delay));
    };

    const onVisibilityChange = () => {
      if (!document.hidden) remeasure();
    };

    measure();
    viewport?.addEventListener('resize', measure);
    viewport?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    // Три события, потому что путей возврата несколько и дают они разное:
    // разворачивание из фона — `visibilitychange`, восстановление страницы из
    // кеша навигации — `pageshow`, а открытие по уведомлению (service worker
    // наводит уже запущенное окно) на iPhone может не дать ни того ни
    // другого — там срабатывает `focus`.
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', remeasure);
    window.addEventListener('focus', remeasure);

    return () => {
      viewport?.removeEventListener('resize', measure);
      viewport?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', remeasure);
      window.removeEventListener('focus', remeasure);
      clearPending();
    };
  }, []);

  return state;
}
