import { expect, test, describe } from "bun:test";
import { PokerServer } from "../../src/server/index";

describe("7. ระบบเซิร์ฟเวอร์หลัก (Server Entry)", () => {
    test("7.1 สามารถสร้าง Server และเรียกใช้ start/stop ได้ (เปลี่ยนสถานะ isRunning)", () => {
        const server = new PokerServer();
        
        server.start(8080);
        expect(server.isRunning).toBe(true);
        
        server.stop();
        expect(server.isRunning).toBe(false);
    });
});
