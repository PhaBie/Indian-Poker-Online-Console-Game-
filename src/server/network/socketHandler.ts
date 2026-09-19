import type { WebSocket } from 'ws';
import type {
  ClientEvent,
  ServerEvent,
  HandRank,
  Card,
  GameActionType,
} from '../../shared/types';
import type { RoomManager } from '../domain/models/RoomManager';
import { Player } from '../domain/models/Player';
import { generatePlayerId, generateRoomId } from '../utils/helpers';
import { GameError } from '../domain/errors/GameError';

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
  wsClient: WebSocket,
  message: ClientEvent,
  context: NetworkContext,
): void {
  try {
    switch (message.type) {
      case 'CREATE_ROOM':
        handleCreateRoom(wsClient, message.payload, context);
        break;
      case 'JOIN_ROOM':
        handleJoinRoom(wsClient, message.payload, context);
        break;
      case 'START_GAME':
        handleStartGame(wsClient, context);
        break;
      case 'PLAYER_ACTION':
        handlePlayerAction(wsClient, message.payload, context);
        break;
      // Handle other commands like LEAVE_ROOM, SAVE_GAME, etc.
    }
  } catch (error: unknown) {
    if (error instanceof GameError) {
      sendError(wsClient, error.message, error.code);
    } else if (error instanceof Error) {
      sendError(wsClient, error.message);
    } else {
      sendError(wsClient, 'Unknown error');
    }
  }
}

function handleCreateRoom(
  wsClient: WebSocket,
  payload: { playerName: string; bootAmount?: number },
  context: NetworkContext,
) {
  const { playerName, bootAmount } = payload;
  const playerId = generatePlayerId();
  const player = new Player(playerId, playerName);
  const roomId = generateRoomId();

  const room = context.roomManager.createRoom(roomId, player);
  if (bootAmount) room.bootAmount = bootAmount;

  const reconnectToken = context.sessionStore.createSession(playerId);
  context.connectedClients.set(wsClient, { playerId, roomId });

  sendEvent(wsClient, { type: 'SESSION_CREATED', payload: { playerId, reconnectToken } });
  sendEvent(wsClient, { type: 'ROOM_CREATED', payload: { roomId } });

  broadcastGameStateUpdate(roomId, context);
}

function handleJoinRoom(
  wsClient: WebSocket,
  payload: { playerName: string; roomId: string; reconnectToken?: string },
  context: NetworkContext,
) {
  const { playerName, roomId, reconnectToken } = payload;
  const room = context.roomManager.getRoom(roomId);

  if (!room) {
    sendError(wsClient, 'Room not found', 'ROOM_NOT_FOUND');
    return;
  }

  if (reconnectToken) {
    const existingPlayerId = context.sessionStore.getPlayerId(reconnectToken);
    if (!existingPlayerId) {
      sendError(wsClient, 'Invalid token', 'INVALID_TOKEN');
      return;
    }
    const player = room.getPlayer(existingPlayerId);
    if (!player) {
      sendError(wsClient, 'Player not in room', 'NOT_IN_ROOM');
      return;
    }
    room.reconnect(existingPlayerId);
    context.connectedClients.set(wsClient, { playerId: existingPlayerId, roomId });
    broadcastGameStateUpdate(roomId, context);
  } else {
    const playerId = generatePlayerId();
    const player = new Player(playerId, playerName);
    room.join(player);

    const newToken = context.sessionStore.createSession(playerId);
    context.connectedClients.set(wsClient, { playerId, roomId });

    sendEvent(wsClient, {
      type: 'SESSION_CREATED',
      payload: { playerId, reconnectToken: newToken },
    });
    broadcastGameStateUpdate(roomId, context);
  }
}

function handleStartGame(wsClient: WebSocket, context: NetworkContext) {
  const session = context.connectedClients.get(wsClient);
  if (!session || !session.roomId) return;

  const room = context.roomManager.getRoom(session.roomId);
  if (room) {
    room.startGame(session.playerId);
    broadcastGameStateUpdate(session.roomId, context);
  }
}

function handlePlayerAction(
  wsClient: WebSocket,
  payload: { action: GameActionType; amount?: number },
  context: NetworkContext,
) {
  const session = context.connectedClients.get(wsClient);
  if (!session || !session.roomId) {
    sendError(wsClient, 'Not in room', 'NOT_IN_ROOM');
    return;
  }

  const room = context.roomManager.getRoom(session.roomId);
  if (room && room.gameState) {
    room.gameState.processAction(session.playerId, payload.action, payload.amount);
    broadcastGameStateUpdate(session.roomId, context);
  }
}

export function handleClientDisconnect(
  wsClient: WebSocket,
  context: NetworkContext,
): void {
  const session = context.connectedClients.get(wsClient);
  if (session && session.roomId) {
    const room = context.roomManager.getRoom(session.roomId);
    if (room) {
      const player = room.getPlayer(session.playerId);
      if (player) {
        player.status = 'DISCONNECTED';
        broadcastGameStateUpdate(session.roomId, context);
      }
    }
  }
  context.connectedClients.delete(wsClient);
}

export function broadcastGameStateUpdate(roomId: string, context: NetworkContext): void {
  const room = context.roomManager.getRoom(roomId);
  if (!room) return;

  const pot = room.gameState?.pot || 0;
  const currentTurnPlayerId =
    room.gameState?.activePlayers[room.gameState.currentPlayerIndex]?.id || null;
  const publicPlayers = room.getPublicState();
  const hostId = room.hostId || '';

  for (const [client, session] of context.connectedClients.entries()) {
    if (session.roomId === roomId) {
      const player = room.getPlayer(session.playerId);
      // ผู้เล่นที่เป็น Blind จะยังไม่เห็นไพ่ตัวเอง ส่วนคนที่เปิดดู (Seen) หรือเป็นโหมดอื่นจะเห็น
      const myCards = player && !player.isBlind ? player.privateCards : [];

      const payload = {
        roomId,
        phase: room.phase,
        hostId,
        pot,
        currentTurnPlayerId,
        turnEndTime: null,
        players: publicPlayers,
        myCards,
      };

      sendEvent(client, { type: 'GAME_STATE_UPDATE', payload });
    }
  }
}

export function broadcastGameResult(
  roomId: string,
  winnerIds: string[],
  winningHand: HandRank,
  payouts: Record<string, number>,
  exposedCards: Record<string, Card[]>,
  context: NetworkContext,
): void {
  for (const [client, session] of context.connectedClients.entries()) {
    if (session.roomId === roomId) {
      sendEvent(client, {
        type: 'GAME_RESULT',
        payload: {
          winnerIds,
          winningHand,
          payouts,
          exposedCards,
        },
      });
    }
  }
}

// Utility function เพื่อให้โค้ดส่วนหลักอ่านง่ายและสะอาด
function sendEvent(wsClient: WebSocket, event: ServerEvent): void {
  try {
    wsClient.send(JSON.stringify(event));
  } catch {
    // client might be closed
  }
}

function sendError(wsClient: WebSocket, message: string, code?: string): void {
  sendEvent(wsClient, { type: 'ERROR', message, code });
}
