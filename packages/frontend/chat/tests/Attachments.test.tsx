import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@vendor/api-client';
import { ChatProvider } from '../src/adapters/ChatProvider';
import { ChatScreen } from '../src/components/mobile/ChatScreen';
import { MessageAttachments } from '../src/components/mobile/AttachmentTiles';
import { PREVIEW_RETRY_DELAYS } from '../src/hooks/useAttachmentPreviews';
import { useAttachmentUploads, type PendingAttachment } from '../src/hooks/useAttachmentUploads';
import { applyRoomEvent } from '../src/realtime/handlers';
import type { Attachment, Message, MessagePage } from '../src/schemas/message';
import type { Member, Room } from '../src/schemas/room';

const room = (extra: Partial<Room> = {}): Room => ({
  id: 'r1',
  name: 'Общая',
  topic: null,
  visibility: 'public',
  created_by: 'u1',
  archived_at: null,
  created_at: '2026-08-24T10:00:00Z',
  my_role: 'member',
  member_count: 2,
  unread_count: 0,
  photo_url: null,
  photo_large_url: null,
  ...extra,
});

const message = (id: string, extra: Partial<Message> = {}): Message => ({
  id,
  room_id: 'r1',
  kind: 'text',
  author_id: 'u1',
  author_name: 'Alice',
  author_avatar_url: null,
  reply_to_id: null,
  body: `Message ${id}`,
  mentions: [],
  is_edited: false,
  edited_at: null,
  deleted: false,
  created_at: '2026-08-24T12:00:00Z',
  reactions: [],
  attachments: [],
  payload: null,
  ...extra,
});

const image = (id: string, extra: Partial<Attachment> = {}): Attachment => ({
  id,
  name: `${id}.jpg`,
  mime_type: 'image/jpeg',
  size: 245760,
  url: `/api/v1/attachments/${id}`,
  thumb_url: `/api/v1/attachments/${id}/thumb`,
  width: 1600,
  height: 1200,
  ...extra,
});

const document = (id: string): Attachment => ({
  id,
  name: 'договор.pdf',
  mime_type: 'application/pdf',
  size: 88210,
  url: `/api/v1/attachments/${id}`,
  thumb_url: null,
  width: null,
  height: null,
});

const pending = (localId: string, extra: Partial<PendingAttachment> = {}): PendingAttachment => ({
  localId,
  name: `${localId}.jpg`,
  size: 1024,
  isImage: true,
  previewUrl: null,
  status: 'ready',
  error: null,
  attachment: image(`a-${localId}`),
  ...extra,
});

const members: Member[] = [
  { id: 'm1', room_id: 'r1', user_id: 'u1', role: 'owner', joined_at: '', name: 'Alice', username: 'alice', avatar_url: null, is_online: false, last_seen_at: null },
];

const handlers = {
  onBack: vi.fn(),
  onLoadMore: vi.fn(),
  onTyping: vi.fn(),
  onToggleReaction: vi.fn(),
  onDeleteMessage: vi.fn(),
  onMagic: vi.fn(),
  onUndoMagic: vi.fn(),
};

function Harness(props: Partial<React.ComponentProps<typeof ChatScreen>>) {
  const [draft, setDraft] = useState('');

  return (
    <ChatScreen
      room={room()}
      messages={[message('m1')]}
      members={members}
      currentUserId="me"
      theme={LIGHT}
      textSize="M"
      sendOnEnter
      showTyping
      typingUserIds={[]}
      connection="connected"
      keyboard={0}
      isLoading={false}
      hasMore={false}
      aiEnabled={false}
      undoText={null}
      magicBusy={false}
      draft={draft}
      onDraftChange={setDraft}
      onSend={async () => undefined}
      onPickFiles={() => undefined}
      {...handlers}
      {...props}
    />
  );
}

// --- 3.1: панель ввода --------------------------------------------------------

describe('вложения в панели ввода', () => {
  it('передаёт наружу все выбранные за один раз файлы', () => {
    const onPickFiles = vi.fn();
    render(<Harness onPickFiles={onPickFiles} />);

    const files = [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
    ];
    fireEvent.change(screen.getByTestId('attachment-input'), { target: { files } });

    expect(onPickFiles).toHaveBeenCalledWith(files);
  });

  it('показывает плитки, снимает лишний файл и повторяет неудавшийся', async () => {
    const onRemoveAttachment = vi.fn();
    const onRetryAttachment = vi.fn();
    render(
      <Harness
        attachments={[
          pending('one'),
          pending('two', { status: 'error', error: 'Не удалось загрузить файл.', attachment: null }),
        ]}
        onRemoveAttachment={onRemoveAttachment}
        onRetryAttachment={onRetryAttachment}
      />,
    );

    const tiles = screen.getAllByTestId('composer-attachment');
    expect(tiles).toHaveLength(2);
    // Ошибка видна у своего файла, не на всей панели.
    expect(within(tiles[1]!).getByRole('alert')).toHaveTextContent('Не удалось загрузить файл.');

    await userEvent.click(screen.getByLabelText('Убрать файл one.jpg'));
    expect(onRemoveAttachment).toHaveBeenCalledWith('one');

    await userEvent.click(screen.getByLabelText('Повторить загрузку two.jpg'));
    expect(onRetryAttachment).toHaveBeenCalledWith('two');
  });

  it('хранит черновик текста рядом с приложенными файлами', async () => {
    render(<Harness attachments={[pending('one')]} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'подпись к фото');

    expect(screen.getByRole('textbox', { name: 'Сообщение' })).toHaveValue('подпись к фото');
    expect(screen.getAllByTestId('composer-attachment')).toHaveLength(1);
  });

  it('не отправляет, пока файл грузится, и шлёт идентификаторы готовых', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <Harness onSend={onSend} attachments={[pending('one', { status: 'uploading', attachment: null })]} />,
    );

    // Пока идёт загрузка, кнопки отправки нет в доступном состоянии.
    expect(screen.getByLabelText('Отправить')).toBeDisabled();

    rerender(<Harness onSend={onSend} attachments={[pending('one')]} />);
    await userEvent.click(screen.getByLabelText('Отправить'));

    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({ body: '', attachments: ['a-one'] }),
    );
  });
});

describe('useAttachmentUploads', () => {
  const wrap = (client: ApiClient) =>
    ({ children }: { children: ReactNode }) => <ChatProvider client={client}>{children}</ChatProvider>;

  it('грузит выбранное, повторяет неудавшееся и не теряет остальные', async () => {
    let failures = 1;
    const client = {
      post: vi.fn().mockImplementation(async () => {
        if (failures > 0) {
          failures -= 1;
          throw new Error('обрыв сети');
        }

        return { data: image('srv-1') };
      }),
    } as unknown as ApiClient;

    const { result } = renderHook(() => useAttachmentUploads('r1'), { wrapper: wrap(client) });

    act(() => {
      result.current.add([new File(['x'], 'x.jpg', { type: 'image/jpeg' })]);
    });

    await waitFor(() => expect(result.current.items[0]!.status).toBe('error'));

    act(() => result.current.retry(result.current.items[0]!.localId));

    await waitFor(() => expect(result.current.items[0]!.status).toBe('ready'));
    expect(result.current.readyIds).toEqual(['srv-1']);
  });

  it('называет предел и не прикладывает лишние файлы', async () => {
    const client = {
      post: vi.fn().mockResolvedValue({ data: image('srv') }),
    } as unknown as ApiClient;
    const onNotice = vi.fn();

    const { result } = renderHook(() => useAttachmentUploads('r1', onNotice), { wrapper: wrap(client) });

    const files = Array.from({ length: 12 }, (_, i) => new File(['x'], `f${i}.jpg`, { type: 'image/jpeg' }));
    act(() => result.current.add(files));

    expect(result.current.items).toHaveLength(10);
    expect(onNotice).toHaveBeenCalledWith(expect.stringContaining('10'));
  });
});

// --- 3.2, 3.3: вложения в сообщении ------------------------------------------

describe('вложения в сообщении', () => {
  const renderTiles = (attachments: Attachment[], onOpenImage = vi.fn()) => {
    render(
      <MessageAttachments
        messageId="m1"
        attachments={attachments}
        own={false}
        theme={LIGHT}
        fontSize={15}
        onOpenImage={onOpenImage}
      />,
    );

    return onOpenImage;
  };

  it('показывает одно изображение крупно', () => {
    renderTiles([image('a1')]);

    const tile = screen.getByLabelText('Открыть изображение a1.jpg');
    expect(within(tile).getByRole('img')).toHaveAttribute('src', '/api/v1/attachments/a1/thumb');
  });

  it('раскладывает два–четыре изображения сеткой', () => {
    renderTiles([image('a1'), image('a2'), image('a3')]);

    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  it('сворачивает больше четырёх до плиток с «Показать ещё»', async () => {
    renderTiles([1, 2, 3, 4, 5, 6, 7].map((n) => image(`a${n}`)));

    expect(screen.getAllByRole('img')).toHaveLength(4);
    const more = screen.getByRole('button', { name: /Показать ещё/ });
    expect(more).toHaveTextContent('+3');

    await userEvent.click(more);
    expect(screen.getAllByRole('img')).toHaveLength(7);
  });

  it('показывает документ строкой с именем, размером и скачиванием', () => {
    renderTiles([document('d1')]);

    const row = screen.getByLabelText('Скачать договор.pdf');
    expect(row).toHaveAttribute('href', '/api/v1/attachments/d1');
    expect(row).toHaveTextContent('договор.pdf');
    expect(row).toHaveTextContent('86 КБ');
  });

  it('смешанное сообщение держит и плитки, и строку файла', () => {
    render(
      <Harness
        messages={[message('m1', { body: '', attachments: [image('a1'), document('d1')] })]}
      />,
    );

    expect(screen.getByLabelText('Открыть изображение a1.jpg')).toBeInTheDocument();
    expect(screen.getByLabelText('Скачать договор.pdf')).toBeInTheDocument();
  });

  it('грузит миниатюру, а не оригинал, и ждёт неготовую', () => {
    renderTiles([image('a1'), image('a2', { thumb_url: null })]);

    // Готовая плитка смотрит на миниатюру; оригинал в ленту не тянется.
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/v1/attachments/a1/thumb');
    // Неготовая — видимое состояние ожидания, а не сломанная картинка.
    expect(screen.getByTestId('attachment-waiting')).toHaveAccessibleName('a2.jpg: миниатюра готовится');
  });
});

// --- 3.4: галерея -------------------------------------------------------------

describe('галерея', () => {
  const fourImages = [1, 2, 3, 4].map((n) => image(`a${n}`));

  function openGallery(startAt = 2) {
    render(<Harness messages={[message('m1', { body: '', attachments: fourImages })]} />);

    fireEvent.click(screen.getByLabelText(`Открыть изображение a${startAt}.jpg`));

    return screen.getByRole('dialog');
  }

  it('открывает именно нажатое изображение в полный размер', () => {
    const dialog = openGallery(2);

    // В галерее — оригинал, а не миниатюра.
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/api/v1/attachments/a2');
    expect(within(dialog).getByRole('status')).toHaveTextContent('2 из 4');
  });

  it('листает стрелками и не выходит за края', () => {
    const dialog = openGallery(4);

    // Последнее: кнопки «дальше» нет, стрелка вправо ничего не меняет.
    expect(within(dialog).queryByLabelText('Следующее изображение')).toBeNull();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/api/v1/attachments/a4');

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/api/v1/attachments/a3');
  });

  it('закрывается по Esc и оставляет ленту на месте', () => {
    openGallery(1);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    // Лента не размонтировалась: сообщение на месте.
    expect(screen.getByLabelText('Открыть изображение a1.jpg')).toBeInTheDocument();
  });

  it('листается свайпом', () => {
    const dialog = openGallery(1);

    fireEvent.touchStart(dialog, { touches: [{ clientX: 220 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 120 }] });

    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/api/v1/attachments/a2');
  });
});

// --- Догоняющий запрос миниатюры ----------------------------------------------

describe('догоняющий запрос миниатюры', () => {
  const withClient = (client: ApiClient) =>
    ({ children }: { children: ReactNode }) => <ChatProvider client={client}>{children}</ChatProvider>;

  /** Плитки одного сообщения под провайдером с поддельным клиентом. */
  function renderCatchUp(client: ApiClient, attachments: Attachment[], messageId = 'm1') {
    const Wrapper = withClient(client);

    return render(
      <Wrapper>
        <MessageAttachments
          messageId={messageId}
          attachments={attachments}
          own={false}
          theme={LIGHT}
          fontSize={15}
          onOpenImage={vi.fn()}
        />
      </Wrapper>,
    );
  }

  /** Проматывает паузы серии: каждая попытка отделена таймером. */
  async function runAttempts(count: number) {
    for (let attempt = 0; attempt < count; attempt++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(PREVIEW_RETRY_DELAYS[attempt]!);
      });
    }
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('подменяет ожидание изображением, как только миниатюра появилась', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { ...message('m1', { attachments: [image('a1')] }) },
    });
    renderCatchUp({ get } as unknown as ApiClient, [image('a1', { thumb_url: null })]);

    expect(screen.getByTestId('attachment-waiting')).toBeInTheDocument();

    await runAttempts(1);

    // Перезагрузка приложения для этого не нужна: та же смонтированная плитка.
    expect(screen.queryByTestId('attachment-waiting')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/v1/attachments/a1/thumb');
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/messages/m1');
  });

  it('спрашивает раз на сообщение, а не на каждую плитку', async () => {
    const get = vi.fn().mockResolvedValue({ data: message('m1', { attachments: [] }) });
    renderCatchUp({ get } as unknown as ApiClient, [
      image('a1', { thumb_url: null }),
      image('a2', { thumb_url: null }),
      image('a3', { thumb_url: null }),
    ]);

    await runAttempts(1);

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('после трёх попыток объясняет отказ и больше не спрашивает', async () => {
    // Миниатюра так и не приготовилась: сервер отвечает без неё.
    const get = vi.fn().mockResolvedValue({
      data: message('m1', { attachments: [image('a1', { thumb_url: null })] }),
    });
    const { container } = renderCatchUp({ get } as unknown as ApiClient, [image('a1', { thumb_url: null })]);

    await runAttempts(PREVIEW_RETRY_DELAYS.length);

    expect(get).toHaveBeenCalledTimes(PREVIEW_RETRY_DELAYS.length);
    const tile = screen.getByTestId('attachment-no-thumb');
    expect(tile).toHaveAccessibleName('a1.jpg: миниатюра недоступна, откроется оригинал');
    expect(tile).toHaveTextContent('Миниатюра недоступна');

    // Плитка остаётся нажимаемой — открывается оригинал.
    expect(screen.getByLabelText('Открыть изображение a1.jpg')).toBeEnabled();

    // Новых обращений не уходит, сколько бы времени ни прошло.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(get).toHaveBeenCalledTimes(PREVIEW_RETRY_DELAYS.length);
    expect(container.querySelector('img')).toBeNull();
  });

  it('не ходит за миниатюрой, когда все готовы', async () => {
    const get = vi.fn();
    renderCatchUp({ get } as unknown as ApiClient, [image('a1'), document('d1')]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(get).not.toHaveBeenCalled();
  });

  it('добирает миниатюру и у получателя события message.created.v1', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const page: MessagePage = { data: [message('m1')], meta: { next_cursor: null } };
    queryClient.setQueryData(['chat', 'messages', 'r1'], { pages: [page], pageParams: [null] });

    // Отправитель — другой человек: у получателя сообщение приходит событием,
    // и миниатюра в нём ещё не готова.
    applyRoomEvent(queryClient, {
      event: 'message.created.v1',
      version: 1,
      room_id: 'r1',
      occurred_at: '2026-08-24T12:00:05Z',
      data: {
        id: 'm2',
        kind: 'text',
        author: { id: 'u1', name: 'Alice' },
        body: '',
        payload: null,
        reply_to_id: null,
        created_at: '2026-08-24T12:00:04Z',
        attachments: [image('a1', { thumb_url: null })],
      },
    });

    const cached = queryClient.getQueryData<{ pages: MessagePage[] }>(['chat', 'messages', 'r1']);
    const incoming = cached!.pages[0]!.data.find((item) => item.id === 'm2')!;
    expect(incoming.attachments[0]!.thumb_url).toBeNull();

    const get = vi.fn().mockResolvedValue({ data: message('m2', { attachments: [image('a1')] }) });
    const client = { get } as unknown as ApiClient;

    render(
      <ChatProvider client={client}>
        <QueryClientProvider client={queryClient}>
          <Harness messages={cached!.pages[0]!.data} />
        </QueryClientProvider>
      </ChatProvider>,
    );

    expect(screen.getByTestId('attachment-waiting')).toBeInTheDocument();

    await runAttempts(1);

    expect(get).toHaveBeenCalledWith('/messages/m2');
    expect(screen.queryByTestId('attachment-waiting')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/v1/attachments/a1/thumb');
  });
});

// --- 3.5: real-time -----------------------------------------------------------

describe('вложения из события message.created.v1', () => {
  it('кладёт плитки в кэш сразу из события, без перезапроса истории', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const page: MessagePage = { data: [message('m1')], meta: { next_cursor: null } };
    queryClient.setQueryData(['chat', 'messages', 'r1'], { pages: [page], pageParams: [null] });

    applyRoomEvent(queryClient, {
      event: 'message.created.v1',
      version: 1,
      room_id: 'r1',
      occurred_at: '2026-08-24T12:00:05Z',
      data: {
        id: 'm2',
        kind: 'text',
        author: { id: 'u1', name: 'Alice' },
        body: '',
        payload: null,
        reply_to_id: null,
        created_at: '2026-08-24T12:00:04Z',
        attachments: [image('a1'), document('d1')],
      },
    });

    const cached = queryClient.getQueryData<{ pages: MessagePage[] }>(['chat', 'messages', 'r1']);
    const fresh = cached!.pages[0]!.data.find((item) => item.id === 'm2')!;

    expect(fresh.attachments).toHaveLength(2);
    expect(fresh.attachments[0]!.thumb_url).toBe('/api/v1/attachments/a1/thumb');

    // Плитки рисуются из кэша: экрану не нужен повторный запрос истории.
    render(
      <QueryClientProvider client={queryClient}>
        <Harness messages={cached!.pages[0]!.data} />
      </QueryClientProvider>,
    );
    expect(screen.getByLabelText('Открыть изображение a1.jpg')).toBeInTheDocument();
  });
});
