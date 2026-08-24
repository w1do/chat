// Реализация типизированного контракта permissions/capabilities для feature-пакетов.
// Наполняется по мере появления ролей (этапы 4–5).
export interface Permissions {
  canManageRoom(roomId: string): boolean;
}

export function createPermissions(): Permissions {
  return {
    canManageRoom: () => false,
  };
}
