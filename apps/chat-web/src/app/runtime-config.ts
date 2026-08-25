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
  /** Требование к паролю приходит из установки — то же, по которому проверяет сервер. */
  password?: { minLength: string };
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

/**
 * Минимальная длина пароля, заданная установкой. Интерфейс не хранит
 * собственного числа: форма не должна быть строже сервера. Значение приходит
 * строкой из `envsubst`, пустое или испорченное считаем единицей — тем же
 * умолчанием, что и на сервере.
 */
export function passwordMinLength(): number {
  try {
    const raw = Number.parseInt(runtimeConfig().password?.minLength ?? '', 10);

    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  } catch {
    // Форма входа не должна падать из-за одного числа: единица — то же
    // умолчание, по которому проверяет сервер.
    return 1;
  }
}
