import { expect, test, describe } from "bun:test";
import { StorageManager } from "../../src/server/infrastructure/StorageManager";
import { Room } from "../../src/server/domain/models/Room";
import { Player } from "../../src/server/domain/models/Player";
import { rmSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";

describe("9. ระบบบันทึกและกู้คืนสถานะ (Storage Manager)", () => {
    
    function getTempDir(testName: string) {
        const dir = join(process.cwd(), `tmp_test_storage_${testName}`);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        return dir;
    }

    function cleanupTempDir(dir: string) {
        if (existsSync(dir)) {
            rmSync(dir, { recursive: true, force: true });
        }
    }

    test("9.1 ระบบสามารถบันทึกและโหลดข้อมูล Room กลับมาได้อย่างถูกต้องบน File System และต้องรักษาข้อมูลรอบ (Persistence)", () => {
        const dir = getTempDir("9_1");
        const storage1 = new StorageManager(dir);
        
        const room = new Room("room_file_001");
        const player = new Player("id_save", "SaveMaster");
        player.chips = 9999;
        player.receiveCards([{ suit: 'SPADES', rank: 14 }]);
        room.join(player);
        room.startGame("id_save"); 
        
        storage1.saveRoomState(room);
        
        const filePath = join(dir, "room_file_001.json");
        expect(existsSync(filePath)).toBe(true);
        
        const rawJson = JSON.parse(readFileSync(filePath, 'utf-8'));
        expect(rawJson.phase).toBe("PLAYING");
        expect(rawJson.gameState).toBeDefined();
        expect(rawJson.gameState.pot).toBe(0); 
        
        cleanupTempDir(dir);
    });

    test("9.1 (Fixed) ระบบสามารถบันทึกและโหลดข้อมูล Room กลับมาได้อย่างถูกต้องบน File System และต้องรักษาข้อมูลรอบ (Persistence)", () => {
        const dir = getTempDir("9_1_fixed");
        const storage1 = new StorageManager(dir);
        
        const room = new Room("room_file_001", 50);
        const firstPlayer = new Player("id_p1", "Player1");
        const secondPlayer = new Player("id_p2", "Player2");
        firstPlayer.chips = 1000;
        secondPlayer.chips = 1000;
        
        room.join(firstPlayer);
        room.join(secondPlayer);
        room.startGame("id_p1"); 
        
        if (room.gameState) {
            room.gameState.pot = 500; 
            room.gameState.currentHighestBet = 100;
            room.gameState.activePlayers[0].privateCards = [{ suit: 'SPADES', rank: 14 }];
        }
        
        storage1.saveRoomState(room);
        
        const filePath = join(dir, "room_file_001.json");
        expect(existsSync(filePath)).toBe(true);
        
        const rawJson = JSON.parse(readFileSync(filePath, 'utf-8'));
        expect(rawJson.phase).toBe("PLAYING");
        expect(rawJson.gameState).toBeDefined();
        expect(rawJson.gameState.pot).toBe(500);
        expect(rawJson.gameState.currentHighestBet).toBe(100);
        
        const savedFirstPlayer = rawJson.gameState.activePlayers.find((player: any) => player.id === "id_p1");
        expect(savedFirstPlayer.privateCards).toBeDefined();
        expect(savedFirstPlayer.privateCards.length).toBeGreaterThan(0);
        
        const storage2 = new StorageManager(dir);
        const loadedRoom = storage2.loadRoomState("room_file_001");
        
        expect(loadedRoom).toBeDefined();
        expect(loadedRoom?.roomId).toBe("room_file_001");
        expect(loadedRoom?.phase).toBe("PLAYING");
        expect(loadedRoom?.gameState?.pot).toBe(500);
        
        const loadedFirstPlayer = loadedRoom?.gameState?.activePlayers.find(player => player.id === "id_p1");
        expect(loadedFirstPlayer?.privateCards.length).toBe(1);
        
        cleanupTempDir(dir);
    });

    test("9.2 ระบบสามารถลบไฟล์ Save ของห้องได้เมื่อไม่มีความจำเป็นแล้ว", () => {
        const dir = getTempDir("9_2");
        const storage = new StorageManager(dir);
        const room = new Room("room_file_delete");
        
        storage.saveRoomState(room);
        const filePath = join(dir, "room_file_delete.json");
        expect(existsSync(filePath)).toBe(true);
        
        storage.deleteSavedRoom("room_file_delete");
        expect(existsSync(filePath)).toBe(false);
        
        cleanupTempDir(dir);
    });

    test("9.3 เมื่อระบุรหัสห้องที่ไม่มีไฟล์เซฟ ระบบต้องคืนค่า null", () => {
        const dir = getTempDir("9_3");
        const storage = new StorageManager(dir);
        
        const result = storage.loadRoomState("room_ghost");
        expect(result).toBeNull();
        
        cleanupTempDir(dir);
    });
});
