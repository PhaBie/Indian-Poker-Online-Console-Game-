import { expect, test, describe, beforeEach } from "bun:test";
import type { NetworkContext } from "../../src/server/network/socketHandler";
import { handleClientMessage, broadcastGameStateUpdate } from "../../src/server/network/socketHandler";
import type { ClientEvent, ServerEvent } from "../../src/shared/types";
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
        test("[socketHandler.handleClientMessage] 6.1 ส่ง CREATE_ROOM → คืนค่า SESSION_CREATED พร้อม Token และ ROOM_CREATED พร้อม roomId", () => {
            const sentMessages: ServerEvent[] = [];
            const mockWsClient = {
                send: (data: string) => { sentMessages.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            const mockMessage: ClientEvent = {
                type: 'CREATE_ROOM',
                payload: { playerName: "Thanathon", bootAmount: 50 }
            };

            handleClientMessage(mockWsClient, mockMessage, mockContext);

            const sessionEvent = sentMessages.find(message => message.type === 'SESSION_CREATED') as Extract<ServerEvent, { type: 'SESSION_CREATED' }>;
            expect(sessionEvent).toBeDefined();
            expect(sessionEvent.payload).toHaveProperty('reconnectToken');
            expect(sessionEvent.payload).toHaveProperty('playerId');
            
            const roomEvent = sentMessages.find(message => message.type === 'ROOM_CREATED') as Extract<ServerEvent, { type: 'ROOM_CREATED' }>;
            expect(roomEvent).toBeDefined();
            expect(roomEvent.payload).toHaveProperty('roomId');
        });

        test("[socketHandler.broadcastGameStateUpdate] 6.2 สั่งกระจายสถานะห้อง → Client ทุกคนที่อยู่ในห้องได้รับ GAME_STATE_UPDATE", () => {
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

        test("[socketHandler.broadcastGameStateUpdate] 6.3 กระจายสถานะห้อง → ผู้เล่น Blind ได้รับ myCards ว่าง ส่วน Seen ได้รับไพ่ตัวเองครบ และทุกคนไม่เห็นไพ่ privateCards ของคนอื่น", () => {
            const sentMessages1: ServerEvent[] = [];
            const mockWsClient1 = { send: (data: string) => sentMessages1.push(JSON.parse(data)) } as unknown as WSWebSocket;
            
            const sentMessages2: ServerEvent[] = [];
            const mockWsClient2 = { send: (data: string) => sentMessages2.push(JSON.parse(data)) } as unknown as WSWebSocket;
            
            const host = new Player("player_1", "Phupa");
            host.isBlind = true;
            host.receiveCards([{ suit: 'SPADES', rank: 14 }, { suit: 'SPADES', rank: 13 }, { suit: 'SPADES', rank: 12 }]);
            
            const secondPlayer = new Player("player_2", "Beam");
            secondPlayer.isBlind = false;
            secondPlayer.receiveCards([{ suit: 'HEARTS', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'HEARTS', rank: 4 }]);
            
            const room = mockContext.roomManager.createRoom("room_123", host);
            room.join(secondPlayer);
            room.phase = 'PLAYING';

            mockContext.connectedClients.set(mockWsClient1, { playerId: "player_1", roomId: "room_123" });
            mockContext.connectedClients.set(mockWsClient2, { playerId: "player_2", roomId: "room_123" });
            
            broadcastGameStateUpdate("room_123", mockContext);

            const stateEvent1 = sentMessages1.find(message => message.type === 'GAME_STATE_UPDATE') as Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>;
            const stateEvent2 = sentMessages2.find(message => message.type === 'GAME_STATE_UPDATE') as Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>;
            
            expect(stateEvent1).toBeDefined();
            expect(stateEvent2).toBeDefined();
            
            expect(stateEvent1.payload.players.length).toBe(2);
            expect(stateEvent1.payload.players.some(playerData => 'privateCards' in playerData)).toBe(false);
            expect(stateEvent2.payload.players.some(playerData => 'privateCards' in playerData)).toBe(false);
            
            expect(stateEvent1.payload.myCards).toEqual([]);
            expect(stateEvent2.payload.myCards).toEqual([{ suit: 'HEARTS', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'HEARTS', rank: 4 }]);
        });
        
        test("[socketHandler.handleClientMessage] 6.4 โฮสต์ส่ง START_GAME → คืนค่า GAME_STATE_UPDATE ที่มี phase เป็น PLAYING", () => {
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

            const updateEvent = sentMessages.find(message => message.type === 'GAME_STATE_UPDATE') as Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>;
            expect(updateEvent).toBeDefined();
            expect(updateEvent.payload).toHaveProperty('phase', 'PLAYING');
        });

        test("[socketHandler.handleClientMessage] 6.5 ส่ง JOIN_ROOM พร้อม Token ที่ถูกต้องของคนที่หลุด → คืนค่า GAME_STATE_UPDATE และผูก Session กับผู้เล่นเดิม รักษาชิป เดิมพันและไพ่ และออกจากสถานะ DISCONNECTED", () => {
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

            const joinedEvent = sentMessages.find(message => message.type === 'GAME_STATE_UPDATE') as Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>;
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
        test("[socketHandler.handleClientMessage] 6.6 ส่ง JOIN_ROOM รหัสห้องไม่มีอยู่จริง → คืนค่า ERROR", () => {
            const sentMessages: ServerEvent[] = [];
            const mockWsClient = {
                send: (data: string) => { sentMessages.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            const mockMessage: ClientEvent = {
                type: 'JOIN_ROOM',
                payload: { playerName: "Phupa", roomId: "room_invalid" }
            };

            handleClientMessage(mockWsClient, mockMessage, mockContext);

            const errorEvent = sentMessages.find(message => message.type === 'ERROR') as Extract<ServerEvent, { type: 'ERROR' }>;
            expect(errorEvent).toBeDefined();
        });

        test("[socketHandler.handleClientMessage] 6.7 ส่ง PLAYER_ACTION แต่ไม่อยู่ในห้อง → คืนค่า ERROR", () => {
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

            const errorEvent = sentMessages.find(message => message.type === 'ERROR') as Extract<ServerEvent, { type: 'ERROR' }>;
            expect(errorEvent).toBeDefined();
        });

        test("[socketHandler.handleClientMessage] 6.8 ส่ง JOIN_ROOM พร้อม Token ผิด → คืนค่า ERROR (INVALID_TOKEN) และสถานะยังคง DISCONNECTED", () => {
            const host = new Player("player_1", "Host");
            mockContext.roomManager.createRoom("room_123", host);
            host.status = 'DISCONNECTED';
            
            const sentMessages: ServerEvent[] = [];
            const mockWsClient = {
                send: (data: string) => { sentMessages.push(JSON.parse(data)); }
            } as unknown as WSWebSocket;
            
            const mockMessage: ClientEvent = {
                type: 'JOIN_ROOM',
                payload: { playerName: "Hacker", roomId: "room_123", reconnectToken: "wrong_token" }
            };

            handleClientMessage(mockWsClient, mockMessage, mockContext);

            const errorEvent = sentMessages.find(message => message.type === 'ERROR');
            expect(errorEvent).toBeDefined();
            if (errorEvent && errorEvent.type === 'ERROR') {
                expect(errorEvent.code).toBe("INVALID_TOKEN");
            }
            
            const session = mockContext.connectedClients.get(mockWsClient);
            expect(session).toBeUndefined();
            expect(host.status).toBe('DISCONNECTED');
        });
    });
});


