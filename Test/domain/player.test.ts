import { expect, test, describe } from "bun:test";
import { Player } from "../../src/server/domain/models/Player";
import { InsufficientChipsError, PlayerStateError } from "../../src/server/domain/errors/GameError";

describe("3. ระบบการกระทำของผู้เล่น (Player Actions)", () => {
    describe("Happy Paths", () => {
        test("[Player.receiveCards] 3.1 รับไพ่ 3 ใบ → อัปเดต privateCards มี 3 ใบและใบแรกแต้ม 14", () => {
            const player = new Player("id_thanathon", "Thanathon");
            player.receiveCards([{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }]);
            
            expect(player.privateCards.length).toBe(3);
            expect(player.privateCards[0].rank).toBe(14);
        });

        test("[Player.payBet] 3.2 จ่ายเดิมพัน 100 → ชิปลดลง 100 และ bet สะสมเป็น 100", () => {
            const player = new Player("id_thanathon", "Thanathon");
            player.chips = 1000;
            player.status = 'ACTIVE';
            player.payBet(100);
            
            expect(player.chips).toBe(900);
            expect(player.bet).toBe(100);
        });

        test("[Player.fold] 3.3 สั่งหมอบ → สถานะผู้เล่นเปลี่ยนเป็น FOLDED", () => {
            const player = new Player("id_thanathon", "Thanathon");
            player.status = 'ACTIVE';
            player.fold();
            
            expect(player.status as string).toBe('FOLDED');
        });

        test("[Player.toJSON] 3.4 แปลงข้อมูลเป็น JSON → ออบเจกต์ที่ได้ไม่มีข้อมูล privateCards", () => {
            const player = new Player("id_thanathon", "Thanathon");
            player.receiveCards([{ suit: 'SPADES', rank: 14 }]);
            const json: Record<string, unknown> = player.toJSON() as Record<string, unknown>;
            
            expect(json.id).toBe("id_thanathon");
            expect(json.chips).toBe(1000);
            expect(json.privateCards).toBeUndefined();
        });

        test("[Player.fromJSON] 3.5 โหลดข้อมูลจาก JSON → คืนค่าออบเจกต์ Player ที่มี id, chips, isBlind ตรงตาม JSON", () => {
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

        test("[Player.resetForNewRound] 3.6 เคลียร์ข้อมูลรอบใหม่ → สถานะเป็น WAITING, ล้าง privateCards และคงชิปเดิมไว้", () => {
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

        test("[Player.payBet] 3.7 จ่าย 50 สองครั้ง → ชิปลดรวม 100 และ bet สะสมเป็น 100", () => {
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

        test("[Player.payBet] 3.8 จ่าย 50 แล้วจ่าย 150 → ชิปลดลงรวม 200 และ bet สะสมเป็น 200", () => {
            const player = new Player("id_extra", "Extra");
            player.chips = 1000;
            player.status = 'ACTIVE';
            player.payBet(50);
            player.payBet(150);
            
            expect(player.chips).toBe(800);
            expect(player.bet).toBe(200);
        });

        test("[Player.addChips] 3.9 ได้รับชิปเพิ่ม 500 → ชิปเพิ่มขึ้น 500", () => {
            const player = new Player("id_thanathon", "Thanathon");
            player.chips = 1000;
            player.addChips(500);
            
            expect(player.chips).toBe(1500);
        });
    });

    describe("Unhappy Paths", () => {
        test("[Player.payBet] 3.10 จ่ายเดิมพันเกินชิปที่มี → โยน InsufficientChipsError และ chips กับ bet ไม่เปลี่ยน", () => {
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

        test("[Player.payBet] 3.11 จ่ายเดิมพันทบยอดจนเกินชิปที่มี → โยน InsufficientChipsError", () => {
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

        test("[Player.payBet] 3.12 จ่ายเดิมพันขณะสถานะเป็น FOLDED → โยน PlayerStateError", () => {
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


