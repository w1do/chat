import { ApiClient } from '@vendor/api-client';
import { setAuthTokenStore } from '@vendor/identity';
import { setAuthorizedImageHeaders } from '@vendor/ui';
import { runtimeConfig } from './runtime-config';
import { isRequestSuspended, reportUnauthenticated } from './session';
import { authToken, clearAuthToken, storeAuthToken, subscribeAuthToken } from './token';

// Где лежит токен, решает приложение (§4.2): пакет identity получает от него
// готовое хранилище, а не выбирает место сам.
setAuthTokenStore({
  read: authToken,
  save: storeAuthToken,
  clear: clearAuthToken,
  subscribe: subscribeAuthToken,
});

// Единственный ApiClient приложения; feature-пакеты получают его через
// IdentityProvider/адаптеры (§4.2).
let client: ApiClient | null = null;

export function apiClient(): ApiClient {
  if (!client) {
    client = new ApiClient({
      baseUrl: runtimeConfig().apiBaseUrl,
      // Хранилище токена принадлежит приложению, пакет только читает его.
      authToken,
      sessionSuspended: isRequestSuspended,
      onUnauthenticated: () => {
        // Вход был и стал недействительным — дальше отвечает AuthProvider: он
        // стирает токен, гасит повторы и сокет и уводит на форму входа.
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

// Защищённые картинки и файлы грузятся тем же заголовком, что и данные
// (ADR-012); дизайн-система получает его от приложения.
setAuthorizedImageHeaders(() => apiClient().authHeaders());
