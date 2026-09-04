import { GameActionType, ServerPlayer } from '../../shared/types';

export function processPlayerAction(roomId: string, playerId: string, action: GameActionType, amount?: number): void {
    // รอคนเลือก
}

export function processBet(player: ServerPlayer, amount: number): void {
    // รอคนเลือก
}

export function moveToNextTurn(roomId: string): void {
    // รอคนเลือก
}

export function checkEndCondition(roomId: string): boolean {
    // รอคนเลือก
    return false;
}

export function endGame(roomId: string): void {
    // รอคนเลือก
}
