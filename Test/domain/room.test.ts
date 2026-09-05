import { expect, test, describe } from "bun:test";
import { Room } from "../../src/server/domain/models/Room";
import { Player } from "../../src/server/domain/models/Player";
import { RoomFullError, NotHostError, GameError, InvalidTokenError } from "../../src/server/domain/errors/GameError";

describe("1. ระบบการจัดการห้องเล่น (Room Management)", () => {
    describe("Happy Paths", () => {
        test("1.1 ผู้สร้างห้องคนแรกจะต้องถูกกำหนดให้เป็น Host อัตโนมัติ", () => {
            const room = new Room("room_001");
            const hostPlayer = new Player("id_thanathon", "Thanathon");

            room.join(hostPlayer);

            expect(room.getPlayerCount()).toBe(1);
            expect(room.hostId).toBe("id_thanathon");
        });

        test("1.2 ผู้เล่นคนอื่นสามารถเข้าร่วมห้องได้สูงสุด 4 คนตามกติกา", () => {
            const room = new Room("room_002");
            const p1 = new Player("id_p1", "P1");
            const p2 = new Player("id_p2", "P2");
            const p3 = new Player("id_p3", "P3");
            const p4 = new Player("id_p4", "P4");

            room.join(p1);
            room.join(p2);
            room.join(p3);
            room.join(p4);

            expect(room.getPlayerCount()).toBe(4);
            expect(room.phase).toBe("LOBBY");
        });

        test("1.3 Host สามารถเริ่มเกมได้เมื่อมีผู้เล่นอย่างน้อย 2 คนขึ้นไป", () => {
            const room = new Room("room_003");
            room.join(new Player("id_thanathon", "Thanathon"));
            room.join(new Player("id_phupa", "Phupa"));

            room.startGame("id_thanathon");

            expect(room.phase).toBe("PLAYING");
        });

        test("1.4 ผู้เล่นที่หลุดไป สามารถ Reconnect เข้ามาและรักษาชิป เดิมพัน และไพ่เดิมได้ครบถ้วน", () => {
            const room = new Room("room_004");
            const player1 = new Player("id_thanathon", "Thanathon");
            
            player1.chips = 800;
            player1.bet = 200;
            player1.receiveCards([{ suit: 'SPADES', rank: 14 }]);
            
            room.join(player1);
            
            player1.status = 'DISCONNECTED';
            const mockToken = "valid_token_xyz";
            
            room.reconnect("id_thanathon", mockToken);
            
            const activePlayer = room.getPlayer("id_thanathon");
            expect(activePlayer?.status).toBe('WAITING');
            expect(activePlayer?.chips).toBe(800);
            expect(activePlayer?.bet).toBe(200);
            expect(activePlayer?.privateCards.length).toBe(1);
        });

        test("1.5 ผู้เล่นสามารถเข้าร่วมห้องขณะที่เกม PLAYING ได้ โดยจะอยู่ในสถานะ WAITING รอรอบถัดไป", () => {
            const room = new Room("room_005");
            room.join(new Player("id_p1", "P1"));
            room.join(new Player("id_p2", "P2"));
            room.startGame("id_p1");
            
            const latePlayer = new Player("id_p3", "P3");
            room.join(latePlayer);
            
            const addedPlayer = room.getPlayer("id_p3");
            expect(addedPlayer?.status).toBe("WAITING");
            expect(room.phase).toBe("PLAYING");
        });
        
        test("1.6 ดึง Public State ต้องไม่มีข้อมูล privateCards หลุดออกไปเด็ดขาด", () => {
            const room = new Room("room_006");
            const player = new Player("id_thanathon", "Thanathon");
            player.privateCards = [{ suit: 'SPADES', rank: 14 }];
            room.join(player);

            const publicState = room.getPublicState();
            expect(publicState[0]).not.toHaveProperty("privateCards");
        });
    });

    describe("Unhappy Paths", () => {
        test("1.7 ไม่สามารถเข้าร่วมห้องที่เต็มแล้ว (4 คน) ได้", () => {
            const room = new Room("room_full");
            room.join(new Player("id_p1", "P1"));
            room.join(new Player("id_p2", "P2"));
            room.join(new Player("id_p3", "P3"));
            room.join(new Player("id_p4", "P4"));

            expect(() => {
                room.join(new Player("id_p5", "P5"));
            }).toThrow(RoomFullError);
            
            expect(room.getPlayerCount()).toBe(4);
        });

        test("1.8 ผู้ที่ไม่ใช่ Host ไม่สามารถสั่งเริ่มเกมได้", () => {
            const room = new Room("room_not_host");
            room.join(new Player("id_host", "Host"));
            room.join(new Player("id_player", "Player"));

            expect(() => {
                room.startGame("id_player");
            }).toThrow(NotHostError);
            
            expect(room.phase).toBe("LOBBY");
        });

        test("1.9 Host ไม่สามารถเริ่มเกมได้หากมีผู้เล่นไม่ถึง 2 คน", () => {
            const room = new Room("room_alone");
            room.join(new Player("id_host", "Host"));

            expect(() => {
                room.startGame("id_host");
            }).toThrow(GameError);
            
            expect(room.phase).toBe("LOBBY");
        });

        test("1.10 การ Reconnect ด้วย Token ที่ไม่ถูกต้องต้องถูกปฏิเสธ", () => {
            const room = new Room("room_token");
            const player = new Player("id_target", "Target");
            room.join(player);
            player.status = 'DISCONNECTED';

            expect(() => {
                room.reconnect("id_target", "wrong_token");
            }).toThrow(InvalidTokenError);
            
            expect(player.status).toBe('DISCONNECTED');
        });
    });
});
