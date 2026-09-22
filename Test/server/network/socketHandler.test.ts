import { beforeEach, describe, expect, jest, test } from 'bun:test';
import type { WebSocket as WSWebSocket } from 'ws';
import type { NetworkContext } from '../../../src/server/network/socketHandler';
import {
  broadcastGameStateUpdate,
  handleClientDisconnect,
  handleClientMessage,
} from '../../../src/server/network/socketHandler';
import type { ServerEvent } from '../../../src/shared/types';
import { GAME_CONSTANTS } from '../../../src/shared/constants';
import { Player } from '../../../src/server/domain/models/Player';
import { RoomManager } from '../../../src/server/domain/models/RoomManager';

function client(events: ServerEvent[]): WSWebSocket {
  return {
    readyState: 1,
    send: (data: string) => events.push(JSON.parse(data) as ServerEvent),
  } as unknown as WSWebSocket;
}

describe('host-controlled post-round flow', () => {
  let context: NetworkContext;

  beforeEach(() => {
    context = {
      roomManager: new RoomManager(),
      sessionStore: { createSession: () => 'token', getPlayerId: () => null },
      connectedClients: new Map(),
    };
  });

  function endedRoom(playerCount: 2 | 3 | 4 = 2) {
    const host = new Player('host', 'Host');
    const room = context.roomManager.createRoom('room', host, 4);
    const guests = Array.from({ length: playerCount - 1 }, (_, index) => {
      const guest = new Player(`guest-${index}`, `Guest ${index}`);
      room.join(guest);
      return guest;
    });
    room.startGame(host.id);
    room.endGame(true);
    return { room, host, guests };
  }

  test.each([2, 3, 4])(
    'a %i-player hand enters ENDED before the decision timeout',
    (count) => {
      const { room } = endedRoom(count as 2 | 3 | 4);
      expect(room.phase).toBe('ENDED');
      expect(room.gameState).not.toBeNull();
    },
  );

  test('starts a new game after 5 seconds when the host does not decide', () => {
    jest.useFakeTimers();
    try {
      const host = new Player('host', 'Host');
      const guest = new Player('guest', 'Guest');
      const room = context.roomManager.createRoom('auto-next', host, 2);
      room.join(guest);
      room.startGame(host.id);
      room.gameState!.currentPlayerIndex = room.gameState!.activePlayers.findIndex(
        (player) => player.id === host.id,
      );
      const events: ServerEvent[] = [];
      const hostClient = client(events);
      context.connectedClients.set(hostClient, {
        playerId: host.id,
        roomId: room.roomId,
      });

      handleClientMessage(
        hostClient,
        { type: 'PLAYER_ACTION', payload: { action: 'FOLD' } },
        context,
      );

      expect(room.phase).toBe('ENDED');
      jest.advanceTimersByTime(4_999);
      expect(room.phase).toBe('ENDED');
      jest.advanceTimersByTime(1);
      expect(room.phase).toBe('PLAYING');
    } finally {
      jest.useRealTimers();
    }
  });

  test('non-host cannot choose next game or return to waiting room', () => {
    const { room, host, guests } = endedRoom();
    const events: ServerEvent[] = [];
    const guestClient = client(events);
    context.connectedClients.set(guestClient, {
      playerId: guests[0].id,
      roomId: room.roomId,
    });

    handleClientMessage(guestClient, { type: 'NEXT_GAME' }, context);
    handleClientMessage(guestClient, { type: 'END_GAME' }, context);

    expect(room.phase).toBe('ENDED');
    expect(room.hostId).toBe(host.id);
    expect(events.filter((event) => event.type === 'ERROR')).toHaveLength(2);
  });

  test('host NEXT GAME resets all chips and admits waiting spectators', () => {
    const { room, host } = endedRoom(2);
    const waiting = new Player('waiting', 'Waiting');
    room.join(waiting);
    const events: ServerEvent[] = [];
    const hostClient = client(events);
    context.connectedClients.set(hostClient, { playerId: host.id, roomId: room.roomId });

    handleClientMessage(hostClient, { type: 'NEXT_GAME' }, context);

    expect(room.phase).toBe('PLAYING');
    expect(room.gameState?.activePlayers.map((player) => player.id)).toContain(
      waiting.id,
    );
    expect(room.getPlayer(waiting.id)?.chips).toBe(
      GAME_CONSTANTS.DEFAULT_STARTING_CHIPS - room.bootAmount,
    );
  });

  test('host END GAME returns every connected player to the same waiting room', () => {
    const { room, host, guests } = endedRoom(3);
    const events: ServerEvent[] = [];
    const hostClient = client(events);
    context.connectedClients.set(hostClient, { playerId: host.id, roomId: room.roomId });

    handleClientMessage(hostClient, { type: 'END_GAME' }, context);

    expect(room.phase).toBe('LOBBY');
    expect(room.gameState).toBeNull();
    for (const player of [host, ...guests]) {
      expect(player.status).toBe('WAITING');
      expect(player.chips).toBe(GAME_CONSTANTS.DEFAULT_STARTING_CHIPS);
    }
  });

  test('ENDED broadcasts no current turn, so actions stay locked', () => {
    const { room, host } = endedRoom();
    const events: ServerEvent[] = [];
    const hostClient = client(events);
    context.connectedClients.set(hostClient, { playerId: host.id, roomId: room.roomId });
    broadcastGameStateUpdate(room.roomId, context);
    const state = events.find((event) => event.type === 'GAME_STATE_UPDATE');
    expect(
      state?.type === 'GAME_STATE_UPDATE' && state.payload.currentTurnPlayerId,
    ).toBeNull();
  });

  test('a non-host disconnect is removed immediately and a lone host returns to waiting room', () => {
    const host = new Player('host', 'Host');
    const guest = new Player('guest', 'Thanathon');
    const room = context.roomManager.createRoom('disconnect-lone-host', host, 2);
    room.join(guest);
    room.startGame(host.id);
    const hostEvents: ServerEvent[] = [];
    const hostClient = client(hostEvents);
    const guestClient = client([]);
    context.connectedClients.set(hostClient, { playerId: host.id, roomId: room.roomId });
    context.connectedClients.set(guestClient, {
      playerId: guest.id,
      roomId: room.roomId,
    });

    handleClientDisconnect(guestClient, context);

    expect(room.getPlayer(guest.id)).toBeUndefined();
    expect(room.phase).toBe('LOBBY');
    expect(room.gameState).toBeNull();
    expect(room.getPlayerCount()).toBe(1);
    expect(hostEvents.some((event) => event.type === 'GAME_LOG_MESSAGE')).toBe(false);
  });

  test('a departed active player ends the hand only when host plus waiting player can play next', () => {
    const host = new Player('host', 'Host');
    const guest = new Player('guest', 'Thanathon');
    const waiting = new Player('waiting', 'Waiting');
    const room = context.roomManager.createRoom('disconnect-with-waiting', host, 3);
    room.join(guest);
    room.startGame(host.id);
    room.join(waiting);
    const hostEvents: ServerEvent[] = [];
    const hostClient = client(hostEvents);
    const guestClient = client([]);
    context.connectedClients.set(hostClient, { playerId: host.id, roomId: room.roomId });
    context.connectedClients.set(guestClient, {
      playerId: guest.id,
      roomId: room.roomId,
    });

    handleClientDisconnect(guestClient, context);

    expect(room.getPlayer(guest.id)).toBeUndefined();
    expect(room.phase).toBe('ENDED');
    expect(room.getPlayerCount()).toBe(2);
    expect(room.getPlayer(waiting.id)?.status).toBe('WAITING');
    const result = hostEvents.find((event) => event.type === 'GAME_RESULT');
    expect(result?.type === 'GAME_RESULT' && result.payload.departedPlayers).toEqual([
      { id: guest.id, name: guest.name, status: 'DISCONNECTED' },
    ]);
  });

  test('keeps an earlier disconnect in the eventual result table', () => {
    const host = new Player('host', 'Host');
    const firstGuest = new Player('guest-1', 'Disconnected player');
    const secondGuest = new Player('guest-2', 'Still playing');
    const room = context.roomManager.createRoom('disconnect-before-result', host, 4);
    room.join(firstGuest);
    room.join(secondGuest);
    room.startGame(host.id);
    room.gameState!.currentPlayerIndex = room.gameState!.activePlayers.findIndex(
      (player) => player.id === secondGuest.id,
    );

    const hostEvents: ServerEvent[] = [];
    const hostClient = client(hostEvents);
    const firstGuestClient = client([]);
    const secondGuestClient = client([]);
    context.connectedClients.set(hostClient, { playerId: host.id, roomId: room.roomId });
    context.connectedClients.set(firstGuestClient, {
      playerId: firstGuest.id,
      roomId: room.roomId,
    });
    context.connectedClients.set(secondGuestClient, {
      playerId: secondGuest.id,
      roomId: room.roomId,
    });

    handleClientDisconnect(firstGuestClient, context);
    expect(room.phase).toBe('PLAYING');

    handleClientMessage(
      secondGuestClient,
      { type: 'PLAYER_ACTION', payload: { action: 'FOLD' } },
      context,
    );

    const result = hostEvents.find((event) => event.type === 'GAME_RESULT');
    expect(result?.type === 'GAME_RESULT' && result.payload.departedPlayers).toEqual([
      { id: firstGuest.id, name: firstGuest.name, status: 'DISCONNECTED' },
    ]);
  });
});
