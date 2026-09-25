import { expect, test, describe } from 'bun:test';
import { Room } from '../../../src/server/domain/models/Room';
import { Player } from '../../../src/server/domain/models/Player';
import { expectGameErrorWithCode } from './helpers/expectGameErrorWithCode';

describe('1. การแปลงข้อมูลห้องเป็น JSON (Room.toJSON)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test('[Room.toJSON] 1.14 แปลงข้อมูลห้องสถานะ LOBBY ที่มีผู้เล่น 2 คน → ได้ฟิลด์ roomId, phase, hostId, bootAmount ครบถ้วน และ gameState เป็น null', () => {
      const room = new Room('room_lobby_save', 100);
      const hostPlayer = new Player('id_host', 'Host');
      const secondPlayer = new Player('id_second', 'Second');

      room.join(hostPlayer);
      room.join(secondPlayer);

      const serializedRoom = room.toJSON() as {
        roomId: string;
        phase: string;
        hostId: string;
        bootAmount: number;
        players: Array<{ id: string; name: string; chips: number }>;
        gameState: unknown;
      };

      expect(serializedRoom.roomId).toBe('room_lobby_save');
      expect(serializedRoom.phase).toBe('LOBBY');
      expect(serializedRoom.hostId).toBe('id_host');
      expect(serializedRoom.bootAmount).toBe(100);
      expect(serializedRoom.players).toHaveLength(2);
      expect(serializedRoom.players[0].id).toBe('id_host');
      expect(serializedRoom.players[1].id).toBe('id_second');
      expect(serializedRoom.gameState).toBeNull();
    });

    test('[Room.toJSON] 1.15 แปลงข้อมูลห้องสถานะ PLAYING ที่มีเกมกำลังเล่นอยู่ → ได้ข้อมูล gameState ครบถ้วนทั้ง pot, currentStake, deck และ activePlayers', () => {
      const room = new Room('room_playing_save', 50);
      const hostPlayer = new Player('id_host', 'Host');
      const secondPlayer = new Player('id_second', 'Second');

      room.join(hostPlayer);
      room.join(secondPlayer);
      room.startGame('id_host');

      const serializedRoom = room.toJSON() as {
        roomId: string;
        phase: string;
        gameState: {
          pot: number;
          currentStake: number;
          currentPlayerIndex: number;
          activePlayers: Array<{ id: string; privateCards: unknown[] }>;
        };
      };

      expect(serializedRoom.phase).toBe('PLAYING');
      expect(serializedRoom.gameState).toBeDefined();
      expect(serializedRoom.gameState.pot).toBe(100);
      expect(serializedRoom.gameState.currentStake).toBe(50);
      expect(serializedRoom.gameState.activePlayers).toHaveLength(2);
      expect(serializedRoom.gameState.activePlayers[0].privateCards).toHaveLength(3);
    });
  });
});

describe('1. การกู้คืนข้อมูลห้องจาก JSON (Room.fromJSON)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test('[Room.fromJSON] 1.16 กู้คืนห้องสถานะ LOBBY จาก Object → ได้อินสแตนซ์ Room พร้อมข้อมูลผู้เล่นครบทุกคน', () => {
      const validLobbyData = {
        roomId: 'room_restored_lobby',
        phase: 'LOBBY',
        hostId: 'id_restored_host',
        bootAmount: 150,
        players: [
          {
            id: 'id_restored_host',
            name: 'Restored Host',
            chips: 2000,
            bet: 0,
            status: 'WAITING',
            isBlind: true,
            privateCards: [],
          },
          {
            id: 'id_restored_second',
            name: 'Restored Second',
            chips: 1800,
            bet: 0,
            status: 'WAITING',
            isBlind: true,
            privateCards: [],
          },
        ],
      };

      const restoredRoom = Room.fromJSON(validLobbyData);

      expect(restoredRoom).toBeInstanceOf(Room);
      expect(restoredRoom.roomId).toBe('room_restored_lobby');
      expect(restoredRoom.phase).toBe('LOBBY');
      expect(restoredRoom.hostId).toBe('id_restored_host');
      expect(restoredRoom.bootAmount).toBe(150);
      expect(restoredRoom.getPlayerCount()).toBe(2);
      expect(restoredRoom.getPlayer('id_restored_host')?.chips).toBe(2000);
      expect(restoredRoom.getPlayer('id_restored_second')?.chips).toBe(1800);
      expect(restoredRoom.gameState).toBeNull();
    });

    test('[Room.fromJSON] 1.17 กู้คืนห้องสถานะ PLAYING ที่มี GameState (รองรับข้อมูลเก่าที่มี maxPotLimit โดยตัดฟิลด์ทิ้ง) → ได้อินสแตนซ์ Room และ GameState ครบถ้วน', () => {
      const validPlayingData = {
        roomId: 'room_restored_playing',
        phase: 'PLAYING',
        hostId: 'id_player_one',
        bootAmount: 100,
        players: [
          {
            id: 'id_player_one',
            name: 'Player One',
            chips: 900,
            bet: 100,
            status: 'ACTIVE',
            isBlind: true,
            privateCards: [{ suit: 'SPADES', rank: 14 }],
          },
          {
            id: 'id_player_two',
            name: 'Player Two',
            chips: 900,
            bet: 100,
            status: 'ACTIVE',
            isBlind: true,
            privateCards: [{ suit: 'HEARTS', rank: 13 }],
          },
        ],
        gameState: {
          pot: 200,
          currentStake: 100,
          currentPlayerIndex: 1,
          deck: [{ suit: 'CLUBS', rank: 10 }],
          activePlayers: [
            {
              id: 'id_player_one',
              name: 'Player One',
              chips: 900,
              bet: 100,
              status: 'ACTIVE',
              isBlind: true,
              privateCards: [{ suit: 'SPADES', rank: 14 }],
            },
            {
              id: 'id_player_two',
              name: 'Player Two',
              chips: 900,
              bet: 100,
              status: 'ACTIVE',
              isBlind: true,
              privateCards: [{ suit: 'HEARTS', rank: 13 }],
            },
          ],
          bootAmount: 100,
          maxPotLimit: 5000,
          dealerIndex: 0,
        },
      };

      const restoredRoom = Room.fromJSON(validPlayingData);

      expect(restoredRoom).toBeInstanceOf(Room);
      expect(restoredRoom.phase).toBe('PLAYING');
      expect(restoredRoom.gameState).toBeDefined();
      expect(restoredRoom.gameState?.pot).toBe(200);
      expect(restoredRoom.gameState?.currentStake).toBe(100);
      expect(restoredRoom.gameState?.currentPlayerIndex).toBe(1);
      expect(restoredRoom.gameState?.activePlayers).toHaveLength(2);
      expect(restoredRoom.gameState?.activePlayers[0].privateCards[0].rank).toBe(14);
    });

    test('[Room.fromJSON] 1.18 กู้คืนห้องโดยไม่ระบุ bootAmount → ใช้ค่าเริ่มต้นเป็น 50', () => {
      const minimalRoomData = {
        roomId: 'room_default_boot',
      };

      const restoredRoom = Room.fromJSON(minimalRoomData);

      expect(restoredRoom.bootAmount).toBe(50);
      expect(restoredRoom.phase).toBe('LOBBY');
      expect(restoredRoom.hostId).toBeNull();
    });
  });

  describe('กรณีข้อผิดพลาด (Unhappy Paths)', () => {
    const invalidDataTypes = [
      { description: 'null', data: null },
      { description: 'undefined', data: undefined },
      { description: 'Array แทนที่จะเป็น Object', data: [] },
      { description: 'String แทนที่จะเป็น Object', data: 'not_an_object' },
      { description: 'Number แทนที่จะเป็น Object', data: 12345 },
    ];

    test.each(invalidDataTypes)(
      '[Room.fromJSON] 1.19 รับข้อมูลที่ไม่ใช่ Object ($description) → โยน GameError(INVALID_ROOM_DATA)',
      ({ data }) => {
        expectGameErrorWithCode(() => Room.fromJSON(data), 'INVALID_ROOM_DATA');
      },
    );

    const invalidRoomIdCases = [
      { description: 'ไม่มีฟิลด์ roomId', payload: { bootAmount: 50 } },
      { description: 'roomId เป็น String ว่างเปล่า', payload: { roomId: '' } },
      { description: 'roomId เป็นตัวเลข', payload: { roomId: 999 } },
    ];

    test.each(invalidRoomIdCases)(
      '[Room.fromJSON] 1.20 ข้อมูล roomId ไม่ถูกต้อง ($description) → โยน GameError(INVALID_ROOM_DATA)',
      ({ payload }) => {
        expectGameErrorWithCode(() => Room.fromJSON(payload), 'INVALID_ROOM_DATA');
      },
    );

    test('[Room.fromJSON] 1.21 ข้อมูลผู้เล่นใน players ไม่ถูกต้อง → โยน GameError', () => {
      const corruptedPlayerData = {
        roomId: 'room_corrupted_player',
        players: [{ id: 'id_corrupted' }],
      };

      expect(() => Room.fromJSON(corruptedPlayerData)).toThrow();
    });
  });
});
