import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@vendor/identity';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { suspendRealtime } from './echo';
import { clearImageCache, forgetImagesOfAnotherUser } from './service-worker';
import {
  markSessionEstablished,
  reportUnauthenticated,
  sessionStatus,
  subscribeSession,
  type SessionStatus,
} from './session';
import { authToken, clearAuthToken, subscribeAuthToken } from './token';

/** Состояние входа для интерфейса. */
export function useSessionStatus(): SessionStatus {
  return useSyncExternalStore(subscribeSession, sessionStatus, sessionStatus);
}

/**
 * Владелец состояния входа. Первый 401 после успешного входа означает, что
 * токен отозван: восстанавливать нечего (ADR-012). Клиент стирает токен,
 * гасит сокет, убирает приватные данные с устройства и уходит на форму входа;
 * повторы 401 при этом уже подавлены, поэтому экран не мигает.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const status = useSessionStatus();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Вход состоялся — дальше 401 означает именно отозванный токен. Заодно
  // сверяем, тот же ли это человек: на общем устройстве кеш изображений
  // прежнего аккаунта не должен достаться следующему.
  useEffect(() => {
    if (!user) return;
    markSessionEstablished();
    forgetImagesOfAnotherUser(user.id);
  }, [user]);

  // Выход в соседней вкладке гасит и эту: значение токена общее на браузер
  // (design 6), а опрашивать сервер ради этого незачем.
  useEffect(() => subscribeAuthToken(() => {
    if (authToken() === null) reportUnauthenticated();
  }), []);

  useEffect(() => {
    if (status !== 'unauthorized') return;

    // Снимаем висящие запросы и гасим сокет: иначе TanStack Query повторяет
    // их, а Reverb бесконечно переспрашивает /broadcasting/auth.
    void queryClient.cancelQueries();
    suspendRealtime();
    clearAuthToken();

    // Полная перезагрузка страницы, а не переход роутером: так гарантированно
    // не остаётся ни устаревшего кэша, ни живого сокета. Изображения прежнего
    // аккаунта не остаются доступными, в том числе без сети (spec).
    void clearImageCache().finally(() => window.location.assign('/login'));
  }, [status, queryClient]);

  return <>{children}</>;
}
