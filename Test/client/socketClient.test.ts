import { expect, test, describe } from "bun:test";
import { SocketClient } from "../../src/client/network/socketClient";
import { ServerEvent, ClientEvent } from "../../src/shared/types";

describe("10. ระบบเครือข่ายฝั่งผู้เล่น (Client Socket)", () => {
    describe("Happy Paths", () => {
        test("10.1 สถานะ isConnected จะเป็น true เมื่อ Transport ส่งเหตุการณ์เชื่อมต่อสำเร็จมาให้เท่านั้น", () => {
            const client = new SocketClient();
            
            const fakeTransport = {
                onOpen: null as (() => void) | null,
                open: function() {
                    if (this.onOpen) this.onOpen();
                }
            };

            client.connect("ws_fake", fakeTransport);
            expect(client.isConnected).toBe(false);

            fakeTransport.open(); 
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
    });

    describe("Unhappy Paths", () => {
        test("10.3 ไม่สามารถส่งข้อมูลได้หากยังไม่ได้เชื่อมต่อ (Disconnected State)", () => {
            const client = new SocketClient();
            const mockEvent: ClientEvent = { type: 'START_GAME' };

            expect(() => {
                client.send(mockEvent);
            }).toThrow(Error);
        });
    });
});
