import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIGHT } from '@vendor/ui';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChatScreen } from '../src/components/mobile/ChatScreen';
import { FileSummarySheet } from '../src/components/mobile/FileSummarySheet';
import type { FileSummaryState } from '../src/hooks/useFileSummary';
import { isSummarizableAttachment, mentionsSummaryTrigger } from '../src/schemas/fileSummary';
import type { Attachment, Message } from '../src/schemas/message';
import type { Member, Room } from '../src/schemas/room';

const room: Room = {
  id: 'r1',
  name: 'Общая',
  topic: null,
  visibility: 'public',
  created_by: 'u1',
  archived_at: null,
  created_at: '2026-08-27T10:00:00Z',
  my_role: 'member',
  member_count: 2,
  unread_count: 0,
  photo_url: null,
  photo_large_url: null,
  kind: 'room',
  counterpart: null,
};

const members: Member[] = [
  { id: 'm1', room_id: 'r1', user_id: 'u1', role: 'owner', joined_at: '', name: 'Alice', username: 'alice', avatar_url: null, is_online: false, last_seen_at: null },
];

const document = (name: string): Attachment => ({
  id: `a-${name}`,
  name,
  mime_type: 'application/pdf',
  size: 2048,
  url: `/api/v1/attachments/a-${name}`,
  thumb_url: null,
  width: null,
  height: null,
});

const withFile = (attachments: Attachment[]): Message => ({
  id: 'm1',
  room_id: 'r1',
  kind: 'text',
  author_id: 'u1',
  author_name: 'Alice',
  author_avatar_url: null,
  reply_to_id: null,
  body: 'Смотрите документ',
  mentions: [],
  is_edited: false,
  edited_at: null,
  deleted: false,
  created_at: '2026-08-27T12:00:00Z',
  reactions: [],
  attachments,
  payload: null,
});

const draftState = (summary: string): FileSummaryState => ({
  phase: 'draft',
  progress: 100,
  fileName: 'dogovor.pdf',
  error: null,
  summary: {
    id: 's1',
    status: 'succeeded',
    room_id: 'r1',
    message_id: 'm1',
    file: { id: 'a-dogovor.pdf', name: 'dogovor.pdf', mime_type: 'application/pdf', size: 2048 },
    summary,
    lead_in: 'Вот что:',
    error_code: null,
    published_message_id: null,
    created_at: '2026-08-27T12:00:00Z',
  },
});

function Harness(props: Partial<React.ComponentProps<typeof ChatScreen>>) {
  const [draft, setDraft] = useState('');

  return (
    <ChatScreen
      room={room}
      messages={[withFile([document('dogovor.pdf')])]}
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
      aiEnabled
      undoText={null}
      magicBusy={false}
      draft={draft}
      onDraftChange={setDraft}
      onSend={async () => undefined}
      onBack={vi.fn()}
      onLoadMore={vi.fn()}
      onTyping={vi.fn()}
      onToggleReaction={vi.fn()}
      onDeleteMessage={vi.fn()}
      onMagic={vi.fn()}
      onUndoMagic={vi.fn()}
      {...props}
    />
  );
}

/** Свайп влево по сообщению открывает ответ на него. */
function replyTo(element: Element): void {
  fireEvent.pointerDown(element, { clientX: 200, clientY: 100, button: 0 });
  fireEvent.pointerMove(element, { clientX: 120, clientY: 100 });
  fireEvent.pointerMove(element, { clientX: 100, clientY: 100 });
  fireEvent.pointerUp(element, { clientX: 100, clientY: 100 });
}

describe('распознавание просьбы к помощнику', () => {
  it('считает документом только то, что помощник умеет прочитать', () => {
    expect(isSummarizableAttachment({ name: 'dogovor.pdf' })).toBe(true);
    expect(isSummarizableAttachment({ name: 'AKT.DOCX' })).toBe(true);
    expect(isSummarizableAttachment({ name: 'zametki.txt' })).toBe(true);
    expect(isSummarizableAttachment({ name: 'foto.jpg' })).toBe(false);
    expect(isSummarizableAttachment({ name: 'arhiv.zip' })).toBe(false);
    expect(isSummarizableAttachment({ name: 'bez-rasshireniya' })).toBe(false);
  });

  it('узнаёт токен отдельным словом и не путает его с частью слова', () => {
    expect(mentionsSummaryTrigger('@ai перескажи')).toBe(true);
    expect(mentionsSummaryTrigger('перескажи, @AI')).toBe(true);
    expect(mentionsSummaryTrigger('напиши @aidar завтра')).toBe(false);
    expect(mentionsSummaryTrigger('обычный ответ')).toBe(false);
  });
});

describe('ChatScreen: ответ с «@ai» на документ', () => {
  it('подсказывает про помощника, когда отвечают на документ', async () => {
    render(<Harness onSummarizeFile={vi.fn()} />);

    replyTo(screen.getByText('Смотрите документ').closest('article')!);

    expect(await screen.findByTestId('summary-hint')).toHaveTextContent(
      'Напишите @ai, чтобы помощник пересказал «dogovor.pdf»',
    );
  });

  it('отправляет запрос помощнику вместо обычного ответа', async () => {
    const onSummarizeFile = vi.fn();
    const onSend = vi.fn(async () => undefined);
    render(<Harness onSummarizeFile={onSummarizeFile} onSend={onSend} />);

    replyTo(screen.getByText('Смотрите документ').closest('article')!);

    const composer = screen.getByRole('textbox', { name: 'Сообщение' });
    await userEvent.type(composer, '@ai что тут');
    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }));

    expect(onSummarizeFile).toHaveBeenCalledWith({
      messageId: 'm1',
      body: '@ai что тут',
      fileName: 'dogovor.pdf',
    });
    // Просьба к помощнику не превращается в сообщение комнаты.
    expect(onSend).not.toHaveBeenCalled();
    expect(composer).toHaveValue('');
  });

  it('оставляет обычный ответ обычным, когда помощника не звали', async () => {
    const onSummarizeFile = vi.fn();
    const onSend = vi.fn(async () => undefined);
    render(<Harness onSummarizeFile={onSummarizeFile} onSend={onSend} />);

    replyTo(screen.getByText('Смотрите документ').closest('article')!);
    await userEvent.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'спасибо');
    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }));

    expect(onSend).toHaveBeenCalled();
    expect(onSummarizeFile).not.toHaveBeenCalled();
  });

  it('не зовёт помощника к фотографии и к пачке файлов', async () => {
    const onSummarizeFile = vi.fn();
    const onSend = vi.fn(async () => undefined);
    render(
      <Harness
        messages={[withFile([document('foto.jpg'), document('dogovor.pdf')])]}
        onSummarizeFile={onSummarizeFile}
        onSend={onSend}
      />,
    );

    replyTo(screen.getByText('Смотрите документ').closest('article')!);
    expect(screen.queryByTestId('summary-hint')).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: 'Сообщение' }), '@ai перескажи');
    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }));

    expect(onSummarizeFile).not.toHaveBeenCalled();
    expect(onSend).toHaveBeenCalled();
  });

  it('молчит про помощника, когда его выключил администратор', () => {
    render(<Harness aiEnabled={false} onSummarizeFile={vi.fn()} />);

    replyTo(screen.getByText('Смотрите документ').closest('article')!);

    expect(screen.queryByTestId('summary-hint')).not.toBeInTheDocument();
  });
});

describe('FileSummarySheet', () => {
  const idle: FileSummaryState = { phase: 'idle', progress: 0, summary: null, fileName: null, error: null };

  it('показывает ход обработки и говорит, что документ читает внешний ИИ', () => {
    render(
      <FileSummarySheet
        state={{ ...idle, phase: 'working', progress: 50, fileName: 'dogovor.pdf' }}
        theme={LIGHT}
        onPublish={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Документ обрабатывается внешним ИИ…');
    expect(screen.getByText('dogovor.pdf')).toBeInTheDocument();
  });

  it('показывает черновик и спрашивает про публикацию', async () => {
    const onPublish = vi.fn();
    const onClose = vi.fn();
    render(
      <FileSummarySheet
        state={draftState('Договор на год, оплата ежемесячно.')}
        theme={LIGHT}
        onPublish={onPublish}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId('file-summary-draft')).toHaveTextContent('Договор на год, оплата ежемесячно.');
    expect(screen.getByText(/пересказ увидите только вы|увидите только вы/i)).toBeInTheDocument();
    expect(screen.getByText('Отправить пересказ в чат?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Не отправлять' }));
    expect(onClose).toHaveBeenCalled();
    expect(onPublish).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(onPublish).toHaveBeenCalled();
  });

  it('объясняет отказ словами и не блокирует переписку', () => {
    render(
      <FileSummarySheet
        state={{ ...idle, phase: 'error', fileName: 'skan.pdf', error: 'В этом документе нет текста, который можно прочитать.' }}
        theme={LIGHT}
        onPublish={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('В этом документе нет текста');
    // Кнопка не повторяет крестик листа: два «Закрыть» читались бы как одно.
    expect(screen.getByRole('button', { name: 'Понятно' })).toBeInTheDocument();
  });
});
