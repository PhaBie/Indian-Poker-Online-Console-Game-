import { expect, test, describe } from 'bun:test';
import {
  toPublicPlayerDTO,
  generateRoomId,
  generatePlayerId,
} from '../../src/server/utils/helpers';
import type { ServerPlayer } from '../../src/shared/types';

describe('5. ระบบช่วยเหลือและคัดกรองข้อมูล (Utils & Helpers)', () => {
  test('[helpers.toPublicPlayerDTO] 5.1 แปลงข้อมูลผู้เล่น → คืนค่าออบเจกต์ที่ไม่มี property privateCards', () => {
    const mockPlayer: ServerPlayer = {
      id: 'id_secret_123',
      name: 'Thanathon',
      chips: 5000,
      bet: 100,
      status: 'ACTIVE',
      privateCards: [{ suit: 'SPADES', rank: 14 }],
      isBlind: true,
    };

    const publicPlayer = toPublicPlayerDTO(mockPlayer);

    expect(publicPlayer).toHaveProperty('id', 'id_secret_123');
    expect(publicPlayer).toHaveProperty('name', 'Thanathon');
    expect(publicPlayer).toHaveProperty('chips', 5000);
    expect(publicPlayer).toHaveProperty('bet', 100);
    expect(publicPlayer).toHaveProperty('status', 'ACTIVE');
    expect(publicPlayer).toHaveProperty('isBlind', true);

    expect(publicPlayer).not.toHaveProperty('privateCards');
  });

  test('[helpers.generateRoomId] 5.2 สร้างรหัสห้องสองครั้ง → ได้รหัสห้องที่ไม่ซ้ำกัน', () => {
    const roomId1 = generateRoomId();
    const roomId2 = generateRoomId();

    expect(typeof roomId1).toBe('string');
    expect(roomId1.length).toBeGreaterThan(0);
    expect(roomId1).not.toBe(roomId2);
  });

  test('[helpers.generatePlayerId] 5.3 สร้างรหัสผู้เล่นสองครั้ง → ได้รหัสผู้เล่นที่ไม่ซ้ำกัน', () => {
    const playerId1 = generatePlayerId();
    const playerId2 = generatePlayerId();

    expect(typeof playerId1).toBe('string');
    expect(playerId1.length).toBeGreaterThan(0);
    expect(playerId1).not.toBe(playerId2);
  });

  test('[helpers.generateRoomId] 5.4 สร้างรหัสห้อง → คืนค่ารหัสความยาว 6 ตัวอักษรที่มีเฉพาะตัวเลขหรืออักษรภาษาอังกฤษ', () => {
    const roomId = generateRoomId();

    expect(roomId.length).toBe(6);
    expect(/^[a-zA-Z0-9]+$/.test(roomId)).toBe(true);
  });
});
