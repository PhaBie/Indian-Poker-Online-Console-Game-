import { expect, test, describe } from "bun:test";
import { StorageManager } from "../../src/server/infrastructure/StorageManager";
import { Room } from "../../src/server/domain/models/Room";
import { Player } from "../../src/server/domain/models/Player";
import { rmSync, existsSync, readFileSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("9. ระบบบันทึกและกู้คืนสถานะ (Storage Manager)", () => {
    
    function withTempDir(testFn: (dir: string) => void) {
        const dir = mkdtempSync(join(tmpdir(), "poker-storage-test-"));
        try {
            testFn(dir);
        } finally {
            if (existsSync(dir)) {
                rmSync(dir, { recursive: true, force: true });
            }
        }
    }

    test("9.1 ระบบสามารถบันทึกและโหลดข้อมูล Room กลับมาได้อย่างถูกต้องบน File System และต้องรักษาข้อมูลรอบ (Persistence)", () => {
        withTempDir((dir) => {
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
                room.gameState.currentStake = 100;
                room.gameState.activePlayers[0].privateCards = [{ suit: 'SPADES', rank: 14 }];
                room.gameState.activePlayers[1].privateCards = [{ suit: 'HEARTS', rank: 2 }];
            }
            
            storage1.saveRoomState(room);
            
            const filePath = join(dir, "room_file_001.json");
            expect(existsSync(filePath)).toBe(true);
            
            const rawJson = JSON.parse(readFileSync(filePath, 'utf-8'));
            expect(rawJson.phase).toBe("PLAYING");
            expect(rawJson.gameState).toBeDefined();
            expect(rawJson.gameState.pot).toBe(500);
            expect(rawJson.gameState.currentStake).toBe(100);
            
            const savedFirstPlayer = rawJson.gameState.activePlayers.find((player: { id: string, privateCards?: unknown[] }) => player.id === "id_p1");
            expect(savedFirstPlayer.privateCards).toBeDefined();
            expect(savedFirstPlayer.privateCards).toEqual([{ suit: 'SPADES', rank: 14 }]);
            
            const storage2 = new StorageManager(dir);
            const loadedRoom = storage2.loadRoomState("room_file_001");
            
            expect(loadedRoom).toBeDefined();
            expect(loadedRoom?.roomId).toBe("room_file_001");
            expect(loadedRoom?.phase).toBe("PLAYING");
            expect(loadedRoom?.gameState?.pot).toBe(500);
            expect(loadedRoom?.gameState?.currentStake).toBe(100);
            
            const loadedFirstPlayer = loadedRoom?.gameState?.activePlayers.find(player => player.id === "id_p1");
            expect(loadedFirstPlayer?.privateCards).toEqual([{ suit: 'SPADES', rank: 14 }]);
        });
    });

    test("9.2 ระบบสามารถลบไฟล์ Save ของห้องได้เมื่อไม่มีความจำเป็นแล้ว", () => {
        withTempDir((dir) => {
            const storage = new StorageManager(dir);
            const room = new Room("room_file_delete");
            
            storage.saveRoomState(room);
            const filePath = join(dir, "room_file_delete.json");
            expect(existsSync(filePath)).toBe(true);
            
            storage.deleteSavedRoom("room_file_delete");
            expect(existsSync(filePath)).toBe(false);
        });
    });

    test("9.3 เมื่อระบุรหัสห้องที่ไม่มีไฟล์เซฟ ระบบต้องคืนค่า null", () => {
        withTempDir((dir) => {
            const storage = new StorageManager(dir);
            const result = storage.loadRoomState("room_ghost");
            expect(result).toBeNull();
        });
    });
});
