import { expect, test, describe } from "bun:test";
import { handleClientMessage, broadcastGameStateUpdate, broadcastGameResult, handleClientDisconnect, connectedClients } from "../../src/server/network/socketHandler";
import { ClientEvent } from "../../src/shared/types";
import { WebSocket } from "ws";

describe("6. ระบบจัดการเครือข่าย (WebSocket Handler)", () => {
    test("6.1 ระบบตอบกลับด้วย ROOM_CREATED พร้อม roomId เมื่อรับคำสั่ง CREATE_ROOM", () => {
        let sentData: any = null;
        const mockWsClient = {
            send: (data: string) => { sentData = JSON.parse(data); }
        } as unknown as WebSocket;
        
        const mockMessage: ClientEvent = {
            type: 'CREATE_ROOM',
            payload: { playerName: "Thanathon", bootAmount: 50 }
        };

        handleClientMessage(mockWsClient, mockMessage);

        expect(sentData).not.toBeNull();
        expect(sentData.type).toBe('ROOM_CREATED');
        expect(sentData.payload).toHaveProperty('roomId');
    });

    test("6.2 ระบบสามารถรับคำสั่ง JOIN_ROOM จาก Client และตอบกลับสถานะห้องได้", () => {
        let sentData: any = null;
        const mockWsClient = {
            send: (data: string) => { sentData = JSON.parse(data); }
        } as unknown as WebSocket;
        
        const mockMessage: ClientEvent = {
            type: 'JOIN_ROOM',
            payload: { playerName: "Phupa", roomId: "room_123" }
        };

        handleClientMessage(mockWsClient, mockMessage);

        expect(sentData).not.toBeNull();
        expect(sentData.type).toBe('GAME_STATE_UPDATE');
        expect(sentData.payload).toHaveProperty('roomId', 'room_123');
    });

    test("6.3 ระบบสามารถรับคำสั่ง PLAYER_ACTION และ Broadcast ข้อมูลอัปเดตกลับไปได้", () => {
        let sentData: any = null;
        const mockWsClient = {
            send: (data: string) => { sentData = JSON.parse(data); }
        } as unknown as WebSocket;
        
        const mockMessage: ClientEvent = {
            type: 'PLAYER_ACTION',
            payload: { action: "CALL" }
        };

        handleClientMessage(mockWsClient, mockMessage);

        expect(sentData).not.toBeNull();
        expect(sentData.type).toBe('GAME_STATE_UPDATE');
    });

    test("6.4 ฟังก์ชัน broadcastGameStateUpdate สามารถกระจายข้อมูลไปยังทุกคนในห้องได้", () => {
        let sentData: any = null;
        const mockWsClient = {
            send: (data: string) => { sentData = JSON.parse(data); }
        } as unknown as WebSocket;
        
        connectedClients.set("room_999", [mockWsClient]);
        
        broadcastGameStateUpdate("room_999");
        
        expect(sentData).not.toBeNull();
        expect(sentData.type).toBe('GAME_STATE_UPDATE');
    });

    test("6.5 ระบบตอบกลับด้วย GAME_STATE_UPDATE (PLAYING) เมื่อรับคำสั่ง START_GAME", () => {
        let sentData: any = null;
        const mockWsClient = {
            send: (data: string) => { sentData = JSON.parse(data); }
        } as unknown as WebSocket;
        
        const mockMessage: ClientEvent = {
            type: 'START_GAME'
        };

        handleClientMessage(mockWsClient, mockMessage);

        expect(sentData).not.toBeNull();
        expect(sentData.type).toBe('GAME_STATE_UPDATE');
        expect(sentData.payload).toHaveProperty('phase', 'PLAYING');
    });

    test("6.6 ฟังก์ชัน broadcastGameResult สามารถทำงานและส่งผลลัพธ์กลับไปให้ Client ได้", () => {
        let sentData: any = null;
        const mockWsClient = {
            send: (data: string) => { sentData = JSON.parse(data); }
        } as unknown as WebSocket;
        
        connectedClients.set("room_result", [mockWsClient]);
        
        broadcastGameResult("room_result", "id_thanathon", "TRAIL", {});
        
        expect(sentData).not.toBeNull();
        expect(sentData.type).toBe('GAME_RESULT');
    });

    test("6.7 ระบบสามารถตอบกลับด้วย CHAT_MESSAGE เมื่อผู้เล่นส่งคำสั่ง SEND_CHAT", () => {
        let sentData: any = null;
        const mockWsClient = {
            send: (data: string) => { sentData = JSON.parse(data); }
        } as unknown as WebSocket;
        
        const mockMessage: ClientEvent = {
            type: 'SEND_CHAT',
            payload: { message: "Hello World" }
        };

        handleClientMessage(mockWsClient, mockMessage);

        expect(sentData).not.toBeNull();
        expect(sentData.type).toBe('CHAT_MESSAGE');
        expect(sentData.payload).toHaveProperty('message', 'Hello World');
    });

    test("6.8 ระบบสามารถตอบกลับด้วย GAME_SAVED เมื่อโฮสต์ส่งคำสั่ง SAVE_GAME", () => {
        let sentData: any = null;
        const mockWsClient = {
            send: (data: string) => { sentData = JSON.parse(data); }
        } as unknown as WebSocket;
        
        const mockMessage: ClientEvent = {
            type: 'SAVE_GAME'
        };

        handleClientMessage(mockWsClient, mockMessage);

        expect(sentData).not.toBeNull();
        expect(sentData.type).toBe('GAME_SAVED');
    });

    test("6.9 ระบบสามารถตอบกลับด้วย GAME_LOADED เมื่อโฮสต์ส่งคำสั่ง LOAD_GAME", () => {
        let sentData: any = null;
        const mockWsClient = {
            send: (data: string) => { sentData = JSON.parse(data); }
        } as unknown as WebSocket;
        
        const mockMessage: ClientEvent = {
            type: 'LOAD_GAME',
            payload: { roomId: "room_123" }
        };

        handleClientMessage(mockWsClient, mockMessage);

        expect(sentData).not.toBeNull();
        expect(sentData.type).toBe('GAME_LOADED');
    });

    test("6.10 ฟังก์ชัน handleClientDisconnect สามารถลบผู้เล่นออกจากระบบและส่งสถานะอัปเดตได้", () => {
        let sentDataToOther: any = null;
        const mockOtherClient = {
            send: (data: string) => { sentDataToOther = JSON.parse(data); }
        } as unknown as WebSocket;
        
        const mockDisconnectingClient = {} as unknown as WebSocket;
        
        connectedClients.set("room_disc", [mockDisconnectingClient, mockOtherClient]);
        
        handleClientDisconnect(mockDisconnectingClient);
        
        expect(sentDataToOther).not.toBeNull();
        expect(sentDataToOther.type).toBe('GAME_STATE_UPDATE');
    });
});
