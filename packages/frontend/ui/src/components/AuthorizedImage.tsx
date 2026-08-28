import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { useAuthorizedImage } from '../hooks/useAuthorizedImage';

interface AuthorizedImageProps extends Omit<ComponentPropsWithoutRef<'img'>, 'src'> {
  /** Адрес защищённого файла; null — показывать замену. */
  src?: string | null;
  /** Что видно, пока картинки нет: буква имени, эмодзи, заглушка. */
  fallback?: ReactNode;
}

/**
 * Картинка из защищённого эндпоинта. Запрашивается авторизованным `fetch` и
 * показывается из `blob:`-адреса; пока её нет — обычная замена, чтобы в
 * интерфейсе не оставалось пустых дыр (ADR-012).
 */
export function AuthorizedImage({ src, fallback = null, ...rest }: AuthorizedImageProps) {
  const image = useAuthorizedImage(src);

  if (image.src === null) return <>{fallback}</>;

  return <img src={image.src} {...rest} />;
}
