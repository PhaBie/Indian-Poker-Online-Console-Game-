import type { PublicPlayerDTO, ServerPlayer } from '../../shared/types';

export function toPublicPlayerDTO(player: ServerPlayer): PublicPlayerDTO {
    // รอคนเลือก
    return {
        id: player.id,
        name: player.name,
        chips: player.chips,
        bet: player.bet,
        status: player.status,
        isBlind: player.isBlind !== undefined ? player.isBlind : true
    };
}

export function generateRoomId(): string {
    // รอคนเลือก
    return '';
}

export function generatePlayerId(): string {
    // รอคนเลือก
    return '';
}
