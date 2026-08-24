import { useAuth } from '@vendor/identity';
import { Avatar, Group, Row, Segmented, Sheet, Toggle, useElementHeight, type ThemeTokens } from '@vendor/ui';
import { useRef, useState } from 'react';
import type { AppSettings } from '../app/settings';

interface SettingsScreenProps {
  theme: ThemeTokens;
  settings: AppSettings;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onToast: (text: string) => void;
}

type SheetId = 'appearance' | 'chat' | 'profile' | null;

/** Экран «Настройки»: короткий список, каждый пункт открывает отдельный лист. */
export function SettingsScreen({ theme, settings, onChange, onToast }: SettingsScreenProps) {
  const headerRef = useRef<HTMLElement>(null);
  const headerHeight = useElementHeight(headerRef);
  const [sheet, setSheet] = useState<SheetId>(null);
  const { user, logout } = useAuth();

  const themeLabel = settings.theme === 'dark' ? 'Тёмная' : 'Светлая';
  const sizeLabel = { S: 'Мелкий', M: 'Обычный', L: 'Крупный' }[settings.textSize];

  return (
    <div className="relative h-full" style={{ background: theme.bg }}>
      <div className="absolute inset-0 overflow-y-auto scroll-area" style={{ paddingTop: headerHeight, paddingBottom: 96 }}>
        <Group theme={theme} label="Профиль">
          <Row
            theme={theme}
            title={user?.name ?? 'Профиль'}
            hint={user?.email}
            onClick={() => setSheet('profile')}
            right={user ? <Avatar userId={user.id} name={user.name} size={34} theme={theme} /> : undefined}
            last
          />
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
      </div>

      <header
        ref={headerRef}
        className="absolute top-0 left-0 right-0 z-10 px-5 pb-3 safe-top blur-chrome"
        style={{ background: theme.chromeAlpha }}
      >
        <h1 className="text-[28px] font-semibold" style={{ color: theme.text, letterSpacing: '-0.035em' }}>
          Настройки
        </h1>
      </header>

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
        title={user?.name ?? 'Профиль'}
        subtitle={user?.email}
        theme={theme}
        onClose={() => setSheet(null)}
      >
        <div className="px-4 pb-6">
          <Row theme={theme} title="Локаль" value={user?.locale ?? '—'} />
          <Row theme={theme} title="Часовой пояс" value={user?.timezone ?? '—'} last />
          <p className="text-[13px] mt-4" style={{ color: theme.muted }}>
            Имя, локаль и часовой пояс меняются на странице профиля.
          </p>
        </div>
      </Sheet>
    </div>
  );
}
