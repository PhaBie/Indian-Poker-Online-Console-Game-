import { expect, test, describe } from "bun:test";
import { Player } from "../../src/server/domain/models/Player";
import { InsufficientChipsError, PlayerStateError } from "../../src/server/domain/errors/GameError";

describe("3. ระบบการกระทำของผู้เล่น (Player Actions)", () => {
    describe("Happy Paths", () => {
        test("3.1 ผู้เล่นสามารถรับไพ่ได้ถูกต้อง", () => {
            const player = new Player("id_thanathon", "Thanathon");
            player.receiveCards([{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }]);
            
            expect(player.privateCards.length).toBe(3);
            expect(player.privateCards[0].rank).toBe(14);
        });

        test("3.2 ผู้เล่นสามารถจ่ายเงินเดิมพัน (payBet) และชิปลดลงตามจำนวนที่ระบุ", () => {
            const player = new Player("id_thanathon", "Thanathon");
            player.chips = 1000;
            player.status = 'ACTIVE';
            player.payBet(100);
            
            expect(player.chips).toBe(900);
            expect(player.bet).toBe(100);
        });

        test("3.3 ผู้เล่นสามารถหมอบและสถานะจะเปลี่ยนเป็น FOLDED", () => {
            const player = new Player("id_thanathon", "Thanathon");
            player.status = 'ACTIVE';
            player.fold();
            
            expect(player.status as string).toBe('FOLDED');
        });

        test("3.4 ผู้เล่นสามารถแปลงข้อมูลเป็น JSON โดยไม่มีข้อมูลไพ่ส่วนตัวหลุดออกไป", () => {
            const player = new Player("id_thanathon", "Thanathon");
            player.receiveCards([{ suit: 'SPADES', rank: 14 }]);
            const json: Record<string, unknown> = player.toJSON() as Record<string, unknown>;
            
            expect(json.id).toBe("id_thanathon");
            expect(json.chips).toBe(1000);
            expect(json.privateCards).toBeUndefined();
        });

        test("3.5 ผู้เล่นสามารถโหลดข้อมูลจาก JSON กลับมาเป็น Object ได้ครบถ้วน", () => {
            const json = {
                id: "id_phupa",
                name: "Phupa",
                chips: 5000,
                bet: 0,
                status: "WAITING",
                privateCards: [],
                isBlind: false
            };
            const player = Player.fromJSON(json);
            
            expect(player.id).toBe("id_phupa");
            expect(player.chips).toBe(5000);
            expect(player.isBlind).toBe(false);
        });

        test("3.6 ผู้เล่นเคลียร์ข้อมูลสำหรับการเริ่มรอบใหม่ ชิปคงเหลือเท่าเดิมแต่สถานะและไพ่ถูกล้าง", () => {
            const player = new Player("id_pun", "Pun");
            player.chips = 800;
            player.receiveCards([{ suit: 'SPADES', rank: 14 }]);
            player.bet = 100;
            player.status = 'FOLDED';
            player.isBlind = false;
            
            player.resetForNewRound();
            
            expect(player.chips).toBe(800);
            expect(player.privateCards.length).toBe(0);
            expect(player.bet).toBe(0);
            expect(player.status as string).toBe('WAITING');
            expect(player.isBlind).toBe(true);
        });

        test("3.7 ผู้เล่นสามารถจ่ายเงินเพิ่มหลายครั้ง และหักชิปลดลงตามจำนวนที่ระบุเต็มๆ พร้อมบวกยอดสะสม", () => {
            const player = new Player("id_beam", "Beam");
            player.chips = 1000;
            player.status = 'ACTIVE';
            player.payBet(50); 
            
            expect(player.chips).toBe(950);
            expect(player.bet).toBe(50);
            
            player.payBet(50);
            
            expect(player.chips).toBe(900);
            expect(player.bet).toBe(100);
        });

        test("3.8 ผู้เล่นสามารถจ่ายเงินก้อนใหญ่ (payBet) และหักชิปถูกต้อง", () => {
            const player = new Player("id_extra", "Extra");
            player.chips = 1000;
            player.status = 'ACTIVE';
            player.payBet(50);
            player.payBet(150);
            
            expect(player.chips).toBe(800);
            expect(player.bet).toBe(200);
        });

        test("3.9 ผู้เล่นได้รับชิปเพิ่มเมื่อชนะและรับเงินจากกองกลาง", () => {
            const player = new Player("id_thanathon", "Thanathon");
            player.chips = 1000;
            player.addChips(500);
            
            expect(player.chips).toBe(1500);
        });
    });

    describe("Unhappy Paths", () => {
        test("3.10 ผู้เล่นไม่สามารถเดิมพันเกินกว่าชิปที่มีอยู่ได้ ระบบปฏิเสธโดยสถานะไม่เปลี่ยนแปลง", () => {
            const player = new Player("id_poor", "Poor");
            player.status = 'ACTIVE';
            player.chips = 100;
            player.bet = 50;

            expect(() => {
                player.payBet(200);
            }).toThrow(InsufficientChipsError);

            expect(player.chips).toBe(100);
            expect(player.bet).toBe(50);
        });

        test("3.11 ผู้เล่นไม่สามารถจ่ายเงิน (payBet) เกินชิปที่มีอยู่ได้แม้จะมียอดเดิม", () => {
            const player = new Player("id_poor", "Poor");
            player.status = 'ACTIVE';
            player.chips = 200;
            player.payBet(100);

            expect(() => {
                player.payBet(500);
            }).toThrow(InsufficientChipsError);

            expect(player.chips).toBe(100);
            expect(player.bet).toBe(100);
        });

        test("3.12 ผู้เล่นไม่สามารถจ่ายเงิน (payBet) เมื่อไม่ได้มีสถานะ ACTIVE", () => {
            const player = new Player("id_folded", "Folded");
            player.chips = 1000;
            player.status = 'FOLDED';

            expect(() => {
                player.payBet(100);
            }).toThrow(PlayerStateError);
            
            expect(player.chips).toBe(1000);
        });
    });
});
