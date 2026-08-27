import { Group, Row, Toggle, type ThemeTokens } from '@vendor/ui';
import { useState } from 'react';
import type { NotificationPreference } from '../schemas/notification';

interface PreferencesFormProps {
  preferences: NotificationPreference[] | undefined;
  isLoading: boolean;
  error?: unknown;
  theme: ThemeTokens;
  onChange: (preference: { category: string; channel: string; enabled: boolean }) => Promise<unknown>;
  /** Повторная загрузка настроек: приложение передаёт refetch запроса. */
  onRetry?: () => void;
}

/** Настройки каналов: по одной строке на «категория × канал». */
export function PreferencesForm({ preferences, isLoading, error, theme, onChange, onRetry }: PreferencesFormProps) {
  const [failed, setFailed] = useState<string | null>(null);

  if (isLoading) {
    return (
      <p aria-busy="true" className="px-4 py-6 text-[15px]" style={{ color: theme.muted }}>
        Загрузка настроек…
      </p>
    );
  }

  if (error || !preferences) {
    return (
      <div className="px-4 py-6">
        <p role="alert" className="text-[15px]" style={{ color: theme.danger }}>
          Не удалось загрузить настройки уведомлений.
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="tap mt-3 px-3 py-2 text-[14px]"
            style={{ borderRadius: 10, background: theme.surfaceAlt, color: theme.text }}
          >
            Повторить
          </button>
        ) : null}
      </div>
    );
  }

  const categories = [...new Set(preferences.map((preference) => preference.category))];

  return (
    <>
      {failed ? (
        <p role="alert" className="px-4 pb-2 text-[13px]" style={{ color: theme.danger }}>
          {failed}
        </p>
      ) : null}

      {categories.map((category) => {
        const rows = preferences.filter((preference) => preference.category === category);
        const label = rows[0]?.category_label ?? category;

        return (
          <Group key={category} theme={theme} label={label}>
            {rows.map((preference, index) => (
              <Row
                key={`${preference.category}-${preference.channel}`}
                theme={theme}
                title={preference.channel_label}
                hint={preference.locked ? 'Отключить нельзя' : undefined}
                last={index === rows.length - 1}
                right={
                  <Toggle
                    theme={theme}
                    label={`${label}: ${preference.channel_label}`}
                    checked={preference.enabled}
                    onChange={() => {
                      if (preference.locked) {
                        setFailed('Уведомления безопасности в ленте отключить нельзя.');

                        return;
                      }
                      setFailed(null);
                      void onChange({
                        category: preference.category,
                        channel: preference.channel,
                        enabled: !preference.enabled,
                      }).catch(() => setFailed('Не удалось сохранить настройку.'));
                    }}
                  />
                }
              />
            ))}
          </Group>
        );
      })}
    </>
  );
}
