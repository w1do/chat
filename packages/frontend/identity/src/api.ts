import type { ApiClient } from '@vendor/api-client';
import { authTokenStore } from './token-store';
import type {
  EmailInput,
  ForgotPasswordInput,
  PasswordChangeInput,
  LoginInput,
  ProfileInput,
  RegisterInput,
  ResetPasswordInput,
} from './schemas/auth';

export interface AuthUser {
  id: string;
  login: string;
  name: string;
  email: string | null;
  locale: string;
  timezone: string;
  email_verified_at: string | null;
  created_at: string;
  /** false — пароль выдан системой при входе по приглашению. */
  password_set?: boolean;
  /** Текущая аватарка, мелкий размер; null — рисуется буква имени. */
  avatar_url: string | null;
  /** Та же аватарка крупно — для экрана профиля. */
  avatar_large_url: string | null;
  /** Личные обои переписки; видны только владельцу. */
  wallpaper_url: string | null;
}

/** Изображение профиля: аватарка из набора или обои. */
export interface ProfileImage {
  id: string;
  url: string;
  thumb_url: string | null;
  current?: boolean;
}

interface UserEnvelope {
  data: AuthUser;
}

/** Ответ входа: пользователь и его новый токен доступа (ADR-012). */
interface AuthenticatedEnvelope extends UserEnvelope {
  token: string;
}

function imageBody(file: File): FormData {
  const body = new FormData();
  body.append('image', file);

  return body;
}

export const identityApi = {
  /** Набор аватарок человека: его видит только он сам. */
  async avatars(client: ApiClient): Promise<ProfileImage[]> {
    return ((await client.get('/me/avatars')) as { data: ProfileImage[] }).data;
  },
  async uploadAvatar(client: ApiClient, file: File): Promise<ProfileImage> {
    return ((await client.post('/me/avatars', { body: imageBody(file) })) as { data: ProfileImage }).data;
  },
  /** Выбор прежней аватарки: файл не перезагружается. */
  async selectAvatar(client: ApiClient, avatarId: string): Promise<ProfileImage> {
    return ((await client.patch(`/me/avatars/${avatarId}`)) as { data: ProfileImage }).data;
  },
  async deleteAvatar(client: ApiClient, avatarId: string): Promise<void> {
    await client.delete(`/me/avatars/${avatarId}`);
  },
  /** Снять текущую, сохранив набор: вернуться к букве имени. */
  async clearAvatar(client: ApiClient): Promise<void> {
    await client.delete('/me/avatar');
  },
  async setWallpaper(client: ApiClient, file: File): Promise<ProfileImage> {
    return ((await client.post('/me/wallpaper', { body: imageBody(file) })) as { data: ProfileImage }).data;
  },
  async clearWallpaper(client: ApiClient): Promise<void> {
    await client.delete('/me/wallpaper');
  },
  async login(client: ApiClient, input: LoginInput): Promise<AuthUser> {
    return authenticated((await client.post('/auth/login', { body: input })) as AuthenticatedEnvelope);
  },
  async register(client: ApiClient, input: RegisterInput): Promise<AuthUser> {
    return authenticated((await client.post('/auth/register', { body: input })) as AuthenticatedEnvelope);
  },
  async logout(client: ApiClient): Promise<void> {
    try {
      await client.post('/auth/logout');
    } finally {
      // Токен стирается в любом исходе: сервер мог его уже отозвать, а
      // оставленное значение только притворялось бы входом.
      authTokenStore().clear();
    }
  },
  async forgotPassword(client: ApiClient, input: ForgotPasswordInput): Promise<void> {
    await client.post('/auth/forgot-password', { body: input });
  },
  async resetPassword(client: ApiClient, input: ResetPasswordInput): Promise<void> {
    await client.post('/auth/reset-password', { body: input });
  },
  async me(client: ApiClient): Promise<AuthUser> {
    return ((await client.get('/me')) as UserEnvelope).data;
  },
  async updateProfile(client: ApiClient, input: Partial<ProfileInput>): Promise<AuthUser> {
    return ((await client.patch('/me/profile', { body: input })) as UserEnvelope).data;
  },
  async updateEmail(client: ApiClient, input: EmailInput): Promise<AuthUser> {
    // Пустая строка означает «убрать почту».
    const email = input.email.trim() === '' ? null : input.email.trim();

    return ((await client.patch('/me/email', { body: { email } })) as UserEnvelope).data;
  },
  async changePassword(client: ApiClient, input: PasswordChangeInput): Promise<void> {
    await client.patch('/me/password', { body: input });
  },
};

/** Вход состоялся: с этого момента клиент представляется выданным токеном. */
function authenticated(envelope: AuthenticatedEnvelope): AuthUser {
  authTokenStore().save(envelope.token);

  return envelope.data;
}
