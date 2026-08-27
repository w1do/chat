import { useQueryClient } from '@tanstack/react-query';
import { identityApi, useAuth } from '@vendor/identity';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { SessionExpiredScreen } from '../pages/SessionExpiredScreen';
import { apiClient } from './api';
import { resumeRealtime, suspendRealtime } from './echo';
import { silentRecoveryEnabled } from './runtime-config';
import { clearImageCache, forgetImagesOfAnotherUser } from './service-worker';
import {
  markSessionEstablished,
  sessionStatus,
  setSilentRecovery,
  subscribeSession,
  type SessionStatus,
} from './session';

/** Состояние сессии для интерфейса: экран «Сессия истекла» рисует провайдер. */
export function useSessionStatus(): SessionStatus {
  return useSyncExternalStore(subscribeSession, sessionStatus, sessionStatus);
}

/**
 * Владелец состояния сессии. Первый 401 после успешного входа переводит
 * приложение в устойчивое «сессия истекла»: повторы запросов гасятся, сокет
 * замолкает, поверх чата встаёт экран с одним понятным действием.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const status = useSessionStatus();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const wasSuspended = useRef(false);

  // Вход состоялся — дальше 401 означает именно истёкшую сессию. Заодно
  // сверяем, тот же ли это человек: на общем устройстве кеш изображений
  // прежнего аккаунта не должен достаться следующему.
  useEffect(() => {
    if (!user) return;
    markSessionEstablished();
    forgetImagesOfAnotherUser(user.id);
  }, [user]);

  // Тихое восстановление включается установкой и по умолчанию выключено:
  // неверно настроенное, оно прячет настоящий выход (design.md, «Risks»).
  useEffect(() => {
    if (!silentRecoveryEnabled()) {
      setSilentRecovery(null);

      return;
    }

    const client = apiClient();
    setSilentRecovery(async () => {
      try {
        // Sanctum SPA: истёкший XSRF-токен — обычная причина 401 после долгого
        // простоя вкладки. Handshake и одна проверка `/me` — вся попытка.
        await client.refreshCsrfCookie();
        await identityApi.me(client);

        return true;
      } catch {
        return false;
      }
    });

    return () => setSilentRecovery(null);
  }, []);

  // Инцидент открыт: снимаем висящие запросы и гасим сокет. Иначе TanStack
  // Query повторяет их, Reverb бесконечно переспрашивает /broadcasting/auth,
  // и приложение мигает вместо того, чтобы объяснить, что произошло.
  useEffect(() => {
    if (status !== 'authorized') {
      wasSuspended.current = true;
      void queryClient.cancelQueries();
      suspendRealtime();
      // Сессия истекла — изображения прежнего аккаунта не остаются на
      // устройстве доступными, в том числе без сети (spec).
      if (status === 'unauthorized') void clearImageCache();

      return;
    }

    // Возвращение из инцидента: сокет подключается заново (подписки на личные
    // каналы восстанавливает сам Echo), данные перечитываются.
    if (wasSuspended.current) {
      wasSuspended.current = false;
      resumeRealtime();
      void queryClient.invalidateQueries();
    }
  }, [status, queryClient]);

  const logoutAndRedirect = useCallback(async () => {
    setLeaving(true);
    try {
      await identityApi.logout(apiClient());
    } catch {
      // Сессии уже нет — выходу и нечего инвалидировать. Чистим своё и уходим.
    }
    queryClient.clear();
    suspendRealtime();
    await clearImageCache();
    // Полная перезагрузка страницы, а не переход роутером: так гарантированно
    // не остаётся ни устаревшего кэша, ни живого сокета.
    window.location.assign('/login');
  }, [queryClient]);

  const reload = useCallback(() => window.location.reload(), []);

  return (
    <>
      {children}
      {status === 'unauthorized' ? (
        <SessionExpiredScreen busy={leaving} onLogin={() => void logoutAndRedirect()} onReload={reload} />
      ) : null}
    </>
  );
}
