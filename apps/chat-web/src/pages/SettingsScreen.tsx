import { EmailForm, PasswordForm, ProfileForm, useAuth } from '@vendor/identity';
import {
  PreferencesForm,
  useNotificationPreferences,
  useUpdatePreferences,
} from '@vendor/notifications';
import { Avatar, Group, Row, Screen, Segmented, Sheet, Toggle, type ThemeTokens } from '@vendor/ui';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSystemStatus } from '../app/admin';
import { usePushSubscription, type PushState } from '../app/push';
import type { AppSettings } from '../app/settings';

interface SettingsScreenProps {
  theme: ThemeTokens;
  settings: AppSettings;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotifications: () => Promise<void>;
  onToast: (text: string) => void;
}

/** Объяснение состояния push: тумблер не должен молчать. */
const PUSH_HINT: Record<PushState, string> = {
  on: 'Приходят, даже когда чат закрыт',
  off: 'Включите, чтобы узнавать о сообщениях при закрытом чате',
  denied: 'Запрещены в настройках браузера — разрешите их там',
  unsupported: 'Браузер не поддерживает push-уведомления',
  'not-configured': 'На этом сервере push не настроены администратором',
  'needs-install': 'На iPhone push работают только после установки приложения на экран «Домой»',
};

/** В остальных состояниях переключать нечего — показываем только объяснение. */
const PUSH_TOGGLEABLE: PushState[] = ['on', 'off'];

type SheetId = 'appearance' | 'chat' | 'profile' | 'email' | 'password' | 'channels' | null;

/** Экран «Настройки»: короткий список, каждый пункт открывает отдельный лист. */
export function SettingsScreen({
  theme,
  settings,
  onChange,
  notificationPermission,
  onRequestNotifications,
  onToast,
}: SettingsScreenProps) {
  const headerRef = useRef<HTMLElement>(null);
  const [sheet, setSheet] = useState<SheetId>(null);
  const { user, logout, updateProfile, updateEmail, changePassword } = useAuth();
  const navigate = useNavigate();
  // Признак администратора — успешный ответ админского эндпоинта: у обычного
  // пользователя он 403, и раздел просто не появляется.
  const admin = useSystemStatus();
  const push = usePushSubscription();
  const preferences = useNotificationPreferences();
  const updatePreferences = useUpdatePreferences();

  const themeLabel = settings.theme === 'dark' ? 'Тёмная' : 'Светлая';
  const sizeLabel = { S: 'Мелкий', M: 'Обычный', L: 'Крупный' }[settings.textSize];

  /** Шапка закреплена: прокручивается только список настроек. */
  const renderHeader = () => (
      <header
        ref={headerRef}
        className="px-5 pb-3 safe-top blur-chrome"
        style={{ background: theme.chromeAlpha }}
      >
        <h1 className="text-[28px] font-semibold" style={{ color: theme.text, letterSpacing: '-0.035em' }}>
          Настройки
        </h1>
      </header>
  );

  return (
    <div className="relative h-full" style={{ background: theme.bg }}>
      <Screen theme={theme} header={renderHeader()} contentStyle={{ paddingBottom: 96 }}>
        <Group theme={theme} label="Профиль">
          <Row
            theme={theme}
            title={user?.name ?? 'Профиль'}
            hint={user ? `@${user.login}` : undefined}
            onClick={() => setSheet('profile')}
            right={user ? <Avatar userId={user.id} name={user.name} size={34} theme={theme} /> : undefined}
          />
          <Row
            theme={theme}
            title="Почта"
            hint={user?.email ? undefined : 'Не указана — нужна для восстановления пароля'}
            value={user?.email ?? 'Добавить'}
            onClick={() => setSheet('email')}
          />
          <Row theme={theme} title="Пароль" value="Изменить" onClick={() => setSheet('password')} last />
        </Group>

        <Group theme={theme} label="Оформление">
          <Row theme={theme} title="Тема" value={themeLabel} onClick={() => setSheet('appearance')} />
          <Row theme={theme} title="Размер текста" value={sizeLabel} onClick={() => setSheet('appearance')} />
          <Row
            theme={theme}
            title="Анимации"
            hint="Выключите, если движение мешает"
            right={
              <Toggle
                theme={theme}
                label="Анимации"
                checked={settings.animations}
                onChange={() => onChange('animations', !settings.animations)}
              />
            }
            last
          />
        </Group>

        <Group theme={theme} label="Уведомления">
          <Row
            theme={theme}
            title="Уведомления браузера"
            hint={
              notificationPermission === 'granted'
                ? 'Приходят, когда вкладка в фоне'
                : notificationPermission === 'denied'
                  ? 'Запрещены в настройках браузера'
                  : notificationPermission === 'unsupported'
                    ? 'Браузер их не поддерживает'
                    : 'Внутри приложения уведомления работают и без разрешения'
            }
            value={notificationPermission === 'default' ? 'Включить' : undefined}
            onClick={
              notificationPermission === 'default' ? () => void onRequestNotifications() : undefined
            }
          />
          <Row
            theme={theme}
            title="Push-уведомления"
            hint={PUSH_HINT[push.state]}
            right={
              PUSH_TOGGLEABLE.includes(push.state) ? (
                <Toggle
                  theme={theme}
                  label="Push-уведомления"
                  checked={push.state === 'on'}
                  onChange={() => {
                    if (push.busy) return;

                    void (push.state === 'on' ? push.disable() : push.enable()).then(() =>
                      onToast(push.state === 'on' ? 'Push выключены' : 'Push включены'),
                    );
                  }}
                />
              ) : undefined
            }
          />
          <Row
            theme={theme}
            title="Каналы уведомлений"
            hint="Что присылать в ленту и на почту"
            onClick={() => setSheet('channels')}
            last
          />
        </Group>

        <Group theme={theme} label="Чат">
          <Row
            theme={theme}
            title="Показывать «печатает»"
            right={
              <Toggle
                theme={theme}
                label="Показывать печатает"
                checked={settings.showTyping}
                onChange={() => onChange('showTyping', !settings.showTyping)}
              />
            }
          />
          <Row
            theme={theme}
            title="Enter отправляет"
            hint="Иначе перенос строки"
            right={
              <Toggle
                theme={theme}
                label="Enter отправляет"
                checked={settings.sendOnEnter}
                onChange={() => onChange('sendOnEnter', !settings.sendOnEnter)}
              />
            }
            last
          />
        </Group>

        {admin.isSuccess ? (
          <Group theme={theme} label="Администрирование">
            <Row
              theme={theme}
              title="Панель администратора"
              hint="Состояние, выключатель AI, журнал"
              onClick={() => navigate('/admin')}
              last
            />
          </Group>
        ) : null}

        <Group theme={theme}>
          <Row
            theme={theme}
            title="Выйти"
            onClick={() => {
              logout.mutate();
              onToast('Вы вышли из аккаунта');
            }}
            last
          />
        </Group>
      </Screen>


      <Sheet
        open={sheet === 'appearance'}
        title="Оформление"
        subtitle="Тема и размер текста"
        theme={theme}
        onClose={() => setSheet(null)}
      >
        <div className="px-4 pb-6">
          <p className="text-[13px] mb-2" style={{ color: theme.muted }}>
            Тема
          </p>
          <Segmented
            theme={theme}
            label="Тема"
            value={settings.theme}
            options={[
              { id: 'light', label: 'Светлая' },
              { id: 'dark', label: 'Тёмная' },
            ]}
            onChange={(value) => onChange('theme', value)}
          />

          <p className="text-[13px] mt-5 mb-2" style={{ color: theme.muted }}>
            Размер текста
          </p>
          <Segmented
            theme={theme}
            label="Размер текста"
            value={settings.textSize}
            options={[
              { id: 'S', label: 'Мелкий' },
              { id: 'M', label: 'Обычный' },
              { id: 'L', label: 'Крупный' },
            ]}
            onChange={(value) => onChange('textSize', value)}
          />
        </div>
      </Sheet>

      <Sheet
        open={sheet === 'profile'}
        title="Профиль"
        subtitle={user ? `@${user.login}` : undefined}
        theme={theme}
        onClose={() => setSheet(null)}
      >
        <div className="px-4 pb-6">
          {user ? (
            <ProfileForm
              theme={theme}
              defaultValues={{ name: user.name, locale: user.locale, timezone: user.timezone }}
              onSubmit={(input) => updateProfile.mutateAsync(input)}
            />
          ) : null}
          <p className="text-[12.5px] mt-3" style={{ color: theme.faint }}>
            Логин менять нельзя — по нему вы входите.
          </p>
        </div>
      </Sheet>

      <Sheet
        open={sheet === 'email'}
        title="Почта"
        subtitle="Необязательна: нужна только для восстановления пароля и писем"
        theme={theme}
        onClose={() => setSheet(null)}
      >
        <div className="px-4 pb-6">
          <EmailForm
            theme={theme}
            currentEmail={user?.email ?? null}
            onSubmit={(input) => updateEmail.mutateAsync(input)}
          />
        </div>
      </Sheet>

      <Sheet
        open={sheet === 'channels'}
        title="Каналы уведомлений"
        subtitle="Уведомления приходят, когда вас нет в комнате"
        theme={theme}
        onClose={() => setSheet(null)}
      >
        <div className="pb-4">
          <PreferencesForm
            preferences={preferences.data}
            isLoading={preferences.isLoading}
            error={preferences.error ?? undefined}
            theme={theme}
            onChange={(preference) => updatePreferences.mutateAsync([preference])}
          />
        </div>
      </Sheet>

      <Sheet open={sheet === 'password'} title="Пароль" theme={theme} onClose={() => setSheet(null)}>
        <div className="px-4 pb-6">
          <PasswordForm theme={theme} onSubmit={(input) => changePassword.mutateAsync(input)} />
        </div>
      </Sheet>
    </div>
  );
}
