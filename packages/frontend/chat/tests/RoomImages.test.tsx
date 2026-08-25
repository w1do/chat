import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { describe, expect, it, vi } from 'vitest';
import { RoomGlyph } from '../src/components/RoomGlyph';
import { RoomManagePanel } from '../src/components/mobile/RoomManagePanel';
import type { Room } from '../src/schemas/room';

const room = (extra: Partial<Room> = {}): Room => ({
  id: 'r1',
  name: 'Общая',
  topic: null,
  visibility: 'private',
  created_by: 'u1',
  archived_at: null,
  created_at: '2026-08-24T10:00:00Z',
  my_role: 'owner',
  member_count: 3,
  unread_count: 0,
  photo_url: null,
  photo_large_url: null,
  ...extra,
});

function setupPanel(extra: Partial<Room> = {}) {
  const onSetPhoto = vi.fn().mockResolvedValue(undefined);
  const onClearPhoto = vi.fn().mockResolvedValue(undefined);

  render(
    <RoomManagePanel
      room={room(extra)}
      theme={LIGHT}
      onSave={vi.fn().mockResolvedValue(undefined)}
      onDelete={vi.fn().mockResolvedValue(undefined)}
      onDeleted={vi.fn()}
      onSetPhoto={onSetPhoto}
      onClearPhoto={onClearPhoto}
    />,
  );

  return { onSetPhoto, onClearPhoto };
}

describe('RoomGlyph', () => {
  it('рисует эмодзи из названия, пока фотографии нет', () => {
    const { container } = render(<RoomGlyph name="Кухня" size={46} radius={16} theme={LIGHT} />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.textContent).not.toBe('');
  });

  it('показывает фотографию вместо эмодзи', () => {
    const { container } = render(
      <RoomGlyph name="Кухня" photoUrl="/api/v1/room-photos/p1/thumb" size={46} radius={16} theme={LIGHT} />,
    );

    expect(container.querySelector('img')).toHaveAttribute('src', '/api/v1/room-photos/p1/thumb');
  });

  it('возвращается к эмодзи, если фотография не загрузилась', () => {
    const { container } = render(
      <RoomGlyph name="Кухня" photoUrl="/api/v1/room-photos/broken" size={46} radius={16} theme={LIGHT} />,
    );

    const image = container.querySelector('img')!;
    image.dispatchEvent(new Event('error'));

    return waitFor(() => expect(container.querySelector('img')).not.toBeInTheDocument());
  });
});

describe('RoomManagePanel · фотография комнаты', () => {
  it('владелец ставит фотографию', async () => {
    const { onSetPhoto } = setupPanel();
    const file = new File(['x'], 'kitchen.jpg', { type: 'image/jpeg' });

    expect(screen.getByRole('button', { name: 'Поставить фотографию' })).toBeInTheDocument();

    await userEvent.upload(screen.getByLabelText('Файл фотографии комнаты'), file);

    await waitFor(() => expect(onSetPhoto).toHaveBeenCalledWith(file));
  });

  it('владелец убирает фотографию и комната возвращается к эмодзи', async () => {
    const { onClearPhoto } = setupPanel({ photo_url: '/api/v1/room-photos/p1/thumb' });

    expect(screen.getByRole('button', { name: 'Заменить фотографию' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Убрать' }));

    expect(onClearPhoto).toHaveBeenCalled();
  });

  it('админ тоже может менять фотографию', () => {
    setupPanel({ my_role: 'admin' });

    expect(screen.getByLabelText('Фотография комнаты')).toBeInTheDocument();
  });

  it('обычному участнику фотографию менять нечем', () => {
    setupPanel({ my_role: 'member' });

    expect(screen.queryByLabelText('Фотография комнаты')).not.toBeInTheDocument();
  });
});

describe('Фон переписки', () => {
  it('обычный фон, пока обоев нет, и подложка поверх обоев', async () => {
    const { ChatScreen } = await import('../src/components/mobile/ChatScreen');

    const props = {
      room: room(),
      messages: [],
      members: [],
      currentUserId: 'me',
      theme: LIGHT,
      textSize: 'M' as const,
      sendOnEnter: true,
      showTyping: true,
      typingUserIds: [],
      connection: 'connected' as const,
      keyboard: 0,
      draft: '',
      onDraftChange: vi.fn(),
      onBack: vi.fn(),
      onSend: vi.fn(),
      onEditMessage: vi.fn(),
      onLoadMore: vi.fn(),
      onTyping: vi.fn(),
      onToggleReaction: vi.fn(),
      onDeleteMessage: vi.fn(),
      onMagic: vi.fn(),
      onUndoMagic: vi.fn(),
    };

    const plain = render(<ChatScreen {...props} />);
    expect(plain.queryByTestId('wallpaper-scrim')).not.toBeInTheDocument();
    plain.unmount();

    // Подложка обязательна: человек приносит любое изображение, а текст
    // обязан остаться читаемым в обеих темах.
    const withPaper = render(<ChatScreen {...props} wallpaperUrl="/api/v1/wallpapers/w1" />);
    const scrim = withPaper.getByTestId('wallpaper-scrim');

    expect(scrim).toBeInTheDocument();
    expect(Number(scrim.style.opacity)).toBeGreaterThan(0.5);
    expect(scrim.style.background).not.toBe('');
  });
});
