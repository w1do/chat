import { ApiClient } from '@vendor/api-client';
import { runtimeConfig } from './runtime-config';
import { isRequestSuspended, reportUnauthenticated } from './session';

// Единственный ApiClient приложения; feature-пакеты получают его через
// IdentityProvider/адаптеры (§4.2).
let client: ApiClient | null = null;

export function apiClient(): ApiClient {
  if (!client) {
    client = new ApiClient({
      baseUrl: runtimeConfig().apiBaseUrl,
      sessionSuspended: isRequestSuspended,
      onUnauthenticated: () => {
        // Вход был и истёк — дальше отвечает AuthProvider: он гасит повторы,
        // сокет и показывает экран «Сессия истекла».
        if (reportUnauthenticated()) return;

        const path = window.location.pathname;

        // Экран приглашения открывают до входа: 401 там ожидаем и не повод
        // выкидывать человека на форму входа.
        if (path.startsWith('/login') || path.startsWith('/invite/')) return;

        window.location.assign('/login');
      },
    });
  }
  return client;
}
