import { useState, type FormEvent } from 'react';
import { createRoomSchema, type CreateRoomInput } from '../schemas/room';

interface CreateRoomFormProps {
  onSubmit: (input: CreateRoomInput) => Promise<unknown>;
}

export function CreateRoomForm({ onSubmit }: CreateRoomFormProps) {
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsed = createRoomSchema.safeParse({ name, visibility });
    if (!parsed.success) {
      setError('Укажите название комнаты.');
      return;
    }

    try {
      await onSubmit(parsed.data);
      setName('');
    } catch {
      setError('Не удалось создать комнату.');
    }
  };

  return (
    <form onSubmit={submit} aria-label="create-room">
      {error ? <p role="alert">{error}</p> : null}
      <label htmlFor="new-room-name">Название</label>
      <input id="new-room-name" value={name} onChange={(event) => setName(event.target.value)} />
      <label htmlFor="new-room-visibility">Видимость</label>
      <select
        id="new-room-visibility"
        value={visibility}
        onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
      >
        <option value="public">Публичная</option>
        <option value="private">Приватная</option>
      </select>
      <button type="submit">Создать</button>
    </form>
  );
}
