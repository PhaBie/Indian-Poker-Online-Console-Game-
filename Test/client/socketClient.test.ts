import { expect, test, describe } from "bun:test";
import { SocketClient } from "../../src/client/network/socketClient";
import type { ServerEvent, ClientEvent } from "../../src/shared/types";

describe("10. ระบบเครือข่ายฝั่งผู้เล่น (Client Socket)", () => {
    describe("Happy Paths", () => {
        test("[SocketClient.connect] 10.1 รับเหตุการณ์เชื่อมต่อสำเร็จ → isConnected เป็น true", () => {
            const client = new SocketClient();
            
            const fakeTransport = {
                onOpen: null as (() => void) | null,
                open() {
                    if (this.onOpen) {this.onOpen();}
                }
            };

            client.connect("ws_fake", fakeTransport);
            expect(client.isConnected).toBe(false);

            fakeTransport.open(); 
            expect(client.isConnected).toBe(true);

            client.disconnect();
            expect(client.isConnected).toBe(false);
        });

        test("[SocketClient.onReceive] 10.2 รับ ServerEvent → บันทึกลงตัวแปร lastReceivedEvent", () => {
            const client = new SocketClient();
            const mockEvent: ServerEvent = { type: 'ERROR', message: "Test" };

            client.onReceive(mockEvent);
            expect(client.lastReceivedEvent).toEqual(mockEvent);
        });
    });

    describe("Unhappy Paths", () => {
        test("[SocketClient.send] 10.3 ส่งข้อมูลขณะยังไม่เชื่อมต่อ → โยน Error", () => {
            const client = new SocketClient();
            const mockEvent: ClientEvent = { type: 'START_GAME' };

            expect(() => {
                client.send(mockEvent);
            }).toThrow(Error);
        });
    });
});
