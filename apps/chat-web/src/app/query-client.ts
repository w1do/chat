// Единственный QueryClient приложения создаётся здесь и передаётся
// feature-пакетам через провайдер (§4.2). Зависимость @tanstack/react-query
// подключается на этапе 3 вместе с генерируемым api-client.
export function createQueryClient(): null {
  return null;
}
