import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { describe, expect, it, vi } from 'vitest';
import { AvatarPicker } from '../src/components/AvatarPicker';
import { WallpaperPicker } from '../src/components/WallpaperPicker';
import type { ProfileImage } from '../src/api';

const avatar = (id: string, current = false): ProfileImage => ({
  id,
  url: `/api/v1/avatars/${id}`,
  thumb_url: `/api/v1/avatars/${id}/thumb`,
  current,
});

function setupPicker(avatars: ProfileImage[], currentUrl: string | null = null) {
  const handlers = {
    onUpload: vi.fn().mockResolvedValue(undefined),
    onSelect: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onClear: vi.fn().mockResolvedValue(undefined),
  };

  render(<AvatarPicker userId="u1" name="Алиса" avatars={avatars} currentUrl={currentUrl} theme={LIGHT} {...handlers} />);

  return handlers;
}

describe('AvatarPicker', () => {
  it('показывает букву имени, пока аватарки нет', () => {
    setupPicker([]);

    expect(screen.getByText('Аватарки пока нет')).toBeInTheDocument();
    expect(screen.getByText('А')).toBeInTheDocument();
    // Снимать нечего — кнопки нет.
    expect(screen.queryByRole('button', { name: 'Снять' })).not.toBeInTheDocument();
  });

  it('загружает выбранный файл', async () => {
    const { onUpload } = setupPicker([]);
    const file = new File(['x'], 'face.jpg', { type: 'image/jpeg' });

    await userEvent.upload(screen.getByLabelText('Файл аватарки'), file);

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file));
  });

  it('выбирает прежнюю аватарку из набора', async () => {
    const { onSelect } = setupPicker([avatar('one', true), avatar('two')], '/api/v1/avatars/one');

    const buttons = screen.getAllByRole('button', { name: /Показывать эту аватарку/ });
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(buttons[1]!);

    expect(onSelect).toHaveBeenCalledWith('two');
  });

  it('удаляет аватарку из набора', async () => {
    const { onDelete } = setupPicker([avatar('one', true)], '/api/v1/avatars/one');

    await userEvent.click(screen.getByRole('button', { name: 'Удалить эту аватарку' }));

    expect(onDelete).toHaveBeenCalledWith('one');
  });

  it('снимает текущую, сохраняя набор', async () => {
    const { onClear } = setupPicker([avatar('one', true)], '/api/v1/avatars/one');

    await userEvent.click(screen.getByRole('button', { name: 'Снять' }));

    expect(onClear).toHaveBeenCalled();
  });

  it('сообщает словами сервера, что набор заполнен', async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error('Набор аватарок заполнен: не больше 12. Удалите ненужную.'));
    render(
      <AvatarPicker
        userId="u1"
        name="Алиса"
        avatars={[avatar('one', true)]}
        currentUrl="/api/v1/avatars/one"
        theme={LIGHT}
        onUpload={onUpload}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    await userEvent.upload(
      screen.getByLabelText('Файл аватарки'),
      new File(['x'], 'more.jpg', { type: 'image/jpeg' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Набор аватарок заполнен');
  });
});

describe('WallpaperPicker', () => {
  it('объясняет, что обои личные, и ставит их', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    render(<WallpaperPicker currentUrl={null} theme={LIGHT} onUpload={onUpload} onClear={vi.fn()} />);

    expect(screen.getByText('Обычный фон')).toBeInTheDocument();
    expect(screen.getByText(/видите только вы/)).toBeInTheDocument();

    const file = new File(['x'], 'sea.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('Файл обоев'), file);

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file));
  });

  it('возвращает обычный фон', async () => {
    const onClear = vi.fn().mockResolvedValue(undefined);
    render(
      <WallpaperPicker currentUrl="/api/v1/wallpapers/w1" theme={LIGHT} onUpload={vi.fn()} onClear={onClear} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Обычный фон' }));

    expect(onClear).toHaveBeenCalled();
  });
});
