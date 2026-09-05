import { expect, test, describe, beforeEach } from "bun:test";
import { handleClientMessage, broadcastGameStateUpdate, NetworkContext } from "../../src/server/network/socketHandler";
import { ClientEvent, ServerEvent } from "../../src/shared/types";
import { RoomManager } from "../../src/server/domain/models/RoomManager";
import { Player } from "../../src/server/domain/models/Player";
import type { WebSocket as WSWebSocket } from "ws";

describe("6. ระบบจัดการเครือข่าย (WebSocket Handler)", () => {
    let mockContext: NetworkContext;

    beforeEach(() => {
        const sessionMap = new Map<string, string>();
        let tokenCounter = 1;

        mockContext = {
            roomManager: new RoomManager(),
            sessionStore: {
                createSession: (playerId: string) => {
                    const token = `token_${tokenCounter++}`;
                    sessionMap.set(token, playerId);
                    return token;
                },
                getPlayerId: (token: string) => sessionMap.get(token) || null
            },
            connectedClients: new Map()
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

            handleClientMessage(mockWsClient, mockMessage, mockContext);

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
            const mockWsClient1 = { send: (data: string) => sentMessages1.push(JSON.parse(data)) } as unknown as WSWebSocket;
            
            const sentMessages2: ServerEvent[] = [];
            const mockWsClient2 = { send: (data: string) => sentMessages2.push(JSON.parse(data)) } as unknown as WSWebSocket;
            
            const host = new Player("player_1", "Host");
            const secondPlayer = new Player("player_2", "P2");
            const room = mockContext.roomManager.createRoom("room_999", host);
            room.join(secondPlayer);

            mockContext.connectedClients.set(mockWsClient1, { playerId: "player_1", roomId: "room_999" });
            mockContext.connectedClients.set(mockWsClient2, { playerId: "player_2", roomId: "room_999" });
            
            broadcastGameStateUpdate("room_999", mockContext);
            
            expect(sentMessages1.length).toBeGreaterThan(0);
            expect(sentMessages1[0].type).toBe('GAME_STATE_UPDATE');
            expect(sentMessages2.length).toBeGreaterThan(0);
            expect(sentMessages2[0].type).toBe('GAME_STATE_UPDATE');
        });

        test("6.3 ระบบต้องกรองไพ่ (myCards) ให้ตรงกับผู้เล่นเจ้าของ Session เท่านั้น (Privacy Test)", () => {
            const sentMessages1: ServerEvent[] = [];
            const mockWsClient1 = { send: (data: string) => sentMessages1.push(JSON.parse(data)) } as unknown as WSWebSocket;
            
            const sentMessages2: ServerEvent[] = [];
            const mockWsClient2 = { send: (data: string) => sentMessages2.push(JSON.parse(data)) } as unknown as WSWebSocket;
            
            const host = new Player("player_1", "Phupa");
            host.receiveCards([{ suit: 'SPADES', rank: 14 }]);
            
            const secondPlayer = new Player("player_2", "Beam");
            secondPlayer.receiveCards([{ suit: 'HEARTS', rank: 2 }]);
            
            const room = mockContext.roomManager.createRoom("room_123", host);
            room.join(secondPlayer);
            room.phase = 'PLAYING';

            mockContext.connectedClients.set(mockWsClient1, { playerId: "player_1", roomId: "room_123" });
            mockContext.connectedClients.set(mockWsClient2, { playerId: "player_2", roomId: "room_123" });
            
            broadcastGameStateUpdate("room_123", mockContext);

            const stateEvent1 = sentMessages1.find(message => message.type === 'GAME_STATE_UPDATE') as any;
            const stateEvent2 = sentMessages2.find(message => message.type === 'GAME_STATE_UPDATE') as any;
            
            expect(stateEvent1).toBeDefined();
            expect(stateEvent2).toBeDefined();
            
            expect(stateEvent1.payload.players.length).toBe(2);
            expect(stateEvent1.payload.players.some((playerData: any) => playerData.privateCards !== undefined)).toBe(false); 
            expect(stateEvent2.payload.players.some((playerData: any) => playerData.privateCards !== undefined)).toBe(false); 
            
            expect(stateEvent1.payload.myCards).toEqual([{ suit: 'SPADES', rank: 14 }]);
            expect(stateEvent2.payload.myCards).toEqual([{ suit: 'HEARTS', rank: 2 }]);
        });
        
        test("6.4 ระบบตอบกลับด้วย GAME_STATE_UPDATE (PLAYING) เมื่อโฮสต์ส่งคำสั่ง START_GAME ได้ถูกต้อง", () => {
            const sentMessages: ServerEvent[] = [];
            const mockWsClient = {
                send: (data: string) => { sentMessages.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            const host = new Player("host_id", "Host");
            const secondPlayer = new Player("player_2", "P2");
            const room = mockContext.roomManager.createRoom("room_123", host);
            room.join(secondPlayer);
            
            mockContext.connectedClients.set(mockWsClient, { playerId: "host_id", roomId: "room_123" });
            
            const mockMessage: ClientEvent = {
                type: 'START_GAME'
            };

            handleClientMessage(mockWsClient, mockMessage, mockContext);

            const updateEvent = sentMessages.find(message => message.type === 'GAME_STATE_UPDATE') as any;
            expect(updateEvent).toBeDefined();
            expect(updateEvent.payload).toHaveProperty('phase', 'PLAYING');
        });

        test("6.5 การส่ง JOIN_ROOM พร้อม reconnectToken ต้องคืนค่า Session เดิมพร้อมกู้คืนข้อมูลครบถ้วน", () => {
            const host = new Player("player_1", "Host");
            host.chips = 800;
            host.bet = 200;
            host.receiveCards([{ suit: 'SPADES', rank: 14 }]);
            mockContext.roomManager.createRoom("room_123", host);
            
            const validToken = mockContext.sessionStore.createSession("player_1");
            host.status = 'DISCONNECTED';

            const sentMessages: ServerEvent[] = [];
            const mockWsClient = { send: (data: string) => sentMessages.push(JSON.parse(data)) } as unknown as WSWebSocket;
            
            const mockMessage: ClientEvent = {
                type: 'JOIN_ROOM',
                payload: { playerName: "", reconnectToken: validToken, roomId: "room_123" }
            };

            handleClientMessage(mockWsClient, mockMessage, mockContext);

            const joinedEvent = sentMessages.find(message => message.type === 'GAME_STATE_UPDATE') as any;
            expect(joinedEvent).toBeDefined();
            
            const session = mockContext.connectedClients.get(mockWsClient);
            expect(session?.playerId).toBe("player_1");
            
            expect(host.status).not.toBe('DISCONNECTED');
            expect(host.chips).toBe(800);
            expect(host.bet).toBe(200);
            expect(host.privateCards).toEqual([{ suit: 'SPADES', rank: 14 }]);
        });
    });

    describe("Unhappy Paths", () => {
        test("6.6 การ JOIN_ROOM ไปยังห้องที่ไม่มีอยู่จริง ระบบต้องตอบกลับด้วย ERROR", () => {
            const sentMessages: ServerEvent[] = [];
            const mockWsClient = {
                send: (data: string) => { sentMessages.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            const mockMessage: ClientEvent = {
                type: 'JOIN_ROOM',
                payload: { playerName: "Phupa", roomId: "room_invalid" }
            };

            handleClientMessage(mockWsClient, mockMessage, mockContext);

            const errorEvent = sentMessages.find(message => message.type === 'ERROR') as any;
            expect(errorEvent).toBeDefined();
        });

        test("6.7 คำสั่ง PLAYER_ACTION ต้องส่ง ERROR กลับมาหากผู้เล่นไม่ได้อยู่ในห้องเกมจริงๆ", () => {
            const sentMessages: ServerEvent[] = [];
            const mockWsClient = {
                send: (data: string) => { sentMessages.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            mockContext.connectedClients.set(mockWsClient, { playerId: "player_fake", roomId: null });

            const mockMessage: ClientEvent = {
                type: 'PLAYER_ACTION',
                payload: { action: "CALL" }
            };

            handleClientMessage(mockWsClient, mockMessage, mockContext);

            const errorEvent = sentMessages.find(message => message.type === 'ERROR') as any;
            expect(errorEvent).toBeDefined();
        });

        test("6.8 การ Reconnect ด้วย Token ที่ไม่ถูกต้องต้องถูกปฏิเสธ (ERROR)", () => {
            const sentMessages: ServerEvent[] = [];
            const mockWsClient = {
                send: (data: string) => { sentMessages.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            const mockMessage: ClientEvent = {
                type: 'JOIN_ROOM',
                payload: { playerName: "Hacker", roomId: "room_123", reconnectToken: "wrong_token" }
            };

            handleClientMessage(mockWsClient, mockMessage, mockContext);

            const errorEvent = sentMessages.find(message => message.type === 'ERROR') as any;
            expect(errorEvent).toBeDefined();
        });
    });
});
