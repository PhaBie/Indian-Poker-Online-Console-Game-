import { expect, test, describe } from 'bun:test';
import { RoomManager } from '../../src/server/domain/models/RoomManager';
import { Player } from '../../src/server/domain/models/Player';
import { GameError } from '../../src/server/domain/errors/GameError';

describe('8. ระบบจัดการล็อบบี้ส่วนกลาง (Room Manager)', () => {
  describe('Happy Paths', () => {
    test('[RoomManager.createRoom] 8.1 สร้างห้องใหม่ → ออบเจกต์ห้องถูกสร้างและถูกเก็บลงระบบ', () => {
      const manager = new RoomManager();
      const host = new Player('id_host', 'Host');
      const room = manager.createRoom('room_001', host);

      expect(room).toBeDefined();
      expect(room.roomId).toBe('room_001');
      expect(manager.getAllRooms().length).toBe(1);
    });

    test('[RoomManager.getRoom] 8.2 ค้นหาห้องจาก ID → คืนค่าออบเจกต์ห้องที่ตรงกับ ID', () => {
      const manager = new RoomManager();
      const host = new Player('id_host', 'Host');
      manager.createRoom('room_002', host);

      const found = manager.getRoom('room_002');
      expect(found).toBeDefined();
      expect(found?.roomId).toBe('room_002');
    });

    test('[RoomManager.deleteRoom] 8.3 ลบห้องเป้าหมาย → ห้องเป้าหมายถูกลบและห้องอื่นยังคงอยู่', () => {
      const manager = new RoomManager();
      const host = new Player('id_host', 'Host');
      manager.createRoom('room_target', host);
      manager.createRoom('room_keep', host);

      manager.deleteRoom('room_target');

      expect(manager.getAllRooms().length).toBe(1);
      expect(manager.getRoom('room_target')).toBeUndefined();
      expect(manager.getRoom('room_keep')).toBeDefined();
    });
  });

  describe('Unhappy Paths', () => {
    test('[RoomManager.createRoom] 8.4 สร้างห้องด้วย ID ซ้ำ → โยน GameError', () => {
      const manager = new RoomManager();
      const host1 = new Player('id_host1', 'Host 1');
      const host2 = new Player('id_host2', 'Host 2');

      manager.createRoom('room_dup', host1);

      expect(() => {
        manager.createRoom('room_dup', host2);
      }).toThrow(GameError);
    });
  });
});
