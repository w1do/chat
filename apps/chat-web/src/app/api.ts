import { ApiClient } from '@vendor/api-client';
import { runtimeConfig } from './runtime-config';

// Единственный ApiClient приложения; feature-пакеты получают его через
// IdentityProvider/адаптеры (§4.2).
let client: ApiClient | null = null;

export function apiClient(): ApiClient {
  if (!client) {
    client = new ApiClient({
      baseUrl: runtimeConfig().apiBaseUrl,
      onUnauthenticated: () => {
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign('/login');
        }
      },
    });
  }
  return client;
}
