import { expect, test, describe, beforeEach } from 'bun:test';
import type { NetworkContext } from '../../../01-Source-code/server/network/socketHandler';
import {
  handleClientMessage,
  getRoomSummaryList,
  broadcastRoomList,
} from '../../../01-Source-code/server/network/socketHandler';
import type { ClientEvent, ServerEvent } from '../../../01-Source-code/shared/types';
import { RoomManager } from '../../../01-Source-code/server/domain/services/RoomManager';
import { Player } from '../../../01-Source-code/server/domain/models/Player';
import type { WebSocket as WSWebSocket } from 'ws';

describe('ระบบจัดการรายการห้องและโต๊ะเกมผ่าน Socket (Room Listing & Table Lounge Operations)', () => {
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

  test('[RoomListingSocket] 7.15 ฟังก์ชัน getRoomSummaryList คืนค่ารายการสรุปห้องที่แปลงข้อมูลถูกต้องครบถ้วน', () => {
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

  test('[RoomListingSocket] 7.16 ประมวลผลเหตุการณ์ GET_ROOMS และตอบกลับด้วยเหตุการณ์ ROOM_LIST', () => {
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

  test('[RoomListingSocket] 7.17 ฟังก์ชัน broadcastRoomList ส่งข้อมูลอัปเดตเฉพาะผู้เล่นที่อยู่ในล็อบบี้ส่วนกลางเท่านั้น', () => {
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

  test('[RoomListingSocket] 7.18 ปฏิเสธผู้เล่นที่พยายามเข้าร่วมห้องที่เต็มแล้วด้วยข้อผิดพลาด ROOM_FULL', () => {
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

  test('[RoomListingSocket] 7.19 ให้ความสำคัญกับข้อผิดพลาด ROOM_FULL ก่อนการตรวจสอบชื่อผู้เล่นซ้ำเมื่อห้องเต็ม', () => {
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

  test('[RoomListingSocket] 7.20 อนุญาตให้ผู้เล่นใหม่เข้าร่วมห้องที่กำลังเล่นอยู่เป็นผู้ชมรอคิวหากยังไม่เกินความจุห้อง', () => {
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

    expect(activeRoom.players.size).toBe(3);
    const ivanPlayer = activeRoom.getPlayer(Array.from(activeRoom.players.keys())[2]);
    expect(ivanPlayer?.name).toBe('Ivan');
    expect(ivanPlayer?.status).toBe('WAITING');

    const sessionCreatedEvent = sentEvents.find((evt) => evt.type === 'SESSION_CREATED');
    expect(sessionCreatedEvent).toBeDefined();
  });

  test('[RoomListingSocket] 7.21 อนุญาตให้ผู้เล่นเดิมที่มี Token ถูกต้องทำการ Reconnect กลับเข้าห้องที่กำลังเล่นอยู่ได้', () => {
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
