import { useEffect, useState } from 'react';

/**
 * Подписка на медиавыражение. Раскладку выбираем по размеру окна, а не по
 * user-agent: он врёт на планшетах и в режиме рабочего стола браузера.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);

  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return;

    const update = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', update);

    return () => list.removeEventListener('change', update);
  }, [query]);

  return matches;
}
