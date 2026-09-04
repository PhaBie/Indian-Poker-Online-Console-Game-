import { expect, test, describe } from "bun:test";
import { SocketClient } from "../../src/client/network/socketClient";
import { ServerEvent, ClientEvent } from "../../src/shared/types";

describe("10. ระบบเครือข่ายฝั่งผู้เล่น (Client Socket)", () => {
    test("10.1 สามารถเชื่อมต่อและตัดการเชื่อมต่อได้ (เปลี่ยนสถานะ isConnected)", () => {
        const client = new SocketClient();

        client.connect("ws://localhost:8080");
        expect(client.isConnected).toBe(true);

        client.disconnect();
        expect(client.isConnected).toBe(false);
    });

    test("10.2 สามารถรับ ServerEvent และบันทึกลงตัวแปรได้ (onReceive)", () => {
        const client = new SocketClient();
        const mockEvent: ServerEvent = { type: 'ERROR', message: "Test" };

        client.onReceive(mockEvent);
        expect(client.lastReceivedEvent).toEqual(mockEvent);
    });

    test("10.3 ไม่สามารถส่งข้อมูลได้หากยังไม่ได้เชื่อมต่อ (Disconnected State)", () => {
        const client = new SocketClient();
        const mockEvent: ClientEvent = { type: 'START_GAME' };

        expect(() => {
            client.send(mockEvent);
        }).toThrow();
    });
});
