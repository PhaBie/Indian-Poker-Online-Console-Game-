import { WebSocket } from 'ws';
import { ClientEvent, HandRank, Card } from '../../shared/types';
import { RoomManager } from '../domain/models/RoomManager';

export interface SocketSession {
    playerId: string;
    roomId: string | null;
}

export interface NetworkContext {
    roomManager: RoomManager;
    sessionStore: {
        createSession: (playerId: string) => string;
        getPlayerId: (token: string) => string | null;
    };
    connectedClients: Map<WebSocket, SocketSession>;
}

export function handleClientMessage(wsClient: WebSocket, message: ClientEvent, context: NetworkContext): void {
    // รอคนเลือก
}

export function handleClientDisconnect(wsClient: WebSocket, context: NetworkContext): void {
    // รอคนเลือก
}

export function broadcastGameStateUpdate(roomId: string, context: NetworkContext): void {
    // รอคนเลือก
}

export function broadcastGameResult(roomId: string, winnerIds: string[], winningHand: HandRank, payouts: Record<string, number>, exposedCards: Record<string, Card[]>, context: NetworkContext): void {
    // รอคนเลือก
}
