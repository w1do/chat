import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { identityApi, type ProfileImage } from '../api';
import { useApiClient } from './useAuth';

const ME_KEY = ['identity', 'me'] as const;
const AVATARS_KEY = ['identity', 'avatars'] as const;

/** Набор аватарок человека: его видит только он сам. */
export function useAvatars() {
  const client = useApiClient();

  return useQuery<ProfileImage[]>({ queryKey: AVATARS_KEY, queryFn: () => identityApi.avatars(client) });
}

/**
 * Действия над своими изображениями. После каждого перечитывается профиль:
 * аватарка показана и в шапке, и в списках, и они не должны разъезжаться.
 */
export function useProfileImageActions() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: AVATARS_KEY });
    void queryClient.invalidateQueries({ queryKey: ME_KEY });
    // Аватарка видна и в составе комнат: список участников перечитывается.
    void queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
  };

  return {
    upload: useMutation({
      mutationFn: (file: File) => identityApi.uploadAvatar(client, file),
      onSuccess: refresh,
    }),
    select: useMutation({
      mutationFn: (avatarId: string) => identityApi.selectAvatar(client, avatarId),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (avatarId: string) => identityApi.deleteAvatar(client, avatarId),
      onSuccess: refresh,
    }),
    clear: useMutation({ mutationFn: () => identityApi.clearAvatar(client), onSuccess: refresh }),
    setWallpaper: useMutation({
      mutationFn: (file: File) => identityApi.setWallpaper(client, file),
      onSuccess: refresh,
    }),
    clearWallpaper: useMutation({ mutationFn: () => identityApi.clearWallpaper(client), onSuccess: refresh }),
  };
}
