import type { WebSocket } from 'ws';
import type { ClientEvent, HandRank, Card } from '../../shared/types';
import type { RoomManager } from '../domain/models/RoomManager';

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

export function handleClientMessage(
  _wsClient: WebSocket,
  _message: ClientEvent,
  _context: NetworkContext,
): void {
  // รอคนเลือก
}

export function handleClientDisconnect(
  _wsClient: WebSocket,
  _context: NetworkContext,
): void {
  // รอคนเลือก
}

export function broadcastGameStateUpdate(
  _roomId: string,
  _context: NetworkContext,
): void {
  // รอคนเลือก
}

export function broadcastGameResult(
  _roomId: string,
  _winnerIds: string[],
  _winningHand: HandRank,
  _payouts: Record<string, number>,
  _exposedCards: Record<string, Card[]>,
  _context: NetworkContext,
): void {
  // รอคนเลือก
}
