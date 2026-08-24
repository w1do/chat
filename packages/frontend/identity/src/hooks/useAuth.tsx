import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UnauthenticatedError, type ApiClient } from '@vendor/api-client';
import { createContext, useContext, type ReactNode } from 'react';
import { identityApi, type AuthUser } from '../api';
import type { EmailInput, LoginInput, PasswordChangeInput, ProfileInput, RegisterInput } from '../schemas/auth';

// ApiClient приходит от приложения через провайдер (§4.2) — пакет не создаёт
// собственный экземпляр клиента.
const ApiClientContext = createContext<ApiClient | null>(null);

export function IdentityProvider({ client, children }: { client: ApiClient; children: ReactNode }) {
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error('IdentityProvider is missing above this component.');
  return client;
}

const ME_KEY = ['identity', 'me'] as const;

export function useAuth() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  const me = useQuery<AuthUser | null>({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await identityApi.me(client);
      } catch (error) {
        if (error instanceof UnauthenticatedError) return null;
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const login = useMutation({
    mutationFn: (input: LoginInput) => identityApi.login(client, input),
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  });

  const register = useMutation({
    mutationFn: (input: RegisterInput) => identityApi.register(client, input),
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  });

  const logout = useMutation({
    mutationFn: () => identityApi.logout(client),
    onSuccess: () => queryClient.setQueryData(ME_KEY, null),
  });

  const updateProfile = useMutation({
    mutationFn: (input: Partial<ProfileInput>) => identityApi.updateProfile(client, input),
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  });

  const updateEmail = useMutation({
    mutationFn: (input: EmailInput) => identityApi.updateEmail(client, input),
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  });

  const changePassword = useMutation({
    mutationFn: (input: PasswordChangeInput) => identityApi.changePassword(client, input),
  });

  return {
    user: me.data ?? null,
    isLoading: me.isLoading,
    isAuthenticated: me.data != null,
    login,
    register,
    logout,
    updateProfile,
    updateEmail,
    changePassword,
  };
}
