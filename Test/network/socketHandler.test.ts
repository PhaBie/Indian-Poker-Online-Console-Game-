import { expect, test, describe, beforeEach } from "bun:test";
import { handleClientMessage, broadcastGameStateUpdate, broadcastGameResult, handleClientDisconnect, connectedClients } from "../../src/server/network/socketHandler";
import { ClientEvent, ServerEvent } from "../../src/shared/types";
import { RoomManager } from "../../src/server/domain/models/RoomManager";
import type { WebSocket as WSWebSocket } from "ws";

describe("6. ระบบจัดการเครือข่าย (WebSocket Handler)", () => {
    let mockRoomManager: RoomManager;
    let mockSessionStore: any;
    
    beforeEach(() => {
        connectedClients.clear();
        mockRoomManager = new RoomManager();
        mockSessionStore = {
            createSession: (playerId: string) => "token_123",
            getPlayerId: (token: string) => token === "token_123" ? "player_1" : null
        };
    });

    describe("Happy Paths", () => {
        test("6.1 ระบบตอบกลับด้วย SESSION_CREATED พร้อม Token เมื่อรับคำสั่ง CREATE_ROOM สำเร็จ", () => {
            const sentMessages: ServerEvent[] = [];
            const mockWsClient = {
                send: (data: string) => { sentMessages.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            const mockMessage: ClientEvent = {
                type: 'CREATE_ROOM',
                payload: { playerName: "Thanathon", bootAmount: 50 }
            };

            handleClientMessage(mockWsClient, mockMessage, mockRoomManager, mockSessionStore);

            const sessionEvent = sentMessages.find(message => message.type === 'SESSION_CREATED') as any;
            expect(sessionEvent).toBeDefined();
            expect(sessionEvent.payload).toHaveProperty('reconnectToken');
            expect(sessionEvent.payload).toHaveProperty('playerId');
            
            const roomEvent = sentMessages.find(message => message.type === 'ROOM_CREATED') as any;
            expect(roomEvent).toBeDefined();
            expect(roomEvent.payload).toHaveProperty('roomId');
        });

        test("6.2 ฟังก์ชัน broadcastGameStateUpdate สามารถกระจายข้อมูลไปยัง Client ทุกคนที่เชื่อมต่อในห้องได้", () => {
            const sentMessages1: ServerEvent[] = [];
            const mockWsClient1 = {
                send: (data: string) => { sentMessages1.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            const sentMessages2: ServerEvent[] = [];
            const mockWsClient2 = {
                send: (data: string) => { sentMessages2.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            connectedClients.set("room_999", [mockWsClient1, mockWsClient2]);
            
            mockRoomManager.createRoom("room_999", { id: "host_id", name: "Host" } as any);
            
            broadcastGameStateUpdate("room_999");
            
            expect(sentMessages1.length).toBeGreaterThan(0);
            expect(sentMessages1[0].type).toBe('GAME_STATE_UPDATE');
            expect(sentMessages2.length).toBeGreaterThan(0);
            expect(sentMessages2[0].type).toBe('GAME_STATE_UPDATE');
        });

        test("6.3 ระบบต้องกรองไพ่ (myCards) ให้ตรงกับผู้เล่นเจ้าของ Session เท่านั้น (Privacy Test)", () => {
            const sentMessages: ServerEvent[] = [];
            const mockWsClient = {
                send: (data: string) => { sentMessages.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            const mockMessage: ClientEvent = {
                type: 'JOIN_ROOM',
                payload: { playerName: "Phupa", roomId: "room_123" }
            };

            mockRoomManager.createRoom("room_123", { id: "host_id", name: "Host" } as any);
            handleClientMessage(mockWsClient, mockMessage, mockRoomManager, mockSessionStore);

            const stateEvent = sentMessages.find(message => message.type === 'GAME_STATE_UPDATE') as any;
            expect(stateEvent).toBeDefined();
            expect(stateEvent.payload.players.some((playerData: any) => playerData.privateCards !== undefined)).toBe(false); 
        });
        
        test("6.4 ระบบตอบกลับด้วย GAME_STATE_UPDATE (PLAYING) เมื่อโฮสต์ส่งคำสั่ง START_GAME ได้ถูกต้อง", () => {
            const sentMessages: ServerEvent[] = [];
            const mockWsClient = {
                send: (data: string) => { sentMessages.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            mockRoomManager.createRoom("room_123", { id: "host_id", name: "Host" } as any);
            
            const mockMessage: ClientEvent = {
                type: 'START_GAME'
            };

            handleClientMessage(mockWsClient, mockMessage, mockRoomManager, mockSessionStore);

            const updateEvent = sentMessages.find(message => message.type === 'GAME_STATE_UPDATE') as any;
            expect(updateEvent).toBeDefined();
            expect(updateEvent.payload).toHaveProperty('phase', 'PLAYING');
        });
    });

    describe("Unhappy Paths", () => {
        test("6.5 การ JOIN_ROOM ไปยังห้องที่ไม่มีอยู่จริง ระบบต้องตอบกลับด้วย ERROR", () => {
            const sentMessages: ServerEvent[] = [];
            const mockWsClient = {
                send: (data: string) => { sentMessages.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            const mockMessage: ClientEvent = {
                type: 'JOIN_ROOM',
                payload: { playerName: "Phupa", roomId: "room_invalid" }
            };

            handleClientMessage(mockWsClient, mockMessage, mockRoomManager, mockSessionStore);

            const errorEvent = sentMessages.find(message => message.type === 'ERROR') as any;
            expect(errorEvent).toBeDefined();
        });

        test("6.6 คำสั่ง PLAYER_ACTION ต้องส่ง ERROR กลับมาหากผู้เล่นไม่ได้อยู่ในห้องเกมจริงๆ", () => {
            const sentMessages: ServerEvent[] = [];
            const mockWsClient = {
                send: (data: string) => { sentMessages.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            const mockMessage: ClientEvent = {
                type: 'PLAYER_ACTION',
                payload: { action: "CALL" }
            };

            handleClientMessage(mockWsClient, mockMessage, mockRoomManager, mockSessionStore);

            const errorEvent = sentMessages.find(message => message.type === 'ERROR') as any;
            expect(errorEvent).toBeDefined();
        });
    });
});
