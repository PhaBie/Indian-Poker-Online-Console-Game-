import { expect, test, describe } from "bun:test";
import { Player } from "../../src/server/domain/models/Player";

describe("3. ระบบการกระทำของผู้เล่น (Player Actions) - Happy Path", () => {
    test("3.1 ผู้เล่นสามารถรับไพ่ได้ถูกต้อง", () => {
        const player = new Player("id_thanathon", "Thanathon");
        player.receiveCards([{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }]);
        
        expect(player.privateCards.length).toBe(3);
        expect(player.privateCards[0].rank).toBe(14);
    });

    test("3.2 ผู้เล่นสามารถวางเดิมพัน (Bet) และชิปต้องลดลงตามจำนวน", () => {
        const player = new Player("id_thanathon", "Thanathon");
        player.chips = 1000;
        player.placeBet(100);
        
        expect(player.chips).toBe(900);
        expect(player.bet).toBe(100);
    });

    test("3.3 ผู้เล่นสามารถหมอบ (Fold) และสถานะต้องเปลี่ยนเป็น FOLDED", () => {
        const player = new Player("id_thanathon", "Thanathon");
        player.status = 'ACTIVE';
        player.fold();
        
        expect(player.status as string).toBe('FOLDED');
    });

    test("3.4 ผู้เล่นสามารถแปลงข้อมูลเป็น JSON ได้ (เพื่อระบบ Save/Load)", () => {
        const player = new Player("id_thanathon", "Thanathon");
        const json = player.toJSON();
        
        expect(json).toHaveProperty("id", "id_thanathon");
        expect(json).toHaveProperty("chips", 1000);
    });

    test("3.5 ผู้เล่นสามารถโหลดข้อมูลจาก JSON กลับมาเป็น Object ได้ (fromJSON)", () => {
        const json = {
            id: "id_phupa",
            name: "Phupa",
            chips: 5000,
            bet: 0,
            status: "WAITING",
            privateCards: []
        };
        const player = Player.fromJSON(json);
        
        expect(player.id).toBe("id_phupa");
        expect(player.chips).toBe(5000);
    });

    test("3.6 ผู้เล่นสามารถเคลียร์ไพ่และเดิมพันเพื่อเริ่มรอบใหม่ได้", () => {
        const player = new Player("id_pun", "Pun");
        player.receiveCards([{ suit: 'SPADES', rank: 14 }]);
        player.placeBet(100);
        
        player.resetForNewRound();
        
        expect(player.privateCards.length).toBe(0);
        expect(player.bet).toBe(0);
    });

    test("3.7 ผู้เล่นสามารถ Call ตามน้ำ และหักชิปเฉพาะส่วนต่างได้ถูกต้อง", () => {
        const player = new Player("id_beam", "Beam");
        player.placeBet(50); 
        player.call(100); 
        
        expect(player.chips).toBe(900);
        expect(player.bet).toBe(100);
    });

    test("3.8 ผู้เล่นสามารถ Raise เกทับ และหักชิปเพิ่มได้ถูกต้อง", () => {
        const player = new Player("id_extra", "Extra");
        player.placeBet(50);
        player.raise(150);
        
        expect(player.chips).toBe(800);
        expect(player.bet).toBe(200);
    });

    test("3.9 ผู้เล่นได้รับชิปเพิ่มเมื่อชนะและรับเงินกองกลาง", () => {
        const player = new Player("id_thanathon", "Thanathon");
        player.chips = 1000;
        player.addChips(500);
        
        expect(player.chips).toBe(1500);
    });
});
