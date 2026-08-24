import { useAuth } from '@vendor/identity';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/** Route guard: неаутентифицированных уводит на /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <main aria-busy="true">Загрузка…</main>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
}

/** Обратный guard: аутентифицированных уводит с /login в чат. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <main aria-busy="true">Загрузка…</main>;
  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
}
