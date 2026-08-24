/* ============================================================================
   ПРАВА ДОСТУПА
   Одно место, где решается: что человек видит и что может делать.
   Интерфейс никогда не решает это сам — только спрашивает функции отсюда.
   ========================================================================== */

import type {
  AccessDenial,
  FamilyMember,
  FamilyRole,
  Permission,
  PermissionMatrix,
  Room,
  RoomId,
} from './chat.types';

/** Базовый набор прав для каждой роли. */
export const ROLE_PERMISSIONS: PermissionMatrix = {
  owner: [
    'room.view', 'room.write', 'room.create', 'room.manage', 'room.invite',
    'message.delete.own', 'message.delete.any', 'message.pin', 'ai.enhance',
  ],
  parent: [
    'room.view', 'room.write', 'room.create', 'room.invite',
    'message.delete.own', 'message.delete.any', 'message.pin', 'ai.enhance',
  ],
  teen: [
    'room.view', 'room.write', 'message.delete.own', 'ai.enhance',
  ],
  // Ребёнку магическая кнопка выключена по умолчанию —
  // родитель включает её через extraPermissions: ['ai.enhance'].
  child: [
    'room.view', 'room.write', 'message.delete.own',
  ],
  guest: [
    'room.view', 'room.write', 'message.delete.own',
  ],
};

/** Есть ли у человека право — с учётом личных надбавок и запретов. */
export function can(member: FamilyMember, permission: Permission): boolean {
  if (member.revokedPermissions?.includes(permission)) return false;
  if (member.extraPermissions?.includes(permission)) return true;
  return ROLE_PERMISSIONS[member.role].includes(permission);
}

/** Видит ли человек комнату в списке. */
export function canReadRoom(member: FamilyMember, room: Room): boolean {
  if (room.memberIds) return room.memberIds.includes(member.id);
  return room.readRoles.includes(member.role);
}

/** Может ли писать в эту комнату. */
export function canWriteRoom(member: FamilyMember, room: Room): boolean {
  if (!canReadRoom(member, room)) return false;
  if (!can(member, 'room.write')) return false;
  return room.writeRoles.includes(member.role);
}

/** Может ли пользоваться магической кнопкой здесь. */
export function canEnhance(member: FamilyMember, room: Room): boolean {
  return canWriteRoom(member, room) && can(member, 'ai.enhance');
}

/** Комнаты для списка: сначала общая и закреплённые, потом остальные. */
export function visibleRooms(member: FamilyMember, rooms: Room[]): Room[] {
  return rooms
    .filter((room) => canReadRoom(member, room))
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const at = a.lastMessage?.sentAt ?? 0;
      const bt = b.lastMessage?.sentAt ?? 0;
      return bt - at;
    });
}

/** Комната, в которую человек попадает при входе в приложение. */
export function defaultRoomId(member: FamilyMember, rooms: Room[]): RoomId {
  const general = rooms.find((r) => r.isDefault && canReadRoom(member, r));
  return (general ?? visibleRooms(member, rooms)[0]).id;
}

/** Текст для закрытой комнаты — показываем вместо молчаливого отказа. */
export function denialFor(member: FamilyMember, room: Room): AccessDenial | null {
  if (canReadRoom(member, room)) return null;
  if (room.memberIds) {
    return {
      roomId: room.id,
      reason: 'not-invited',
      message: `В комнату «${room.title}» приглашают участники. Попросите родителей добавить вас.`,
    };
  }
  const who = room.readRoles.map(roleName).join(', ');
  return {
    roomId: room.id,
    reason: 'role',
    message: `Комната «${room.title}» открыта только для: ${who}.`,
  };
}

export function roleName(role: FamilyRole): string {
  const names: Record<FamilyRole, string> = {
    owner: 'создатель семьи',
    parent: 'родители',
    teen: 'подростки',
    child: 'дети',
    guest: 'гости',
  };
  return names[role];
}
