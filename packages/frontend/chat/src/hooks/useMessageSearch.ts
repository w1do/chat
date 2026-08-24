import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../api';
import { useChatClient } from '../adapters/ChatProvider';
import { isSearchUnavailable } from '../format';

/**
 * Поиск по истории. Запрос уходит от двух символов; недоступность индекса
 * отличается от пустого результата, чтобы UI показал разные состояния.
 */
export function useMessageSearch(term: string, roomId?: string) {
  const client = useChatClient();
  const trimmed = term.trim();

  const query = useQuery({
    queryKey: ['chat', 'search', { term: trimmed, roomId: roomId ?? null }],
    queryFn: () => searchApi.messages(client, { q: trimmed, roomId }),
    enabled: trimmed.length >= 2,
    retry: false,
    staleTime: 30_000,
  });

  return { ...query, degraded: isSearchUnavailable(query.error) };
}
