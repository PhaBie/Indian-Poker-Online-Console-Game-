import { expect, test, describe } from "bun:test";
import { Room } from "../../src/server/domain/models/Room";
import { Player } from "../../src/server/domain/models/Player";

describe("1. ระบบการจัดการห้องเล่น (Room Management)", () => {
    test("1.1 ผู้สร้างห้องคนแรกจะต้องถูกกำหนดให้เป็น Host อัตโนมัติ", () => {
        const room = new Room("room_001");
        const hostPlayer = new Player("id_thanathon", "Thanathon");

        room.join(hostPlayer);

        expect(room.getPlayerCount()).toBe(1);
        expect(room.hostId).toBe("id_thanathon");
    });

    test("1.2 ผู้เล่นคนอื่นสามารถเข้าร่วมห้องได้ และสถานะห้องยังคงเป็น LOBBY", () => {
        const room = new Room("room_002");
        const hostPlayer = new Player("id_thanathon", "Thanathon");
        const secondPlayer = new Player("id_phupa", "Phupa");
        const thirdPlayer = new Player("id_pun", "Pun");

        room.join(hostPlayer);
        room.join(secondPlayer);
        room.join(thirdPlayer);

        expect(room.getPlayerCount()).toBe(3);
        expect(room.hostId).toBe("id_thanathon");
        expect(room.phase).toBe("LOBBY");
    });

    test("1.3 Host สามารถเริ่มเกมได้เมื่อมีผู้เล่นอย่างน้อย 2 คนขึ้นไป", () => {
        const room = new Room("room_003");
        const hostPlayer = new Player("id_thanathon", "Thanathon");
        const secondPlayer = new Player("id_phupa", "Phupa");

        room.join(hostPlayer);
        room.join(secondPlayer);

        room.startGame("id_thanathon");

        expect(room.phase).toBe("PLAYING");
    });

    test("1.4 เมื่อผู้เล่นออกจากห้อง จำนวนผู้เล่นต้องลดลง", () => {
        const room = new Room("room_004");
        const hostPlayer = new Player("id_thanathon", "Thanathon");
        const secondPlayer = new Player("id_phupa", "Phupa");

        room.join(hostPlayer);
        room.join(secondPlayer);
        room.leave("id_phupa");

        expect(room.getPlayerCount()).toBe(1);
    });

    test("1.5 หาก Host ออกจากห้อง ระบบต้องตั้งผู้เล่นคนถัดไปเป็น Host แทน", () => {
        const room = new Room("room_005");
        const hostPlayer = new Player("id_thanathon", "Thanathon");
        const secondPlayer = new Player("id_phupa", "Phupa");

        room.join(hostPlayer);
        room.join(secondPlayer);
        room.leave("id_thanathon");

        expect(room.hostId).toBe("id_phupa");
    });

    test("1.6 ดึงข้อมูลผู้เล่นรายบุคคลได้ถูกต้อง (Player Retrieval)", () => {
        const room = new Room("room_006");
        const hostPlayer = new Player("id_thanathon", "Thanathon");
        room.join(hostPlayer);

        const foundPlayer = room.getPlayer("id_thanathon");

        expect(foundPlayer).toBeDefined();
        expect(foundPlayer?.name).toBe("Thanathon");
    });

    test("1.7 ฟังก์ชัน getPublicState ต้องดึงข้อมูลโดยไม่มีฟิลด์ privateCards ติดมาด้วยเด็ดขาด (ความปลอดภัย)", () => {
        const room = new Room("room_007");
        const hostPlayer = new Player("id_thanathon", "Thanathon");
        hostPlayer.privateCards = [{ suit: 'SPADES', rank: 14 }];
        room.join(hostPlayer);

        const publicState = room.getPublicState();

        expect(publicState).toBeInstanceOf(Array);
        expect(publicState.length).toBe(1);
        expect(publicState[0].name).toBe("Thanathon");
        expect(publicState[0]).not.toHaveProperty("privateCards");
    });

    test("1.8 วัฏจักรของห้องสามารถหมุนเวียนได้: LOBBY -> PLAYING -> ENDED -> LOBBY", () => {
        const room = new Room("room_008");
        const hostPlayer = new Player("id_thanathon", "Thanathon");
        const secondPlayer = new Player("id_phupa", "Phupa");

        room.join(hostPlayer);
        room.join(secondPlayer);

        room.startGame("id_thanathon");
        expect(room.phase).toBe("PLAYING");

        room.endGame();
        expect(room.phase).toBe("ENDED");

        room.resetToLobby();
        expect(room.phase).toBe("LOBBY");
        expect(room.getPlayerCount()).toBe(2);
    });

    test("1.9 ห้องสามารถแปลงข้อมูลเป็น JSON ได้ (เพื่อระบบ Save/Load)", () => {
        const room = new Room("room_009");
        const hostPlayer = new Player("id_thanathon", "Thanathon");
        room.join(hostPlayer);

        const json: any = room.toJSON();
        
        expect(json).toHaveProperty("roomId", "room_009");
    });

    test("1.10 ห้องสามารถกู้คืนข้อมูลจาก JSON กลับมาเป็น Object สมบูรณ์ได้ (fromJSON)", () => {
        const json = {
            roomId: "room_010",
            phase: "LOBBY",
            hostId: "id_phupa",
            players: [
                { id: "id_phupa", name: "Phupa", chips: 5000, bet: 0, status: "WAITING", privateCards: [] }
            ]
        };
        const room = Room.fromJSON(json);
        
        expect(room.roomId).toBe("room_010");
        expect(room.hostId).toBe("id_phupa");
        expect(room.getPlayerCount()).toBe(1);
    });

    test("1.11 ผู้เล่นเก่าที่หลุดไป สามารถ Reconnect เข้าห้องเดิมด้วย ID เดิมได้โดยไม่ถูกเตะ", () => {
        const room = new Room("room_011");
        const player1 = new Player("id_thanathon", "Thanathon");
        room.join(player1);
        
        player1.status = 'DISCONNECTED' as any;
        
        const reconnectPlayer = new Player("id_thanathon", "Thanathon");
        room.join(reconnectPlayer);
        
        expect(room.getPlayerCount()).toBe(1);
        const activePlayer = room.getPlayer("id_thanathon");
        expect(activePlayer?.status as string).not.toBe('DISCONNECTED');
    });

    test("1.12 ผู้เล่นสามารถเข้าร่วมห้องขณะที่เกมอยู่ในสถานะ PLAYING ได้ (เข้ามารอในสถานะ WAITING / Spectator)", () => {
        const room = new Room("room_012");
        const hostPlayer = new Player("id_thanathon", "Thanathon");
        const secondPlayer = new Player("id_phupa", "Phupa");
        
        room.join(hostPlayer);
        room.join(secondPlayer);
        room.startGame("id_thanathon");
        
        expect(room.phase).toBe("PLAYING");
        
        const latePlayer = new Player("id_pun", "Pun");
        room.join(latePlayer);
        
        expect(room.getPlayerCount()).toBe(3);
        const addedPlayer = room.getPlayer("id_pun");
        expect(addedPlayer?.status).toBe("WAITING");
    });
});
