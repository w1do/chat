import type { ConnectionState } from '../adapters/RealtimeAdapter';

export function ConnectionBanner({ state }: { state: ConnectionState }) {
  if (state === 'connected') return null;

  return (
    <p role="alert" aria-live="assertive" aria-label="Состояние соединения">
      {state === 'disconnected' ? 'Соединение потеряно.' : 'Переподключение… история будет синхронизирована.'}
    </p>
  );
}
