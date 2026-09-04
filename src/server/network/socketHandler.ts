import { WebSocket } from 'ws';
import { ClientEvent, HandRank, Card } from '../../shared/types';

export const connectedClients = new Map<string, WebSocket[]>();

export function handleClientMessage(wsClient: WebSocket, message: ClientEvent): void {
    // รอคนเลือก
}

export function handleClientDisconnect(wsClient: WebSocket): void {
    // รอคนเลือก
}

export function broadcastGameStateUpdate(roomId: string): void {
    // รอคนเลือก
}

export function broadcastGameResult(roomId: string, winnerId: string, winningHand: HandRank, exposedCards: Record<string, Card[]>): void {
    // รอคนเลือก
}
