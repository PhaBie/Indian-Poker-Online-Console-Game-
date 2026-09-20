import { expect, test, describe, beforeEach } from 'bun:test';
import type { NetworkContext } from '../../../src/server/network/socketHandler';
import {
  handleClientMessage,
  getRoomSummaryList,
  broadcastRoomList,
} from '../../../src/server/network/socketHandler';
import type { ClientEvent, ServerEvent } from '../../../src/shared/types';
import { RoomManager } from '../../../src/server/domain/models/RoomManager';
import { Player } from '../../../src/server/domain/models/Player';
import type { WebSocket as WSWebSocket } from 'ws';

describe('Room Listing & Table Lounge Socket Operations', () => {
  let mockContext: NetworkContext;

  beforeEach(() => {
    const sessionMap = new Map<string, string>();
    let tokenSequence = 1;

    mockContext = {
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

  test('getRoomSummaryList returns mapped room summaries', () => {
    const hostPlayer = new Player('host_1', 'Alice');
    const createdRoom = mockContext.roomManager.createRoom('room_101', hostPlayer, 4);
    createdRoom.bootAmount = 100;

    const summaryList = getRoomSummaryList(mockContext.roomManager);
    expect(summaryList.length).toBe(1);
    expect(summaryList[0].roomId).toBe('room_101');
    expect(summaryList[0].hostName).toBe('Alice');
    expect(summaryList[0].playerCount).toBe(1);
    expect(summaryList[0].maxPlayers).toBe(4);
    expect(summaryList[0].bootAmount).toBe(100);
    expect(summaryList[0].phase).toBe('LOBBY');
  });

  test('handles GET_ROOMS and responds with ROOM_LIST event', () => {
    const sentEvents: ServerEvent[] = [];
    const mockSocket = {
      readyState: 1,
      send: (rawPayload: string) => {
        sentEvents.push(JSON.parse(rawPayload));
      },
    } as unknown as WSWebSocket;

    const hostPlayer = new Player('host_1', 'Bob');
    mockContext.roomManager.createRoom('room_202', hostPlayer, 4);

    const getRoomsMessage: ClientEvent = { type: 'GET_ROOMS' };
    handleClientMessage(mockSocket, getRoomsMessage, mockContext);

    const roomListEvent = sentEvents.find((evt) => evt.type === 'ROOM_LIST') as Extract<
      ServerEvent,
      { type: 'ROOM_LIST' }
    >;
    expect(roomListEvent).toBeDefined();
    expect(roomListEvent.payload.rooms.length).toBe(1);
    expect(roomListEvent.payload.rooms[0].roomId).toBe('room_202');
  });

  test('broadcastRoomList sends updates only to clients in lobby', () => {
    const lobbyClientEvents: ServerEvent[] = [];
    const inRoomClientEvents: ServerEvent[] = [];

    const lobbySocket = {
      readyState: 1,
      send: (rawPayload: string) => {
        lobbyClientEvents.push(JSON.parse(rawPayload));
      },
    } as unknown as WSWebSocket;

    const inRoomSocket = {
      readyState: 1,
      send: (rawPayload: string) => {
        inRoomClientEvents.push(JSON.parse(rawPayload));
      },
    } as unknown as WSWebSocket;

    mockContext.connectedClients.set(lobbySocket, { playerId: '', roomId: null });
    mockContext.connectedClients.set(inRoomSocket, {
      playerId: 'p1',
      roomId: 'active_room',
    });

    const hostPlayer = new Player('host_2', 'Charlie');
    mockContext.roomManager.createRoom('active_room', hostPlayer, 4);

    broadcastRoomList(mockContext);

    expect(lobbyClientEvents.some((evt) => evt.type === 'ROOM_LIST')).toBe(true);
    expect(inRoomClientEvents.some((evt) => evt.type === 'ROOM_LIST')).toBe(false);
  });

  test('rejects new player joining full room with ROOM_FULL error', () => {
    const hostPlayer = new Player('host_3', 'Dave');
    const fullRoom = mockContext.roomManager.createRoom('full_room', hostPlayer, 2);
    const secondPlayer = new Player('p2', 'Eve');
    fullRoom.join(secondPlayer);

    const sentEvents: ServerEvent[] = [];
    const newPlayerSocket = {
      readyState: 1,
      send: (rawPayload: string) => {
        sentEvents.push(JSON.parse(rawPayload));
      },
    } as unknown as WSWebSocket;

    const joinMessage: ClientEvent = {
      type: 'JOIN_ROOM',
      payload: { playerName: 'Frank', roomId: 'full_room' },
    };

    handleClientMessage(newPlayerSocket, joinMessage, mockContext);

    const errorEvent = sentEvents.find((evt) => evt.type === 'ERROR') as Extract<
      ServerEvent,
      { type: 'ERROR' }
    >;
    expect(errorEvent).toBeDefined();
    expect(errorEvent.code).toBe('ROOM_FULL');
  });

  test('prioritizes ROOM_FULL over duplicate name when a full room is joined', () => {
    const hostPlayer = new Player('host_priority', 'Dave');
    const fullRoom = mockContext.roomManager.createRoom('full_priority', hostPlayer, 2);
    fullRoom.join(new Player('p2_priority', 'Eve'));

    const sentEvents: ServerEvent[] = [];
    const socket = {
      readyState: 1,
      send: (rawPayload: string) => sentEvents.push(JSON.parse(rawPayload)),
    } as unknown as WSWebSocket;

    handleClientMessage(
      socket,
      {
        type: 'JOIN_ROOM',
        payload: { playerName: 'dave', roomId: 'full_priority' },
      },
      mockContext,
    );

    const errorEvent = sentEvents.find((event) => event.type === 'ERROR') as Extract<
      ServerEvent,
      { type: 'ERROR' }
    >;
    expect(errorEvent.code).toBe('ROOM_FULL');
    expect(errorEvent.message).toContain('full');
  });

  test('rejects new player joining in-progress room with GAME_IN_PROGRESS error', () => {
    const hostPlayer = new Player('host_4', 'Grace');
    const secondPlayer = new Player('p2', 'Heidi');
    const activeRoom = mockContext.roomManager.createRoom('playing_room', hostPlayer, 4);
    activeRoom.join(secondPlayer);
    activeRoom.phase = 'PLAYING';

    const sentEvents: ServerEvent[] = [];
    const newPlayerSocket = {
      readyState: 1,
      send: (rawPayload: string) => {
        sentEvents.push(JSON.parse(rawPayload));
      },
    } as unknown as WSWebSocket;

    const joinMessage: ClientEvent = {
      type: 'JOIN_ROOM',
      payload: { playerName: 'Ivan', roomId: 'playing_room' },
    };

    handleClientMessage(newPlayerSocket, joinMessage, mockContext);

    const errorEvent = sentEvents.find((evt) => evt.type === 'ERROR') as Extract<
      ServerEvent,
      { type: 'ERROR' }
    >;
    expect(errorEvent).toBeDefined();
    expect(errorEvent.code).toBe('GAME_IN_PROGRESS');
  });

  test('allows existing player with valid token to reconnect into playing room', () => {
    const hostPlayer = new Player('host_5', 'Judy');
    const existingPlayer = new Player('player_reconnect', 'Kevin');
    const activeRoom = mockContext.roomManager.createRoom(
      'reconnect_room',
      hostPlayer,
      4,
    );
    activeRoom.join(existingPlayer);
    activeRoom.phase = 'PLAYING';

    const validToken = mockContext.sessionStore.createSession('player_reconnect');

    const sentEvents: ServerEvent[] = [];
    const reconnectSocket = {
      readyState: 1,
      send: (rawPayload: string) => {
        sentEvents.push(JSON.parse(rawPayload));
      },
    } as unknown as WSWebSocket;

    const reconnectMessage: ClientEvent = {
      type: 'JOIN_ROOM',
      payload: {
        playerName: 'Kevin',
        roomId: 'reconnect_room',
        reconnectToken: validToken,
      },
    };

    handleClientMessage(reconnectSocket, reconnectMessage, mockContext);

    const updateEvent = sentEvents.find((evt) => evt.type === 'GAME_STATE_UPDATE');
    expect(updateEvent).toBeDefined();
  });
});
