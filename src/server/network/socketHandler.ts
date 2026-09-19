import type { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import type {
  ClientEvent,
  ServerEvent,
  HandRank,
  Card,
  GameActionType,
} from '../../shared/types';
import type { RoomManager } from '../domain/models/RoomManager';
import type { Room } from '../domain/models/Room';
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
      case 'LEAVE_ROOM':
        handleLeaveRoom(wsClient, context);
        break;
      case 'TOGGLE_READY':
        handleToggleReady(wsClient, context);
        break;
      case 'RESET_LOBBY':
        handleResetLobby(wsClient, context);
        break;
      // Handle other commands like SAVE_GAME, etc.
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

function handleResetLobby(wsClient: WebSocket, context: NetworkContext) {
  const session = context.connectedClients.get(wsClient);
  if (!session || !session.roomId) return;
  const room = context.roomManager.getRoom(session.roomId);
  if (room && room.phase === 'ENDED') {
    if (room.hostId !== session.playerId) {
      sendError(wsClient, 'Only the host can reset the lobby');
      return;
    }
    room.resetToLobby();
    broadcastGameStateUpdate(session.roomId, context);
  }
}

function handleCreateRoom(
  wsClient: WebSocket,
  payload: { playerName: string; bootAmount?: number; maxPlayers?: number },
  context: NetworkContext,
) {
  const { playerName, bootAmount, maxPlayers } = payload;
  const playerId = generatePlayerId();
  const player = new Player(playerId, playerName);
  const roomId = generateRoomId();

  const room = context.roomManager.createRoom(roomId, player, maxPlayers);
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
  let room = context.roomManager.getRoom(roomId);

  if (!room && roomId === '') {
    const allRooms = context.roomManager.getAllRooms();
    if (allRooms.length > 0) {
      room = allRooms[0];
    }
  }

  if (!room) {
    sendError(wsClient, 'Room not found', 'ROOM_NOT_FOUND');
    return;
  }

  // Update the payload's roomId if we found a room when roomId was empty
  const actualRoomId = room.roomId;

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
    context.connectedClients.set(wsClient, {
      playerId: existingPlayerId,
      roomId: actualRoomId,
    });
    broadcastGameStateUpdate(actualRoomId, context);
  } else {
    const playerId = generatePlayerId();
    const player = new Player(playerId, playerName);
    room.join(player);

    const newToken = context.sessionStore.createSession(playerId);
    context.connectedClients.set(wsClient, { playerId, roomId: actualRoomId });

    sendEvent(wsClient, {
      type: 'SESSION_CREATED',
      payload: { playerId, reconnectToken: newToken },
    });
    broadcastGameStateUpdate(actualRoomId, context);
  }
}

function handleStartGame(wsClient: WebSocket, context: NetworkContext) {
  const session = context.connectedClients.get(wsClient);
  if (!session || !session.roomId) return;

  const room = context.roomManager.getRoom(session.roomId);
  if (room) {
    if (room.hostId !== session.playerId) {
      sendError(wsClient, 'Only the host can start the game');
      return;
    }
    const isAllReady = Array.from(room.players.values()).every(
      (p) => p.status === 'READY',
    );
    if (!isAllReady) {
      sendError(wsClient, 'All players must be READY to start');
      return;
    }
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
    const isGameOver = room.gameState.processAction(
      session.playerId,
      payload.action,
      payload.amount,
    );

    if (isGameOver) {
      const result = room.endGame(true);
      if (result) {
        saveGameHistory(room, result);
        broadcastGameResult(
          session.roomId,
          result.winnerIds,
          result.winningHand,
          result.payouts,
          result.exposedCards,
          context,
        );
      }
    } else {
      if (payload.action !== 'SEEN' && payload.action !== 'SIDESHOW') {
        room.gameState.nextTurn();
      }
    }

    broadcastGameStateUpdate(session.roomId, context);
  }
}

function handleToggleReady(wsClient: WebSocket, context: NetworkContext) {
  const session = context.connectedClients.get(wsClient);
  if (!session || !session.roomId) return;
  const room = context.roomManager.getRoom(session.roomId);
  if (room && room.phase === 'LOBBY') {
    const player = room.getPlayer(session.playerId);
    if (player) {
      player.status = player.status === 'READY' ? 'WAITING' : 'READY';
      broadcastGameStateUpdate(session.roomId, context);
    }
  }
}

function handleLeaveRoom(wsClient: WebSocket, context: NetworkContext) {
  const session = context.connectedClients.get(wsClient);
  if (!session || !session.roomId) return;

  const room = context.roomManager.getRoom(session.roomId);
  if (room) {
    room.leave(session.playerId);
    if (room.getPlayerCount() === 0) {
      context.roomManager.deleteRoom(session.roomId);
    } else {
      broadcastGameStateUpdate(session.roomId, context);
    }
  }

  context.connectedClients.set(wsClient, { playerId: session.playerId, roomId: null });
}

export function handleClientDisconnect(
  wsClient: WebSocket,
  context: NetworkContext,
): void {
  const session = context.connectedClients.get(wsClient);
  if (!session || !session.roomId) {
    context.connectedClients.delete(wsClient);
    return;
  }

  const room = context.roomManager.getRoom(session.roomId);
  if (!room) {
    context.connectedClients.delete(wsClient);
    return;
  }

  if (room.gameState) {
    const isGameOver = room.gameState.handlePlayerDisconnect(session.playerId);
    if (isGameOver) {
      const result = room.endGame(true);
      if (result) {
        saveGameHistory(room, result);
        broadcastGameResult(
          session.roomId,
          result.winnerIds,
          result.winningHand,
          result.payouts,
          result.exposedCards,
          context,
        );
      }
    }
  } else {
    const player = room.getPlayer(session.playerId);
    if (player) {
      player.status = 'DISCONNECTED';
    }
  }
  broadcastGameStateUpdate(session.roomId, context);

  const isAllDisconnected = Array.from(room.players.values()).every(
    (p) => p.status === 'DISCONNECTED',
  );
  if (isAllDisconnected) {
    context.roomManager.deleteRoom(session.roomId);
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

      const pendingSideshow = room.gameState?.pendingSideshow || null;

      const payload = {
        roomId,
        phase: room.phase,
        hostId,
        pot,
        currentTurnPlayerId,
        turnEndTime: null,
        players: publicPlayers,
        pendingSideshow,
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

function saveGameHistory(
  room: Room,
  result: {
    winnerIds: string[];
    winningHand: HandRank;
    payouts: Record<string, number>;
    exposedCards: Record<string, Card[]>;
  },
): void {
  try {
    const historyPath = path.join(process.cwd(), 'History.json');
    let history: Array<{
      timestamp: string;
      roomId: string;
      pot: number;
      winners: string[];
      winningHand: HandRank;
      players: Array<{
        playerName: string;
        chips: number;
        isBlind: boolean;
        status: string;
        cards: Card[];
      }>;
    }> = [];

    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8');
      if (data) history = JSON.parse(data);
    }

    // Total pot is sum of all payouts
    const totalPot = Object.values(result.payouts).reduce(
      (acc: number, val: number) => acc + val,
      0,
    );

    const historyData = {
      timestamp: new Date().toISOString(),
      roomId: room.roomId,
      pot: totalPot,
      winners: result.winnerIds,
      winningHand: result.winningHand,
      players: Array.from(room.players.values()).map((p) => ({
        playerName: p.name,
        chips: p.chips,
        isBlind: p.isBlind,
        status: p.status,
        cards: result.exposedCards[p.id] || p.privateCards,
      })),
    };

    history.push(historyData);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
  } catch {
    // console.error('Failed to save game history:', err);
  }
}
