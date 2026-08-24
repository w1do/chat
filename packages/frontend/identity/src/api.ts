import type { ApiClient } from '@vendor/api-client';
import type {
  ForgotPasswordInput,
  LoginInput,
  ProfileInput,
  RegisterInput,
  ResetPasswordInput,
} from './schemas/auth';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  locale: string;
  timezone: string;
  email_verified_at: string | null;
  created_at: string;
}

interface UserEnvelope {
  data: AuthUser;
}

export const identityApi = {
  async login(client: ApiClient, input: LoginInput): Promise<AuthUser> {
    return ((await client.post('/auth/login', { body: input })) as UserEnvelope).data;
  },
  async register(client: ApiClient, input: RegisterInput): Promise<AuthUser> {
    return ((await client.post('/auth/register', { body: input })) as UserEnvelope).data;
  },
  async logout(client: ApiClient): Promise<void> {
    await client.post('/auth/logout');
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
};
