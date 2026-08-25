import { Group, RADIUS, Row, Screen, THEMES, Toggle, type ThemeTokens } from '@vendor/ui';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  isForbidden,
  useAdminSettings,
  useAuditLog,
  useSystemStatus,
  useUpdateAdminSettings,
  type AuditEntry,
} from '../app/admin';
import { useSettings } from '../app/settings';

const COMPONENT_LABEL: Record<string, string> = {
  database: 'База данных',
  redis: 'Redis',
  queue: 'Очереди (Horizon)',
  websocket: 'WebSocket (Reverb)',
  search: 'Поиск (Typesense)',
};

/** Экран администратора: состояние, выключатель AI и журнал действий. */
export function AdminPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const theme: ThemeTokens = THEMES[settings.theme];

  const status = useSystemStatus();
  const adminSettings = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const [actionFilter, setActionFilter] = useState('');
  const audit = useAuditLog(actionFilter);

  const forbidden = isForbidden(status.error) || isForbidden(audit.error);

  return (
    // Страница неподвижна: прокручивается содержимое внутри Screen.
    <div className="h-full w-full flex justify-center" style={{ background: theme.bg }}>
      <main className="h-full w-full max-w-md" style={{ color: theme.text }}>
        <Screen
          theme={theme}
          contentStyle={{ paddingTop: 8, paddingBottom: 24 }}
          header={
            <header className="flex items-center gap-2 px-2 pb-3 safe-top">
              <button
                type="button"
                onClick={() => navigate('/')}
                aria-label="Назад"
                className="tap grid place-items-center"
                style={{ width: 34, height: 34, color: theme.text }}
              >
                <ChevronLeft size={26} />
              </button>
              <h1 className="text-[20px] font-semibold" style={{ letterSpacing: '-0.02em' }}>
                Администрирование
              </h1>
            </header>
          }
        >

          {forbidden ? (
            <p role="alert" className="px-5 py-6 text-[15px]" style={{ color: theme.muted }}>
              Этот раздел доступен только администратору.
            </p>
          ) : (
            <>
              <Group theme={theme} label="Состояние">
                {status.isLoading ? (
                  <Row theme={theme} title="Проверяем…" last />
                ) : status.error ? (
                  <Row theme={theme} title="Не удалось получить состояние" last />
                ) : (
                  Object.entries(status.data?.components ?? {}).map(([name, component], index, all) => (
                    <Row
                      key={name}
                      theme={theme}
                      title={COMPONENT_LABEL[name] ?? name}
                      hint={component.detail}
                      value={component.status === 'ok' ? 'В порядке' : 'Недоступен'}
                      last={index === all.length - 1}
                    />
                  ))
                )}
              </Group>

              <Group theme={theme} label="Возможности">
                <Row
                  theme={theme}
                  title="AI-помощник"
                  hint="Выключение не влияет на переписку"
                  right={
                    <Toggle
                      theme={theme}
                      label="AI-помощник"
                      checked={adminSettings.data?.ai_enabled ?? false}
                      onChange={() => updateSettings.mutate(!(adminSettings.data?.ai_enabled ?? false))}
                    />
                  }
                />
                <Row
                  theme={theme}
                  title="Поиск по сообщениям"
                  value={status.data?.features.search ? 'Включён' : 'Выключен'}
                  hint="Включается в конфигурации сервера"
                  last
                />
              </Group>

              <Group theme={theme} label="Журнал">
                <div className="px-3 py-2">
                  <label htmlFor="audit-filter" className="block text-[13px] mb-1" style={{ color: theme.muted }}>
                    Фильтр по действию
                  </label>
                  <input
                    id="audit-filter"
                    value={actionFilter}
                    onChange={(event) => setActionFilter(event.target.value)}
                    placeholder="например, ai.revision.succeeded"
                    className="w-full px-3 py-2 outline-none"
                    style={{ background: theme.surfaceAlt, borderRadius: RADIUS.sm, color: theme.text, fontSize: 16 }}
                  />
                </div>

                {audit.isLoading ? (
                  <Row theme={theme} title="Загружаем журнал…" last />
                ) : audit.error ? (
                  <Row theme={theme} title="Не удалось загрузить журнал" last />
                ) : (audit.data?.data.length ?? 0) === 0 ? (
                  <Row theme={theme} title="Записей нет" last />
                ) : (
                  (audit.data?.data ?? []).map((entry: AuditEntry, index, all) => (
                    <Row
                      key={entry.id}
                      theme={theme}
                      title={entry.action}
                      hint={`${entry.actor_label ?? entry.actor_id ?? 'система'} · ${new Date(entry.created_at).toLocaleString('ru-RU')}`}
                      last={index === all.length - 1}
                    />
                  ))
                )}
              </Group>
            </>
          )}
        </Screen>
      </main>
    </div>
  );
}
