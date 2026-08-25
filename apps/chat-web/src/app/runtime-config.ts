// Runtime-конфигурация SPA: читается из /config.json ДО рендера приложения.
// Файл рендерится entrypoint'ом web-контейнера из public/config.template.json,
// поэтому образ не пересобирается при смене домена (STRUCTURE.md §5).

export interface RuntimeConfig {
  apiBaseUrl: string;
  reverb: {
    host: string;
    port: string;
    scheme: string;
    appKey: string;
  };
  ai: { enabled: string };
  /** Пустой ключ означает, что push на сервере не настроен. */
  push?: { publicKey: string };
  branding: { appName: string };
}

let config: RuntimeConfig | null = null;

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (config) return config;
  const response = await fetch('/config.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load /config.json: ${response.status}`);
  }
  config = (await response.json()) as RuntimeConfig;
  return config;
}

export function runtimeConfig(): RuntimeConfig {
  if (!config) throw new Error('Runtime config is not loaded yet.');
  return config;
}
