import { expect, test, describe } from "bun:test";
import { toPublicPlayerDTO, generateRoomId, generatePlayerId } from "../../src/server/utils/helpers";
import type { ServerPlayer } from "../../src/shared/types";

describe("5. ระบบช่วยเหลือและคัดกรองข้อมูล (Utils & Helpers)", () => {
    test("5.1 ฟังก์ชัน toPublicPlayerDTO ต้องคัดกรองเฉพาะข้อมูลที่อนุญาตให้เปิดเผยได้เท่านั้น", () => {
        const mockPlayer: ServerPlayer = {
            id: "id_secret_123",
            name: "Thanathon",
            chips: 5000,
            bet: 100,
            status: 'ACTIVE',
            privateCards: [{ suit: 'SPADES', rank: 14 }],
            isBlind: true
        };

        const publicPlayer = toPublicPlayerDTO(mockPlayer);

        expect(publicPlayer).toHaveProperty("id", "id_secret_123");
        expect(publicPlayer).toHaveProperty("name", "Thanathon");
        expect(publicPlayer).toHaveProperty("chips", 5000);
        expect(publicPlayer).toHaveProperty("bet", 100);
        expect(publicPlayer).toHaveProperty("status", "ACTIVE");
        expect(publicPlayer).toHaveProperty("isBlind", true);
        
        expect(publicPlayer).not.toHaveProperty("privateCards");
    });

    test("5.2 ฟังก์ชัน generateRoomId ต้องสร้างรหัสห้องที่ไม่ซ้ำกันได้", () => {
        const roomId1 = generateRoomId();
        const roomId2 = generateRoomId();

        expect(typeof roomId1).toBe("string");
        expect(roomId1.length).toBeGreaterThan(0);
        expect(roomId1).not.toBe(roomId2);
    });

    test("5.3 ฟังก์ชัน generatePlayerId ต้องสร้างรหัสผู้เล่นที่ไม่ซ้ำกันได้", () => {
        const playerId1 = generatePlayerId();
        const playerId2 = generatePlayerId();

        expect(typeof playerId1).toBe("string");
        expect(playerId1.length).toBeGreaterThan(0);
        expect(playerId1).not.toBe(playerId2);
    });

    test("5.4 ฟังก์ชัน generateRoomId ต้องได้รหัสความยาว 6 ตัวอักษรและมีเฉพาะตัวเลขหรือตัวอักษรภาษาอังกฤษ", () => {
        const roomId = generateRoomId();
        
        expect(roomId.length).toBe(6);
        expect(/^[a-zA-Z0-9]+$/.test(roomId)).toBe(true);
    });
});
