import type { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import type {
  ClientEvent,
  ServerEvent,
  HandRank,
  Card,
  GameActionType,
  RoomSummaryDTO,
} from '../../shared/types';
import type { RoomManager } from '../domain/models/RoomManager';
import type { Room } from '../domain/models/Room';
import { Player } from '../domain/models/Player';
import { generatePlayerId, generateRoomId } from '../utils/helpers';
import { GameError } from '../domain/errors/GameError';

const SHOW_REVEAL_DELAY_MS = 4_000;
const NEXT_ROUND_DELAY_MS = 6_000;
const BANKRUPTCY_RESULT_DELAY_MS = 3_000;
const RESULT_TO_LOBBY_DELAY_MS = 6_000;
const showRevealTimers = new Map<string, ReturnType<typeof setTimeout>>();
const nextRoundTimers = new Map<string, ReturnType<typeof setTimeout>>();
const bankruptcySettlementTimers = new Map<string, ReturnType<typeof setTimeout>>();
const returnToLobbyTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearRoomTimers(roomId: string): void {
  const showRevealTimer = showRevealTimers.get(roomId);
  if (showRevealTimer) clearTimeout(showRevealTimer);
  showRevealTimers.delete(roomId);

  const nextRoundTimer = nextRoundTimers.get(roomId);
  if (nextRoundTimer) clearTimeout(nextRoundTimer);
  nextRoundTimers.delete(roomId);

  const bankruptcySettlementTimer = bankruptcySettlementTimers.get(roomId);
  if (bankruptcySettlementTimer) clearTimeout(bankruptcySettlementTimer);
  bankruptcySettlementTimers.delete(roomId);

  const returnToLobbyTimer = returnToLobbyTimers.get(roomId);
  if (returnToLobbyTimer) clearTimeout(returnToLobbyTimer);
  returnToLobbyTimers.delete(roomId);
}

function settleAbandonedRound(room: Room, leavingPlayerId: string): void {
  if (!room.gameState) return;

  const isGameOver = room.gameState.handlePlayerDisconnect(leavingPlayerId);
  if (!isGameOver) return;

  const result = room.endGame(true);
  if (result) saveGameHistory(room, result);
}

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

export function getRoomSummaryList(roomManager: RoomManager): RoomSummaryDTO[] {
  const rooms = roomManager.getAllRooms();
  return rooms.map((room) => {
    const hostPlayer = room.hostId ? room.getPlayer(room.hostId) : undefined;
    const isPlaying = room.phase === 'PLAYING';
    const waitingPlayersCount = isPlaying
      ? Array.from(room.players.values()).filter((player) => player.status === 'WAITING')
          .length
      : 0;
    const activePlayersCount = isPlaying
      ? room.players.size - waitingPlayersCount
      : room.players.size;

    return {
      roomId: room.roomId,
      hostName: hostPlayer?.name ?? 'Unknown',
      playerCount: activePlayersCount,
      waitingCount: waitingPlayersCount,
      maxPlayers: room.MAX_PLAYERS,
      phase: room.phase,
      bootAmount: room.bootAmount,
    };
  });
}

function handleGetRooms(wsClient: WebSocket, context: NetworkContext): void {
  const rooms = getRoomSummaryList(context.roomManager);
  sendEvent(wsClient, {
    type: 'ROOM_LIST',
    payload: { rooms },
  });
}

export function broadcastRoomList(context: NetworkContext): void {
  const rooms = getRoomSummaryList(context.roomManager);
  const event: ServerEvent = {
    type: 'ROOM_LIST',
    payload: { rooms },
  };
  for (const [client, session] of context.connectedClients.entries()) {
    if (session.roomId === null && client.readyState === 1) {
      sendEvent(client, event);
    }
  }
}

export function handleClientMessage(
  wsClient: WebSocket,
  message: ClientEvent,
  context: NetworkContext,
): void {
  try {
    switch (message.type) {
      case 'GET_ROOMS':
        handleGetRooms(wsClient, context);
        break;
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
    broadcastRoomList(context);
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
  broadcastRoomList(context);
}

function handleReconnectJoin(
  wsClient: WebSocket,
  room: Room,
  reconnectToken: string,
  context: NetworkContext,
): void {
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
    roomId: room.roomId,
  });
  broadcastGameStateUpdate(room.roomId, context);
  broadcastRoomList(context);
}

function handleNewJoin(
  wsClient: WebSocket,
  room: Room,
  playerName: string,
  context: NetworkContext,
): void {
  if (room.players.size >= room.MAX_PLAYERS) {
    sendError(wsClient, 'Room is full', 'ROOM_FULL');
    return;
  }

  const playerId = generatePlayerId();
  const player = new Player(playerId, playerName);
  room.join(player);

  const newToken = context.sessionStore.createSession(playerId);
  context.connectedClients.set(wsClient, { playerId, roomId: room.roomId });

  sendEvent(wsClient, {
    type: 'SESSION_CREATED',
    payload: { playerId, reconnectToken: newToken },
  });
  broadcastGameStateUpdate(room.roomId, context);
  broadcastRoomList(context);
}

function handleJoinRoom(
  wsClient: WebSocket,
  payload: { playerName: string; roomId: string; reconnectToken?: string },
  context: NetworkContext,
) {
  const { playerName, roomId, reconnectToken } = payload;
  const targetRoom =
    context.roomManager.getRoom(roomId) ??
    (roomId === '' ? context.roomManager.getAllRooms()[0] : undefined);

  if (!targetRoom) {
    sendError(wsClient, 'Room not found', 'ROOM_NOT_FOUND');
    return;
  }

  if (reconnectToken) {
    handleReconnectJoin(wsClient, targetRoom, reconnectToken, context);
  } else {
    handleNewJoin(wsClient, targetRoom, playerName, context);
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
    if (room.gameState?.isRoundEnding) {
      scheduleBankruptcySettlement(session.roomId, context);
    }
    broadcastRoomList(context);
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

    if (room.gameState.pendingShow) {
      broadcastGameStateUpdate(session.roomId, context);
      scheduleShowSettlement(session.roomId, context);
      return;
    }

    if (room.gameState.isRoundEnding) {
      broadcastGameStateUpdate(session.roomId, context);
      scheduleBankruptcySettlement(session.roomId, context);
      return;
    }

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
        scheduleNextRound(session.roomId, context);
      }
    } else {
      if (payload.action !== 'SEEN' && payload.action !== 'SIDESHOW') {
        room.gameState.nextTurn();
      }
    }

    broadcastGameStateUpdate(session.roomId, context);
  }
}

function scheduleBankruptcySettlement(roomId: string, context: NetworkContext): void {
  if (bankruptcySettlementTimers.has(roomId)) return;

  const timer = setTimeout(() => {
    bankruptcySettlementTimers.delete(roomId);
    const room = context.roomManager.getRoom(roomId);
    if (!room?.gameState?.isRoundEnding) return;

    const isGameOver =
      room.gameState.checkLastManStanding() !== null ||
      room.gameState.checkPotLimitReached();
    if (isGameOver) {
      const result = room.endGame(true);
      if (result) {
        saveGameHistory(room, result);
        broadcastGameResult(
          roomId,
          result.winnerIds,
          result.winningHand,
          result.payouts,
          result.exposedCards,
          context,
        );
        scheduleReturnToLobby(roomId, context);
      }
    } else {
      room.gameState.isRoundEnding = false;
      room.gameState.nextTurn();
    }

    broadcastGameStateUpdate(roomId, context);
  }, BANKRUPTCY_RESULT_DELAY_MS);

  bankruptcySettlementTimers.set(roomId, timer);
}

function scheduleNextRound(roomId: string, context: NetworkContext): void {
  if (nextRoundTimers.has(roomId)) return;

  const timer = setTimeout(() => {
    nextRoundTimers.delete(roomId);
    const room = context.roomManager.getRoom(roomId);
    if (!room || room.phase !== 'ENDED' || !room.hostId) return;

    try {
      room.startNextRound(room.hostId);
      broadcastGameStateUpdate(roomId, context);
      if (room.gameState?.isRoundEnding) {
        scheduleBankruptcySettlement(roomId, context);
      }
      broadcastRoomList(context);
    } catch {
      scheduleReturnToLobby(roomId, context);
    }
  }, NEXT_ROUND_DELAY_MS);

  nextRoundTimers.set(roomId, timer);
}

function scheduleShowSettlement(roomId: string, context: NetworkContext): void {
  if (showRevealTimers.has(roomId)) return;

  const timer = setTimeout(() => {
    showRevealTimers.delete(roomId);
    const room = context.roomManager.getRoom(roomId);
    if (!room?.gameState?.pendingShow) return;

    const result = room.endGame(true);
    if (result) {
      saveGameHistory(room, result);
      broadcastGameResult(
        roomId,
        result.winnerIds,
        result.winningHand,
        result.payouts,
        result.exposedCards,
        context,
      );
      scheduleNextRound(roomId, context);
    }
    broadcastGameStateUpdate(roomId, context);
  }, SHOW_REVEAL_DELAY_MS);

  showRevealTimers.set(roomId, timer);
}

function scheduleReturnToLobby(roomId: string, context: NetworkContext): void {
  if (returnToLobbyTimers.has(roomId)) return;

  const timer = setTimeout(() => {
    returnToLobbyTimers.delete(roomId);
    const room = context.roomManager.getRoom(roomId);
    if (!room || room.phase !== 'ENDED') return;

    room.resetToLobby();
    broadcastGameStateUpdate(roomId, context);
    broadcastRoomList(context);
  }, RESULT_TO_LOBBY_DELAY_MS);

  returnToLobbyTimers.set(roomId, timer);
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
    if (room.hostId === session.playerId) {
      closeRoom(session.roomId, context);
      return;
    }

    if (room.getPlayerCount() === 2) settleAbandonedRound(room, session.playerId);
    room.leave(session.playerId);
    context.connectedClients.set(wsClient, { playerId: session.playerId, roomId: null });

    if (room.getPlayerCount() < 2) room.resetToLobby();
    broadcastGameStateUpdate(session.roomId, context);
  } else {
    context.connectedClients.set(wsClient, { playerId: session.playerId, roomId: null });
  }

  broadcastRoomList(context);
}

function closeRoom(roomId: string, context: NetworkContext): void {
  clearRoomTimers(roomId);
  context.roomManager.deleteRoom(roomId);

  for (const [client, session] of context.connectedClients.entries()) {
    if (session.roomId !== roomId) continue;

    context.connectedClients.set(client, { playerId: session.playerId, roomId: null });
    sendEvent(client, { type: 'ROOM_CLOSED', payload: { roomId } });
  }

  broadcastRoomList(context);
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

  if (room.hostId === session.playerId) {
    closeRoom(session.roomId, context);
    context.connectedClients.delete(wsClient);
    return;
  }

  const connectedPlayersAfterDisconnect = Array.from(room.players.values()).filter(
    (player) => player.id !== session.playerId && player.status !== 'DISCONNECTED',
  );
  if (connectedPlayersAfterDisconnect.length < 2) {
    settleAbandonedRound(room, session.playerId);
    room.leave(session.playerId);
    for (const player of Array.from(room.players.values())) {
      if (player.status === 'DISCONNECTED') room.leave(player.id);
    }
    room.resetToLobby();
    context.connectedClients.delete(wsClient);
    broadcastGameStateUpdate(session.roomId, context);
    broadcastRoomList(context);
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
        scheduleNextRound(session.roomId, context);
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
  broadcastRoomList(context);
}

export function broadcastGameStateUpdate(roomId: string, context: NetworkContext): void {
  const room = context.roomManager.getRoom(roomId);
  if (!room) return;

  const pot = room.gameState?.pot || 0;
  const currentTurnPlayerId =
    room.phase === 'ENDED' || room.gameState?.pendingShow || room.gameState?.isRoundEnding
      ? null
      : room.gameState?.activePlayers[room.gameState.currentPlayerIndex]?.id || null;
  const publicPlayers = room.getPublicState();
  const hostId = room.hostId || '';

  for (const [client, session] of context.connectedClients.entries()) {
    if (session.roomId === roomId) {
      const player = room.getPlayer(session.playerId);
      // ผู้เล่นที่เป็น Blind จะยังไม่เห็นไพ่ตัวเอง ส่วนคนที่เปิดดู (Seen) หรือเป็นโหมดอื่นจะเห็น
      const myCards = player && !player.isBlind ? player.privateCards : [];

      const pendingSideshow = room.gameState?.pendingSideshow || null;
      const sideshowResult = room.gameState?.lastSideshow || null;
      const sideshowNotice = room.gameState?.lastSideshowNotice || null;
      const showdownCards = room.gameState?.pendingShow?.cards || null;
      const isSideshowParticipant =
        sideshowResult !== null &&
        (session.playerId === sideshowResult.challengerId ||
          session.playerId === sideshowResult.targetId);
      const payload = {
        roomId,
        phase: room.phase,
        hostId,
        maxPlayers: room.MAX_PLAYERS,
        pot,
        currentStake: room.gameState?.currentStake ?? room.bootAmount,
        currentTurnPlayerId,
        isRoundEnding: room.gameState?.isRoundEnding ?? false,
        turnEndTime: null,
        roundStartedAt: room.gameState?.roundStartedAt ?? null,
        players: publicPlayers,
        pendingSideshow,
        sideshowResult: isSideshowParticipant ? sideshowResult : null,
        sideshowNotice,
        showdownCards,
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
  broadcastRoomList(context);
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
