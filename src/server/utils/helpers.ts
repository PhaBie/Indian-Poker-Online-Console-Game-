import { randomUUID, randomBytes } from 'crypto';
import type { PublicPlayerDTO, ServerPlayer } from '../../shared/types';

export function toPublicPlayerDTO(player: ServerPlayer): PublicPlayerDTO {
  return {
    id: player.id,
    name: player.name,
    chips: player.chips,
    bet: player.bet,
    status: player.status,
    isBlind: player.isBlind !== undefined ? player.isBlind : true,
  };
}

export function generateRoomId(): string {
  // Use randomBytes(3) which generates 6 hex characters (alphanumeric)
  return randomBytes(3).toString('hex').toUpperCase();
}

export function generatePlayerId(): string {
  // UUID is the standard for fast, unique player IDs
  return randomUUID();
}
