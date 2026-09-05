import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { StorageManager } from "../../src/server/infrastructure/StorageManager";
import { Room } from "../../src/server/domain/models/Room";
import { Player } from "../../src/server/domain/models/Player";
import { rmSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const TEST_STORAGE_DIR = join(process.cwd(), "tmp_test_storage");

describe("9. ระบบบันทึกและกู้คืนสถานะ (Storage Manager)", () => {
    beforeAll(() => {
        if (!existsSync(TEST_STORAGE_DIR)) {
            mkdirSync(TEST_STORAGE_DIR, { recursive: true });
        }
    });

    afterAll(() => {
        if (existsSync(TEST_STORAGE_DIR)) {
            rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
        }
    });

    test("9.1 ระบบสามารถบันทึกและโหลดข้อมูล Room กลับมาได้อย่างถูกต้องบน File System", () => {
        const storage = new StorageManager(TEST_STORAGE_DIR);
        const room = new Room("room_file_001");
        const player = new Player("id_save", "SaveMaster");
        player.chips = 9999;
        room.join(player);
        
        storage.saveRoomState(room);
        
        expect(storage.checkSaveExists("room_file_001")).toBe(true);
        
        const loadedRoom = storage.loadRoomState("room_file_001");
        expect(loadedRoom).toBeDefined();
        expect(loadedRoom?.roomId).toBe("room_file_001");
        
        const loadedPlayer = loadedRoom?.getPlayer("id_save");
        expect(loadedPlayer).toBeDefined();
        expect(loadedPlayer?.chips).toBe(9999);
    });

    test("9.2 ระบบสามารถลบไฟล์ Save ของห้องได้เมื่อไม่มีความจำเป็นแล้ว", () => {
        const storage = new StorageManager(TEST_STORAGE_DIR);
        const room = new Room("room_file_delete");
        storage.saveRoomState(room);
        
        expect(storage.checkSaveExists("room_file_delete")).toBe(true);
        
        storage.deleteSavedRoom("room_file_delete");
        
        expect(storage.checkSaveExists("room_file_delete")).toBe(false);
    });

    test("9.3 เมื่อระบุรหัสห้องที่ไม่มีไฟล์เซฟ ระบบต้องคืนค่า null", () => {
        const storage = new StorageManager(TEST_STORAGE_DIR);
        const result = storage.loadRoomState("room_ghost");
        expect(result).toBeNull();
    });
});
