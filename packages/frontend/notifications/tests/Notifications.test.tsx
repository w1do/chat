import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { describe, expect, it, vi } from 'vitest';
import { NotificationFeed } from '../src/components/NotificationFeed';
import { PreferencesForm } from '../src/components/PreferencesForm';
import type { Notification, NotificationPreference } from '../src/schemas/notification';

const notification = (id: string, extra: Partial<Notification> = {}): Notification => ({
  id,
  category: 'message',
  room_id: 'r1',
  room_name: 'Общая',
  actor_name: 'Алиса',
  preview: 'Привет всем',
  group_count: 1,
  read_at: null,
  created_at: '2026-08-25T12:00:00Z',
  ...extra,
});

const feedHandlers = { onOpenRoom: vi.fn(), onMarkAllRead: vi.fn(), onRetry: vi.fn() };

const preference = (
  category: NotificationPreference['category'],
  channel: NotificationPreference['channel'],
  enabled: boolean,
  locked = false,
): NotificationPreference => ({
  category,
  category_label: category === 'security' ? 'Безопасность' : 'Новые сообщения',
  channel,
  channel_label: channel === 'mail' ? 'На почту' : 'В приложении',
  enabled,
  locked,
});

describe('NotificationFeed', () => {
  it('shows loading, error and empty states', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <NotificationFeed notifications={undefined} unread={0} isLoading theme={LIGHT} {...feedHandlers} />,
    );
    expect(screen.getByText('Загрузка уведомлений…')).toHaveAttribute('aria-busy', 'true');

    rerender(
      <NotificationFeed
        notifications={undefined}
        unread={0}
        isLoading={false}
        error={new Error('x')}
        theme={LIGHT}
        {...feedHandlers}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить уведомления.');
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onRetry).toHaveBeenCalled();

    rerender(<NotificationFeed notifications={[]} unread={0} isLoading={false} theme={LIGHT} {...feedHandlers} />);
    expect(screen.getByRole('status')).toHaveTextContent('Пока ничего не пропущено.');
  });

  it('shows grouped counts and opens the room', async () => {
    const onOpenRoom = vi.fn();
    render(
      <NotificationFeed
        notifications={[notification('n1', { group_count: 4 }), notification('n2', { category: 'mention' })]}
        unread={2}
        isLoading={false}
        theme={LIGHT}
        {...feedHandlers}
        onOpenRoom={onOpenRoom}
      />,
    );

    expect(screen.getByLabelText('Свёрнуто событий: 4')).toHaveTextContent('×4');
    expect(screen.getByText('Упоминание')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button')[1]!);
    expect(onOpenRoom).toHaveBeenCalledWith('r1');
  });

  it('marks everything read from the header', async () => {
    const onMarkAllRead = vi.fn();
    render(
      <NotificationFeed
        notifications={[notification('n1')]}
        unread={1}
        isLoading={false}
        theme={LIGHT}
        {...feedHandlers}
        onMarkAllRead={onMarkAllRead}
      />,
    );

    expect(screen.getByText('Непрочитанных: 1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Отметить всё прочитанным' }));
    expect(onMarkAllRead).toHaveBeenCalled();
  });
});

describe('PreferencesForm', () => {
  it('toggles a channel through the API', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <PreferencesForm
        preferences={[preference('message', 'database', true), preference('message', 'mail', false)]}
        isLoading={false}
        theme={LIGHT}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('switch', { name: 'Новые сообщения: На почту' }));
    expect(onChange).toHaveBeenCalledWith({ category: 'message', channel: 'mail', enabled: true });
  });

  it('refuses to switch off a locked entry and explains why', async () => {
    const onChange = vi.fn();
    render(
      <PreferencesForm
        preferences={[preference('security', 'database', true, true)]}
        isLoading={false}
        theme={LIGHT}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('switch', { name: 'Безопасность: В приложении' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('отключить нельзя');
  });

  it('reports a failed save', async () => {
    const onChange = vi.fn().mockRejectedValue(new Error('nope'));
    render(
      <PreferencesForm
        preferences={[preference('message', 'mail', false)]}
        isLoading={false}
        theme={LIGHT}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('switch', { name: 'Новые сообщения: На почту' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить настройку.');
  });

  it('shows loading and error states', () => {
    const { rerender } = render(
      <PreferencesForm preferences={undefined} isLoading theme={LIGHT} onChange={vi.fn()} />,
    );
    expect(screen.getByText('Загрузка настроек…')).toBeInTheDocument();

    rerender(
      <PreferencesForm
        preferences={undefined}
        isLoading={false}
        error={new Error('x')}
        theme={LIGHT}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить настройки');
  });
});
