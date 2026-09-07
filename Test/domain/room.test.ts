import { expect, test, describe } from "bun:test";
import { Room } from "../../src/server/domain/models/Room";
import { Player } from "../../src/server/domain/models/Player";
import { GameState } from "../../src/server/domain/models/GameState";
import { RoomFullError, NotHostError, GameError } from "../../src/server/domain/errors/GameError";

describe("1. ระบบการจัดการห้องเล่น (Room Management)", () => {
    describe("Happy Paths", () => {
        test("[Room.join] 1.1 ผู้เล่นคนแรกเข้าห้อง → hostId เป็น ID ของผู้เล่นคนนั้น", () => {
            const room = new Room("room_001");
            const hostPlayer = new Player("id_thanathon", "Thanathon");

            room.join(hostPlayer);

            expect(room.getPlayerCount()).toBe(1);
            expect(room.hostId).toBe("id_thanathon");
        });

        test("[Room.join] 1.2 ผู้เล่นเข้าร่วม 4 คน → จำนวนผู้เล่นเป็น 4 และ phase เป็น LOBBY", () => {
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

        test("[Room.startGame] 1.3 Host เริ่มเกมเมื่อมีผู้เล่น 2 คน → phase เปลี่ยนเป็น PLAYING", () => {
            const room = new Room("room_003");
            room.join(new Player("id_thanathon", "Thanathon"));
            room.join(new Player("id_phupa", "Phupa"));

            room.startGame("id_thanathon");

            expect(room.phase).toBe("PLAYING");
        });

        test("[Room.reconnect] 1.4 ผู้เล่น DISCONNECTED ทำการ Reconnect → สถานะเปลี่ยนเป็น WAITING พร้อมข้อมูลชิป เดิมพัน และจำนวนไพ่ 1 ใบ", () => {
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

        test("[Room.join] 1.5 ผู้เล่นใหม่เข้าห้องขณะเกม PLAYING → สถานะผู้เล่นเป็น WAITING และห้องยังคง PLAYING", () => {
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
        
        test("[Room.getPublicState] 1.6 ดึง Public State → คืนค่าข้อมูลที่ไม่มี property privateCards", () => {
            const room = new Room("room_006");
            const player = new Player("id_thanathon", "Thanathon");
            player.privateCards = [{ suit: 'SPADES', rank: 14 }];
            room.join(player);

            const publicState = room.getPublicState();
            expect(publicState).toHaveLength(1);
            expect(publicState[0]).not.toHaveProperty("privateCards");
        });

        test("[Room.startGame] 1.7 เริ่มเกมด้วย Boot 100 และผู้เล่น 2 คน → หักชิปคนละ 100 และ Pot เป็น 200", () => {
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

        test("[Room.leave] 1.8 โฮสต์ปัจจุบันออกจากการเล่น → โฮสต์ตกไปเป็นคนถัดไปและผู้เล่นเหลือ 1 คน", () => {
            const room = new Room("room_leave");
            const host = new Player("id_host", "Host");
            const secondPlayer = new Player("id_p2", "Player2");
            room.join(host);
            room.join(secondPlayer);
            
            room.leave("id_host");
            
            expect(room.getPlayerCount()).toBe(1);
            expect(room.hostId).toBe("id_p2");
        });

        test("[Room.resetToLobby] 1.9 รีเซ็ตห้องที่จบรอบ → phase เป็น LOBBY, gameState เป็น null และรักษาผู้เล่นกับชิป", () => {
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
        test("[Room.join] 1.11 เข้าห้องที่ผู้เล่นเต็ม 4 คนแล้ว → โยน RoomFullError", () => {
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

        test("[Room.startGame] 1.12 ผู้เล่นที่ไม่ใช่โฮสต์สั่งเริ่มเกม → โยน NotHostError และห้องยังคงเป็น LOBBY", () => {
            const room = new Room("room_not_host");
            room.join(new Player("id_host", "Host"));
            room.join(new Player("id_player", "Player"));

            expect(() => {
                room.startGame("id_player");
            }).toThrow(NotHostError);
            
            expect(room.phase).toBe("LOBBY");
        });

        test("[Room.startGame] 1.13 โฮสต์เริ่มเกมด้วยผู้เล่นคนเดียว → โยน GameError และห้องยังคงเป็น LOBBY", () => {
            const room = new Room("room_alone");
            room.join(new Player("id_host", "Host"));

            expect(() => {
                room.startGame("id_host");
            }).toThrow(GameError);
            
            expect(room.phase).toBe("LOBBY");
        });
    });
});


