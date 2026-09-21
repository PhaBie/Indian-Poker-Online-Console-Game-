import { expect, test, describe, beforeEach } from 'bun:test';
import type { NetworkContext } from '../../../src/server/network/socketHandler';
import {
  handleClientMessage,
  getRoomSummaryList,
} from '../../../src/server/network/socketHandler';
import type { ServerEvent } from '../../../src/shared/types';
import { RoomManager } from '../../../src/server/domain/models/RoomManager';
import { Player } from '../../../src/server/domain/models/Player';
import type { WebSocket as WSWebSocket } from 'ws';

describe('Spectator and Queue Operations', () => {
  let mockNetworkContext: NetworkContext;

  beforeEach(() => {
    const sessionMap = new Map<string, string>();
    let tokenSequence = 1;

    mockNetworkContext = {
      roomManager: new RoomManager(),
      sessionStore: {
        createSession: (playerId: string) => {
          const generatedToken = `token_${tokenSequence++}`;
          sessionMap.set(generatedToken, playerId);
          return generatedToken;
        },
        getPlayerId: (token: string) => sessionMap.get(token) || null,
      },
      connectedClients: new Map(),
    };
  });

  function createMockWebSocket(receivedEvents: ServerEvent[]): WSWebSocket {
    return {
      readyState: 1,
      send: (rawPayload: string) => {
        receivedEvents.push(JSON.parse(rawPayload));
      },
    } as unknown as WSWebSocket;
  }

  test('allows spectator to join an active playing room when slots remain', () => {
    const hostPlayer = new Player('host_1', 'Alice');
    const guestPlayer = new Player('guest_1', 'Bob');
    const activeRoom = mockNetworkContext.roomManager.createRoom(
      'room_303',
      hostPlayer,
      4,
    );
    activeRoom.join(guestPlayer);
    activeRoom.startGame('host_1');

    expect(activeRoom.phase).toBe('PLAYING');
    expect(activeRoom.players.size).toBe(2);

    const spectatorEvents: ServerEvent[] = [];
    const spectatorSocket = createMockWebSocket(spectatorEvents);

    handleClientMessage(
      spectatorSocket,
      {
        type: 'JOIN_ROOM',
        payload: { roomId: 'room_303', playerName: 'Charlie' },
      },
      mockNetworkContext,
    );

    expect(activeRoom.players.size).toBe(3);
    const charliePlayer = Array.from(activeRoom.players.values()).find(
      (player) => player.name === 'Charlie',
    );
    expect(charliePlayer).toBeDefined();
    expect(charliePlayer?.status).toBe('WAITING');

    const sessionCreatedEvent = spectatorEvents.find(
      (event) => event.type === 'SESSION_CREATED',
    );
    expect(sessionCreatedEvent).toBeDefined();

    const summaries = getRoomSummaryList(mockNetworkContext.roomManager);
    expect(summaries[0].playerCount).toBe(2);
    expect(summaries[0].waitingCount).toBe(1);
    expect(summaries[0].maxPlayers).toBe(4);
  });

  test('blocks new spectator when total players and spectators reach room maximum', () => {
    const hostPlayer = new Player('host_1', 'Alice');
    const guestPlayer = new Player('guest_1', 'Bob');
    const activeRoom = mockNetworkContext.roomManager.createRoom(
      'room_404',
      hostPlayer,
      4,
    );
    activeRoom.join(guestPlayer);
    activeRoom.startGame('host_1');

    const firstSpectatorSocket = createMockWebSocket([]);
    handleClientMessage(
      firstSpectatorSocket,
      {
        type: 'JOIN_ROOM',
        payload: { roomId: 'room_404', playerName: 'Charlie' },
      },
      mockNetworkContext,
    );

    const secondSpectatorSocket = createMockWebSocket([]);
    handleClientMessage(
      secondSpectatorSocket,
      {
        type: 'JOIN_ROOM',
        payload: { roomId: 'room_404', playerName: 'David' },
      },
      mockNetworkContext,
    );

    expect(activeRoom.players.size).toBe(4);

    const rejectedEvents: ServerEvent[] = [];
    const fifthClientSocket = createMockWebSocket(rejectedEvents);

    handleClientMessage(
      fifthClientSocket,
      {
        type: 'JOIN_ROOM',
        payload: { roomId: 'room_404', playerName: 'Eve' },
      },
      mockNetworkContext,
    );

    const errorEvent = rejectedEvents.find((event) => event.type === 'ERROR') as {
      type: 'ERROR';
      code?: string;
    };
    expect(errorEvent).toBeDefined();
    expect(errorEvent.code).toBe('ROOM_FULL');
  });

  test('promotes waiting spectator to active player in next round', () => {
    const hostPlayer = new Player('host_1', 'Alice');
    const guestPlayer = new Player('guest_1', 'Bob');
    const activeRoom = mockNetworkContext.roomManager.createRoom(
      'room_505',
      hostPlayer,
      4,
    );
    activeRoom.join(guestPlayer);
    activeRoom.startGame('host_1');

    const spectatorSocket = createMockWebSocket([]);
    handleClientMessage(
      spectatorSocket,
      {
        type: 'JOIN_ROOM',
        payload: { roomId: 'room_505', playerName: 'Charlie' },
      },
      mockNetworkContext,
    );

    activeRoom.endGame(true);
    expect(activeRoom.phase).toBe('ENDED');

    activeRoom.startNextRound('host_1');
    expect(activeRoom.phase).toBe('PLAYING');

    const activePlayersInNextRound = activeRoom.gameState?.activePlayers ?? [];
    expect(activePlayersInNextRound.length).toBe(3);

    const charlieInNextRound = activePlayersInNextRound.find(
      (player) => player.name === 'Charlie',
    );
    expect(charlieInNextRound).toBeDefined();
    expect(charlieInNextRound?.status).toBe('ACTIVE');
    expect(charlieInNextRound?.privateCards.length).toBe(3);
  });
});
