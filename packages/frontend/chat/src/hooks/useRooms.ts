import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roomsApi } from '../api';
import { useChatClient } from '../adapters/ChatProvider';
import type { CreateRoomInput, UpdateRoomInput } from '../schemas/room';

const ROOMS_KEY = ['chat', 'rooms'] as const;
const roomKey = (roomId: string) => ['chat', 'rooms', roomId] as const;
const membersKey = (roomId: string) => ['chat', 'rooms', roomId, 'members'] as const;

export function useRooms(search?: string) {
  const client = useChatClient();

  return useQuery({
    queryKey: [...ROOMS_KEY, { search: search ?? '' }],
    queryFn: () => roomsApi.list(client, search ? { search } : {}),
  });
}

export function useRoom(roomId: string) {
  const client = useChatClient();

  return useQuery({ queryKey: roomKey(roomId), queryFn: () => roomsApi.get(client, roomId) });
}

export function useMembers(roomId: string) {
  const client = useChatClient();

  return useQuery({ queryKey: membersKey(roomId), queryFn: () => roomsApi.members(client, roomId) });
}

export function useCreateRoom() {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRoomInput) => roomsApi.create(client, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOMS_KEY }),
  });
}

/** Управление самой комнатой: название с описанием и удаление навсегда. */
export function useRoomActions(roomId: string) {
  const client = useChatClient();
  const queryClient = useQueryClient();

  return {
    update: useMutation({
      mutationFn: (input: UpdateRoomInput) => roomsApi.update(client, roomId, input),
      onSuccess: (room) => {
        // Новое название видно сразу — и в шапке комнаты, и в списке.
        queryClient.setQueryData(roomKey(roomId), room);
        void queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
      },
    }),
    remove: useMutation({
      mutationFn: () => roomsApi.remove(client, roomId),
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: roomKey(roomId) });
        queryClient.removeQueries({ queryKey: membersKey(roomId) });
        queryClient.removeQueries({ queryKey: ['chat', 'messages', roomId] });
        void queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
      },
    }),
  };
}

export function useMembershipActions(roomId: string) {
  const client = useChatClient();
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: membersKey(roomId) });
    void queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
  };

  return {
    invite: useMutation({
      mutationFn: (userId: string) => roomsApi.invite(client, roomId, userId),
      onSuccess: invalidate,
    }),
    join: useMutation({ mutationFn: () => roomsApi.join(client, roomId), onSuccess: invalidate }),
    leave: useMutation({ mutationFn: () => roomsApi.leave(client, roomId), onSuccess: invalidate }),
    changeRole: useMutation({
      mutationFn: ({ memberId, role }: { memberId: string; role: 'admin' | 'member' }) =>
        roomsApi.changeRole(client, roomId, memberId, role),
      onSuccess: invalidate,
    }),
  };
}
