import { invitesApi, type Invite } from '@vendor/chat';
import { useAuth } from '@vendor/identity';
import { RADIUS, Screen, THEMES, type ThemeTokens } from '@vendor/ui';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../app/api';
import { useSettings } from '../app/settings';
import { storeAuthToken } from '../app/token';

/** Экран перехода по приглашению: куда зовут, кто зовёт и как войти. */
export function InvitePage() {
  const { token = '' } = useParams();
  const { settings } = useSettings();
  const theme: ThemeTokens = THEMES[settings.theme];
  const { user } = useAuth();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    invitesApi
      .show(apiClient(), token)
      .then((data) => alive && setInvite(data))
      .catch(() => alive && setFailed(true));

    return () => {
      alive = false;
    };
  }, [token]);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await invitesApi.accept(apiClient(), token, user ? undefined : name.trim());

      // Гостю аккаунт только что создали: свой вход он получает вместе с
      // ответом и ничего больше не вводит (ADR-012).
      if (result.token) storeAuthToken(result.token);

      // Полный переход, а не маршрутизация: вход только что появился, и
      // приложение должно перечитать его, иначе guard уведёт на форму входа.
      window.location.assign(`/rooms/${result.room_id}`);
    } catch {
      setError('Не удалось присоединиться. Возможно, ссылка больше не действует.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen theme={theme} contentClassName="grid place-items-center px-5 py-6">
      <main className="w-full max-w-sm text-center" style={{ color: theme.text }}>
        <span aria-hidden="true" className="inline-block mb-3" style={{ fontSize: 44 }}>
          💬
        </span>

        {failed ? (
          <>
            <h1 className="text-[22px] font-semibold" style={{ letterSpacing: '-0.02em' }}>
              Ссылка недействительна
            </h1>
            <p role="alert" className="text-[14px] mt-2" style={{ color: theme.muted }}>
              Приглашение отозвали или истёк его срок. Попросите новое у того, кто вас звал.
            </p>
          </>
        ) : invite === null ? (
          <p aria-busy="true" className="text-[15px]" style={{ color: theme.muted }}>
            Проверяем приглашение…
          </p>
        ) : (
          <>
            <h1 className="text-[22px] font-semibold" style={{ letterSpacing: '-0.02em' }}>
              {invite.room_name}
            </h1>
            <p className="text-[14px] mt-1 mb-5" style={{ color: theme.muted }}>
              {invite.invited_by_name ? `${invite.invited_by_name} приглашает вас в чат` : 'Вас приглашают в чат'}
            </p>

            <div className="p-5" style={{ background: theme.surface, borderRadius: RADIUS.md }}>
              {user ? (
                <p className="text-[14px] mb-4" style={{ color: theme.muted }}>
                  Вы войдёте как {user.name}.
                </p>
              ) : (
                <>
                  <label htmlFor="invite-name" className="block text-[13px] font-medium mb-1.5 text-left" style={{ color: theme.muted }}>
                    Как вас зовут?
                  </label>
                  <input
                    id="invite-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Имя увидят в комнате"
                    className="w-full px-3.5 py-3 mb-4 outline-none field-focus"
                    style={{ background: theme.surfaceAlt, borderRadius: RADIUS.md, color: theme.text, fontSize: 16 }}
                  />
                </>
              )}

              {error ? (
                <p role="alert" className="text-[13px] mb-3" style={{ color: theme.danger }}>
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                disabled={busy || (!user && name.trim() === '')}
                onClick={() => void accept()}
                className="w-full py-3.5 tap text-[16px] font-medium"
                style={{
                  background: theme.text,
                  color: theme.bg,
                  borderRadius: RADIUS.md,
                  opacity: busy || (!user && name.trim() === '') ? 0.6 : 1,
                }}
              >
                {busy ? 'Заходим…' : user ? `Вступить в «${invite.room_name}»` : 'Присоединиться к чату'}
              </button>

              {!user ? (
                <p className="text-[12.5px] mt-3" style={{ color: theme.faint }}>
                  Аккаунт создастся сам. Логин и пароль поменяете в настройках.
                </p>
              ) : null}
            </div>
          </>
        )}
      </main>
    </Screen>
  );
}
