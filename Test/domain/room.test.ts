import { expect, test, describe } from "bun:test";
import { Room } from "../../src/server/domain/models/Room";
import { Player } from "../../src/server/domain/models/Player";
import { GameState } from "../../src/server/domain/models/GameState";
import { RoomFullError, NotHostError, GameError } from "../../src/server/domain/errors/GameError";

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
            const firstPlayer = new Player("id_first", "First");
            const secondPlayer = new Player("id_second", "Second");
            const thirdPlayer = new Player("id_third", "Third");
            const fourthPlayer = new Player("id_fourth", "Fourth");

            room.join(firstPlayer);
            room.join(secondPlayer);
            room.join(thirdPlayer);
            room.join(fourthPlayer);

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
            
            room.reconnect("id_thanathon");
            
            const activePlayer = room.getPlayer("id_thanathon");
            expect(activePlayer?.status).toBe('WAITING');
            expect(activePlayer?.chips).toBe(800);
            expect(activePlayer?.bet).toBe(200);
            expect(activePlayer?.privateCards.length).toBe(1);
        });

        test("1.5 ผู้เล่นสามารถเข้าร่วมห้องขณะที่เกม PLAYING ได้ โดยจะอยู่ในสถานะ WAITING รอรอบถัดไป", () => {
            const room = new Room("room_005");
            const firstPlayer = new Player("id_first", "First Player");
            const secondPlayer = new Player("id_second", "Second Player");
            room.join(firstPlayer);
            room.join(secondPlayer);
            room.startGame("id_first");
            
            const latePlayer = new Player("id_late", "Late Player");
            room.join(latePlayer);
            
            const addedPlayer = room.getPlayer("id_late");
            expect(addedPlayer?.status).toBe("WAITING");
            expect(room.phase).toBe("PLAYING");
        });
        
        test("1.6 ดึง Public State ต้องไม่มีข้อมูล privateCards หลุดออกไปเด็ดขาด", () => {
            const room = new Room("room_006");
            const player = new Player("id_thanathon", "Thanathon");
            player.privateCards = [{ suit: 'SPADES', rank: 14 }];
            room.join(player);

            const publicState = room.getPublicState();
            expect(publicState).toHaveLength(1);
            expect(publicState[0]).not.toHaveProperty("privateCards");
        });

        test("1.7 ค่า Boot ของห้อง ต้องถูกส่งต่อไปใช้หักเงินตอนเริ่ม GameState (Boot 100)", () => {
            const room = new Room("room_boot_100", 100);
            const host = new Player("id_host", "Host");
            const secondPlayer = new Player("id_p2", "Player2");
            host.chips = 1000;
            secondPlayer.chips = 1000;
            
            room.join(host);
            room.join(secondPlayer);
            room.startGame("id_host");
            
            expect(room.gameState).toBeDefined();
            expect(room.gameState?.pot).toBe(200);
            expect(host.chips).toBe(900);
            expect(secondPlayer.chips).toBe(900);
        });

        test("1.8 ฟังก์ชัน leave() ต้องให้โฮสต์ตกไปเป็นคนถัดไปเมื่อโฮสต์ปัจจุบันออก", () => {
            const room = new Room("room_leave");
            const host = new Player("id_host", "Host");
            const secondPlayer = new Player("id_p2", "Player2");
            room.join(host);
            room.join(secondPlayer);
            
            room.leave("id_host");
            
            expect(room.getPlayerCount()).toBe(1);
            expect(room.hostId).toBe("id_p2");
        });

        test("1.9 ฟังก์ชัน resetToLobby() ต้องล้างสถานะเกมแต่รักษาผู้เล่นและชิปไว้", () => {
            const room = new Room("room_reset");
            const host = new Player("id_host", "Host");
            const secondPlayer = new Player("id_p2", "Player2");
            
            host.chips = 1500;
            secondPlayer.chips = 500;
            
            room.join(host);
            room.join(secondPlayer);
            
            room.phase = "ENDED";
            room.gameState = new GameState([host, secondPlayer]);
            
            room.resetToLobby();
            
            expect(room.phase as string).toBe("LOBBY");
            expect(room.gameState).toBeNull();
            expect(room.getPlayerCount()).toBe(2);
            expect(room.getPlayer("id_host")?.chips).toBe(1500);
            expect(room.getPlayer("id_p2")?.chips).toBe(500);
        });
    });

    describe("Unhappy Paths", () => {
        test("1.11 ไม่สามารถเข้าร่วมห้องที่เต็มแล้ว (4 คน) ได้", () => {
            const room = new Room("room_full");
            room.join(new Player("id_first", "First"));
            room.join(new Player("id_second", "Second"));
            room.join(new Player("id_third", "Third"));
            room.join(new Player("id_fourth", "Fourth"));

            expect(() => {
                room.join(new Player("id_fifth", "Fifth"));
            }).toThrow(RoomFullError);
            
            expect(room.getPlayerCount()).toBe(4);
        });

        test("1.12 ผู้ที่ไม่ใช่ Host ไม่สามารถสั่งเริ่มเกมได้", () => {
            const room = new Room("room_not_host");
            room.join(new Player("id_host", "Host"));
            room.join(new Player("id_player", "Player"));

            expect(() => {
                room.startGame("id_player");
            }).toThrow(NotHostError);
            
            expect(room.phase).toBe("LOBBY");
        });

        test("1.13 Host ไม่สามารถเริ่มเกมได้หากมีผู้เล่นไม่ถึง 2 คน", () => {
            const room = new Room("room_alone");
            room.join(new Player("id_host", "Host"));

            expect(() => {
                room.startGame("id_host");
            }).toThrow(GameError);
            
            expect(room.phase).toBe("LOBBY");
        });
    });
});
