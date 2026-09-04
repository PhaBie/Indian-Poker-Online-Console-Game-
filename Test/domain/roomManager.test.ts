import { expect, test, describe } from "bun:test";
import { RoomManager } from "../../src/server/domain/models/RoomManager";
import { Player } from "../../src/server/domain/models/Player";

describe("8. ระบบจัดการล็อบบี้ส่วนกลาง (Room Manager)", () => {
    test("8.1 สามารถสร้างห้องใหม่และจัดเก็บลงระบบได้", () => {
        const manager = new RoomManager();
        const host = new Player("id_host", "Host");
        const room = manager.createRoom("room_001", host);
        
        expect(room).toBeDefined();
        expect(room.roomId).toBe("room_001");
        expect(manager.getAllRooms().length).toBe(1);
    });

    test("8.2 สามารถค้นหาห้องจาก ID ได้", () => {
        const manager = new RoomManager();
        const host = new Player("id_host", "Host");
        manager.createRoom("room_002", host);
        
        const found = manager.getRoom("room_002");
        expect(found).toBeDefined();
        expect(found?.roomId).toBe("room_002");
    });

    test("8.3 สามารถลบห้องทิ้งได้", () => {
        const manager = new RoomManager();
        const host = new Player("id_host", "Host");
        manager.createRoom("room_003", host);
        
        manager.deleteRoom("room_003");
        
        expect(manager.getAllRooms().length).toBe(0);
        expect(manager.getRoom("room_003")).toBeUndefined();
    });

    test("8.4 ไม่สามารถสร้างห้องที่มีรหัสซ้ำกับห้องที่เปิดอยู่แล้วได้ (ป้องกัน Duplicate Room ID)", () => {
        const manager = new RoomManager();
        const host1 = new Player("id_host1", "Host 1");
        const host2 = new Player("id_host2", "Host 2");
        
        manager.createRoom("room_dup", host1);
        
        expect(() => {
            manager.createRoom("room_dup", host2);
        }).toThrow();
    });
});
