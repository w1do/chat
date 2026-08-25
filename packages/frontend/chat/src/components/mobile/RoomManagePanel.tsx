import { zodResolver } from '@hookform/resolvers/zod';
import { RADIUS, type ThemeTokens } from '@vendor/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { updateRoomSchema, type Room, type UpdateRoomInput } from '../../schemas/room';

interface RoomManagePanelProps {
  room: Room;
  theme: ThemeTokens;
  onSave: (input: UpdateRoomInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  /** Куда уходит человек, когда комнаты больше нет. */
  onDeleted: () => void;
}

/**
 * Управление комнатой: название с описанием правят владелец и админ, удаляет
 * только владелец. Удаление необратимо, поэтому просит набрать название.
 */
export function RoomManagePanel({ room, theme, onSave, onDelete, onDeleted }: RoomManagePanelProps) {
  const canEdit = room.my_role === 'owner' || room.my_role === 'admin';
  const canDelete = room.my_role === 'owner';

  if (!canEdit && !canDelete) return null;

  return (
    <>
      {canEdit ? <EditForm room={room} theme={theme} onSave={onSave} /> : null}
      {canDelete ? <DeleteBlock room={room} theme={theme} onDelete={onDelete} onDeleted={onDeleted} /> : null}
    </>
  );
}

function EditForm({
  room,
  theme,
  onSave,
}: {
  room: Room;
  theme: ThemeTokens;
  onSave: (input: UpdateRoomInput) => Promise<unknown>;
}) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateRoomInput>({
    resolver: zodResolver(updateRoomSchema),
    defaultValues: { name: room.name, topic: room.topic ?? '' },
  });

  const submit = handleSubmit(async (input) => {
    setSaved(false);
    setServerError(null);
    try {
      await onSave(input);
      setSaved(true);
    } catch {
      setServerError('Не удалось сохранить комнату.');
    }
  });

  return (
    <form aria-label="Комната" noValidate onSubmit={submit} className="px-3 mb-5">
      <div className="p-3 flex flex-col gap-3" style={{ background: theme.surface, borderRadius: RADIUS.md }}>
        <div>
          <label htmlFor="room-name" className="block text-[13px] mb-1" style={{ color: theme.muted }}>
            Название
          </label>
          <input
            id="room-name"
            className="w-full px-3 py-2 outline-none field-focus"
            style={{ background: theme.surfaceAlt, borderRadius: RADIUS.sm, color: theme.text, fontSize: 16 }}
            aria-invalid={errors.name ? true : undefined}
            {...register('name')}
          />
          {errors.name ? (
            <p role="alert" className="mt-1 text-[13px]" style={{ color: theme.danger }}>
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="room-topic" className="block text-[13px] mb-1" style={{ color: theme.muted }}>
            Описание
          </label>
          <input
            id="room-topic"
            className="w-full px-3 py-2 outline-none field-focus"
            style={{ background: theme.surfaceAlt, borderRadius: RADIUS.sm, color: theme.text, fontSize: 16 }}
            {...register('topic')}
          />
        </div>

        {serverError ? (
          <p role="alert" className="text-[13px]" style={{ color: theme.danger }}>
            {serverError}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="text-[13px]" style={{ color: theme.muted }}>
            Сохранено.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 tap text-[15px] font-medium"
          style={{ background: theme.text, color: theme.bg, borderRadius: RADIUS.sm }}
        >
          Сохранить
        </button>
      </div>
    </form>
  );
}

function DeleteBlock({
  room,
  theme,
  onDelete,
  onDeleted,
}: {
  room: Room;
  theme: ThemeTokens;
  onDelete: () => Promise<unknown>;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Цена ошибки — вся переписка, поэтому подтверждение дословное.
  const matches = confirmation.trim() === room.name.trim();

  return (
    <section className="px-3 mb-5">
      <div className="p-3" style={{ background: theme.surface, borderRadius: RADIUS.md }}>
        <p className="text-[13px] mb-2" style={{ color: theme.muted }}>
          Удаление комнаты необратимо: исчезнут все сообщения и участники.
        </p>

        {open ? (
          <>
            <label htmlFor="room-delete-confirm" className="block text-[13px] mb-1" style={{ color: theme.muted }}>
              Введите название комнаты «{room.name}»
            </label>
            <input
              id="room-delete-confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="w-full px-3 py-2 mb-3 outline-none field-focus"
              style={{ background: theme.surfaceAlt, borderRadius: RADIUS.sm, color: theme.text, fontSize: 16 }}
            />
            {error ? (
              <p role="alert" className="mb-2 text-[13px]" style={{ color: theme.danger }}>
                {error}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!matches || busy}
              style={{
                background: theme.danger,
                color: theme.bg,
                borderRadius: RADIUS.sm,
                opacity: matches && !busy ? 1 : 0.5,
              }}
              className="w-full py-2.5 tap text-[15px] font-medium"
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await onDelete();
                  onDeleted();
                } catch {
                  setError('Не удалось удалить комнату.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Удалить навсегда
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full py-2.5 tap text-[15px] font-medium"
            style={{ background: theme.surfaceAlt, color: theme.danger, borderRadius: RADIUS.sm }}
          >
            Удалить комнату
          </button>
        )}
      </div>
    </section>
  );
}
