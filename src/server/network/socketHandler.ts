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
const SIDESHOW_REVEAL_DELAY_MS = 6_000;
const HOST_DECISION_TIMEOUT_MS = 5_000;
const showRevealTimers = new Map<string, ReturnType<typeof setTimeout>>();
const sideshowRevealTimers = new Map<string, ReturnType<typeof setTimeout>>();
const autoNextGameTimers = new Map<string, ReturnType<typeof setTimeout>>();
type DepartedPlayer = { id: string; name: string; status: 'DISCONNECTED' | 'LEFT' };
// A player can leave before the action that actually ends a hand. Keep that
// information at room scope so the eventual result still tells the table who
// left, rather than showing an unrelated Action-panel notification.
const departedPlayersByRoom = new Map<string, DepartedPlayer[]>();

function clearRoomTimers(roomId: string): void {
  const showRevealTimer = showRevealTimers.get(roomId);
  if (showRevealTimer) clearTimeout(showRevealTimer);
  showRevealTimers.delete(roomId);

  const sideshowRevealTimer = sideshowRevealTimers.get(roomId);
  if (sideshowRevealTimer) clearTimeout(sideshowRevealTimer);
  sideshowRevealTimers.delete(roomId);

  const autoNextGameTimer = autoNextGameTimers.get(roomId);
  if (autoNextGameTimer) clearTimeout(autoNextGameTimer);
  autoNextGameTimers.delete(roomId);
  departedPlayersByRoom.delete(roomId);
}

function recordDepartedPlayer(roomId: string, player: DepartedPlayer): void {
  const departedPlayers = departedPlayersByRoom.get(roomId) ?? [];
  departedPlayers.push(player);
  departedPlayersByRoom.set(roomId, departedPlayers);
}

function consumeDepartedPlayers(roomId: string): DepartedPlayer[] {
  const departedPlayers = departedPlayersByRoom.get(roomId) ?? [];
  departedPlayersByRoom.delete(roomId);
  return departedPlayers;
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
      case 'NEXT_GAME':
        handleNextGame(wsClient, context);
        break;
      case 'END_GAME':
        handleEndGame(wsClient, context);
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

    // A rejected action can reveal that this client was rendering an older
    // table snapshot. Send the authoritative state immediately so it cannot
    // keep offering controls to a player the server has already folded.
    const session = context.connectedClients.get(wsClient);
    if (message.type === 'PLAYER_ACTION' && session?.roomId) {
      broadcastGameStateUpdate(session.roomId, context);
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
    departedPlayersByRoom.delete(session.roomId);
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
    broadcastRoomList(context);
  }
}

function handleNextGame(wsClient: WebSocket, context: NetworkContext): void {
  const session = context.connectedClients.get(wsClient);
  if (!session?.roomId) return;
  const room = context.roomManager.getRoom(session.roomId);
  if (!room) return;
  if (room.hostId !== session.playerId) {
    sendError(wsClient, 'Only the host can start the next game', 'NOT_HOST');
    return;
  }
  clearAutoNextGameTimer(session.roomId);
  departedPlayersByRoom.delete(session.roomId);
  room.startNextRound(session.playerId);
  broadcastGameStateUpdate(session.roomId, context);
  broadcastRoomList(context);
}

function handleEndGame(wsClient: WebSocket, context: NetworkContext): void {
  const session = context.connectedClients.get(wsClient);
  if (!session?.roomId) return;
  const room = context.roomManager.getRoom(session.roomId);
  if (!room) return;
  if (room.hostId !== session.playerId) {
    sendError(wsClient, 'Only the host can return to the waiting room', 'NOT_HOST');
    return;
  }
  if (room.phase !== 'ENDED') {
    sendError(wsClient, 'The current game has not ended', 'GAME_IN_PROGRESS');
    return;
  }
  clearAutoNextGameTimer(session.roomId);
  departedPlayersByRoom.delete(session.roomId);
  room.resetToLobby();
  broadcastGameStateUpdate(session.roomId, context);
  broadcastRoomList(context);
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
  if (room && room.phase !== 'PLAYING') {
    sendError(wsClient, 'Waiting for host decision', 'GAME_ENDED');
    return;
  }
  if (room && room.gameState) {
    let isGameOver = room.gameState.processAction(
      session.playerId,
      payload.action,
      payload.amount,
    );

    if (room.gameState.lastSideshow) {
      scheduleSideshowResultClear(session.roomId, context);
    }

    if (room.gameState.pendingShow) {
      broadcastGameStateUpdate(session.roomId, context);
      scheduleShowSettlement(session.roomId, context);
      return;
    }

    if (!isGameOver && payload.action !== 'SEEN' && payload.action !== 'SIDESHOW') {
      room.gameState.nextTurn();
      isGameOver =
        room.gameState.checkLastManStanding() !== null ||
        room.gameState.checkPotLimitReached();
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
          consumeDepartedPlayers(session.roomId),
        );
        scheduleAutoNextGame(session.roomId, context);
      }
    }

    broadcastGameStateUpdate(session.roomId, context);
  }
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
        consumeDepartedPlayers(roomId),
      );
      scheduleAutoNextGame(roomId, context);
    }
    broadcastGameStateUpdate(roomId, context);
  }, SHOW_REVEAL_DELAY_MS);

  showRevealTimers.set(roomId, timer);
}

function clearAutoNextGameTimer(roomId: string): void {
  const timer = autoNextGameTimers.get(roomId);
  if (timer) clearTimeout(timer);
  autoNextGameTimers.delete(roomId);
}

function scheduleAutoNextGame(roomId: string, context: NetworkContext): void {
  if (autoNextGameTimers.has(roomId)) return;
  const timer = setTimeout(() => {
    autoNextGameTimers.delete(roomId);
    const room = context.roomManager.getRoom(roomId);
    if (!room?.hostId || room.phase !== 'ENDED') return;
    try {
      room.startNextRound(room.hostId);
      departedPlayersByRoom.delete(roomId);
      broadcastGameStateUpdate(roomId, context);
      broadcastRoomList(context);
    } catch {
      // With fewer than two connected players there is no valid next game.
      // Keep the completed result visible for the host to decide manually.
    }
  }, HOST_DECISION_TIMEOUT_MS);
  autoNextGameTimers.set(roomId, timer);
}

function scheduleSideshowResultClear(roomId: string, context: NetworkContext): void {
  if (sideshowRevealTimers.has(roomId)) return;

  const timer = setTimeout(() => {
    sideshowRevealTimers.delete(roomId);
    const room = context.roomManager.getRoom(roomId);
    if (!room?.gameState?.lastSideshow) return;

    room.gameState.clearSideshowResult();
    broadcastGameStateUpdate(roomId, context);
  }, SIDESHOW_REVEAL_DELAY_MS);

  sideshowRevealTimers.set(roomId, timer);
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

    removeNonHostPlayer(room, session.playerId, 'left the table', context);
    context.connectedClients.set(wsClient, { playerId: session.playerId, roomId: null });
  } else {
    context.connectedClients.set(wsClient, { playerId: session.playerId, roomId: null });
  }

  broadcastRoomList(context);
}

function removeNonHostPlayer(
  room: Room,
  playerId: string,
  reason: 'disconnected' | 'left the table',
  context: NetworkContext,
): void {
  const playerName = room.getPlayer(playerId)?.name ?? 'A player';
  const isPlayingInThisHand =
    room.phase === 'PLAYING' &&
    room.gameState?.activePlayers.some((player) => player.id === playerId) === true;
  if (isPlayingInThisHand) {
    recordDepartedPlayer(room.roomId, {
      id: playerId,
      name: playerName,
      status: reason === 'disconnected' ? 'DISCONNECTED' : 'LEFT',
    });
  }
  const isGameOver = room.gameState?.handlePlayerDisconnect(playerId) ?? false;
  room.leave(playerId);

  // A host left alone cannot play or choose a meaningful next game. Keep the
  // room itself, but return it immediately to its waiting state.
  if (room.getPlayerCount() < 2) {
    clearAutoNextGameTimer(room.roomId);
    departedPlayersByRoom.delete(room.roomId);
    room.resetToLobby();
    broadcastGameStateUpdate(room.roomId, context);
    return;
  }

  if (isGameOver) {
    const result = room.endGame(true);
    if (result) {
      saveGameHistory(room, result);
      broadcastGameResult(
        room.roomId,
        result.winnerIds,
        result.winningHand,
        result.payouts,
        result.exposedCards,
        context,
        consumeDepartedPlayers(room.roomId),
      );
      scheduleAutoNextGame(room.roomId, context);
    }
  }
  broadcastGameStateUpdate(room.roomId, context);
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

  removeNonHostPlayer(room, session.playerId, 'disconnected', context);
  context.connectedClients.delete(wsClient);
  broadcastRoomList(context);
}

export function broadcastGameStateUpdate(roomId: string, context: NetworkContext): void {
  const room = context.roomManager.getRoom(roomId);
  if (!room) return;

  const pot = room.gameState?.pot || 0;
  const currentTurnPlayerId =
    room.phase === 'ENDED' || room.gameState?.pendingShow || room.gameState?.lastSideshow
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
  departedPlayers: DepartedPlayer[] = [],
): void {
  for (const [client, session] of context.connectedClients.entries()) {
    if (session.roomId === roomId) {
      sendEvent(client, {
        type: 'GAME_RESULT',
        payload: {
          winnerIds,
          winningHand,
          payouts,
          departedPlayers,
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
