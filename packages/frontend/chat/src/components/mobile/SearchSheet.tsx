import { RADIUS, Sheet, type ThemeTokens } from '@vendor/ui';
import { useState } from 'react';
import { formatTime } from '../../format';
import { useMessageSearch } from '../../hooks/useMessageSearch';

interface SearchSheetProps {
  open: boolean;
  roomId: string;
  roomName: string;
  theme: ThemeTokens;
  onClose: () => void;
  /** Переход к найденному сообщению; false — его нет в загруженной истории. */
  onSelect: (messageId: string) => boolean;
}

/** Поиск по истории комнаты: результаты, пустой ответ и отдельно — недоступный индекс. */
export function SearchSheet({ open, roomId, roomName, theme, onClose, onSelect }: SearchSheetProps) {
  const [term, setTerm] = useState('');
  const [missing, setMissing] = useState(false);
  const { data, isFetching, degraded, error } = useMessageSearch(term, roomId);
  const ready = term.trim().length >= 2;

  return (
    <Sheet open={open} title="Поиск" subtitle={roomName} theme={theme} onClose={onClose}>
      <div className="px-4 pb-6">
        <label htmlFor="chat-search" className="block text-[13px] mb-1" style={{ color: theme.muted }}>
          Что ищем
        </label>
        <input
          id="chat-search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setMissing(false);
          }}
          placeholder="Минимум два символа"
          className="w-full px-3 py-2 outline-none"
          style={{ background: theme.surfaceAlt, borderRadius: RADIUS.sm, color: theme.text, fontSize: 16 }}
        />

        <div className="mt-3">
          {!ready ? (
            <p className="text-[14px]" style={{ color: theme.faint }}>
              Ищем по сообщениям этой комнаты.
            </p>
          ) : degraded ? (
            <p role="alert" className="text-[14px]" style={{ color: theme.amberText }}>
              Поиск сейчас недоступен — сам чат работает как обычно.
            </p>
          ) : error ? (
            <p role="alert" className="text-[14px]" style={{ color: theme.danger }}>
              Не удалось выполнить поиск.
            </p>
          ) : isFetching ? (
            <p aria-busy="true" className="text-[14px]" style={{ color: theme.muted }}>
              Ищем…
            </p>
          ) : !data || data.length === 0 ? (
            <p role="status" className="text-[14px]" style={{ color: theme.muted }}>
              Ничего не нашлось.
            </p>
          ) : (
            <ul aria-label="Результаты поиска" style={{ background: theme.surface, borderRadius: RADIUS.md, overflow: 'hidden' }}>
              {data.map((message, index) => (
                <li key={message.id}>
                  <button
                    type="button"
                    aria-label={`Перейти к сообщению ${message.id}`}
                    onClick={() => {
                      if (onSelect(message.id)) {
                        onClose();

                        return;
                      }

                      setMissing(true);
                    }}
                    className="w-full text-left px-3 py-2.5 tap"
                    style={{
                      borderBottom: index === data.length - 1 ? 'none' : `1px solid ${theme.hairline}`,
                    }}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-[14px] font-medium truncate" style={{ color: theme.text }}>
                        {message.author_name ?? 'Участник'}
                      </span>
                      <span className="text-[12px] tnum shrink-0" style={{ color: theme.faint }}>
                        {formatTime(message.created_at)}
                      </span>
                    </span>
                    <span className="block text-[14px] mt-0.5" style={{ color: theme.muted }}>
                      {message.body}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {missing ? (
            <p role="status" className="text-[13px] mt-2" style={{ color: theme.muted }}>
              Это сообщение ещё не загружено — откройте историю выше и повторите переход.
            </p>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}
