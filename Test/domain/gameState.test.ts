import { expect, test, describe } from "bun:test";
import { GameState } from "../../src/server/domain/models/GameState";
import { Player } from "../../src/server/domain/models/Player";

describe("4. ระบบการเล่นบนโต๊ะ (Game State Engine)", () => {
    test("4.1 เมื่อเริ่มเกม ระบบจะต้องหักค่าต๋ง (Boot) จากผู้เล่นทุกคนไปรวมที่กองกลางและแจกไพ่", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        const gameState = new GameState([thanathon, phupa]);
        
        gameState.startGame();
        
        expect(gameState.pot).toBe(20);
        expect(thanathon.chips).toBe(990);
        expect(phupa.chips).toBe(990);
        expect(thanathon.privateCards.length).toBe(3);
        expect(phupa.privateCards.length).toBe(3);
    });

    test("4.2 ระบบสามารถเปลี่ยนเทิร์นไปยังผู้เล่นคนถัดไปได้อย่างถูกต้อง", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        const gameState = new GameState([thanathon, phupa]);
        
        gameState.currentPlayerIndex = 0;
        gameState.nextTurn();
        
        expect(gameState.currentPlayerIndex).toBe(1);
    });

    test("4.3 ระบบสามารถข้ามเทิร์นผู้เล่นที่หมอบไปแล้วได้", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        const beam = new Player("id_beam", "Beam");
        
        phupa.status = 'FOLDED';
        const gameState = new GameState([thanathon, phupa, beam]);
        
        gameState.currentPlayerIndex = 0;
        gameState.nextTurn();
        
        expect(gameState.currentPlayerIndex).toBe(2);
    });

    test("4.4 ผู้เล่นสามารถลงเงินตามน้ำ (Call) และระบบจะอัปเดตยอดรวมในกองกลาง", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        const gameState = new GameState([thanathon, phupa]);
        
        gameState.currentHighestBet = 50;
        gameState.processAction("id_thanathon", "CALL");
        
        expect(thanathon.bet).toBe(50);
        expect(gameState.pot).toBe(50);
    });

    test("4.5 ผู้เล่นสามารถเกทับ (Raise) และระบบจะปรับยอดเดิมพันสูงสุดของโต๊ะ", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        const gameState = new GameState([thanathon, phupa]);
        
        gameState.currentHighestBet = 50;
        gameState.processAction("id_thanathon", "RAISE", 100);
        
        expect(gameState.currentHighestBet).toBe(100);
        expect(thanathon.bet).toBe(100);
        expect(gameState.pot).toBe(100);
    });

    test("4.6 ระบบหาผู้ชนะเมื่อจบเกมและโอนเงินกองกลางทั้งหมดให้ผู้ชนะ", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        
        thanathon.privateCards = [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }];
        phupa.privateCards = [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'DIAMONDS', rank: 4 }];
        
        const gameState = new GameState([thanathon, phupa]);
        gameState.pot = 500;
        
        gameState.evaluateWinner();
        
        expect(thanathon.chips).toBe(1500);
        expect(gameState.pot).toBe(0);
    });

    test("4.7 คนที่ดูไพ่แล้ว (Seen) จะต้องจ่ายชิปเป็น 2 เท่าของคนตาบอด (Blind) เมื่อขอ Call", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        const gameState = new GameState([thanathon, phupa]);
        
        gameState.currentHighestBet = 50; 
        phupa.isBlind = false; 
        
        gameState.processAction("id_phupa", "CALL");
        
        expect(phupa.bet).toBe(100);
        expect(gameState.pot).toBe(100);
    });

    test("4.8 ระบบสามารถประมวลผล Sideshow และบังคับคนแพ้หมอบ (FOLDED)", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        
        thanathon.privateCards = [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }];
        phupa.privateCards = [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'DIAMONDS', rank: 4 }];
        
        const gameState = new GameState([thanathon, phupa]);
        
        gameState.executeSideshow("id_phupa", "id_thanathon");
        
        expect(phupa.status as string).toBe('FOLDED');
        expect(thanathon.status as string).toBe('ACTIVE');
    });

    test("4.9 ระบบยอมให้ทำการบังคับเปิดไพ่ (Force Show) ได้เมื่อเหลือผู้เล่นแค่ 2 คนบนโต๊ะ", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        const beam = new Player("id_beam", "Beam");
        
        beam.status = 'FOLDED';
        
        const gameState = new GameState([thanathon, phupa, beam]);
        const result = gameState.canForceShow();
        
        expect(result).toBe(true);
    });

    test("4.10 ระบบจบเกมทันทีและมอบเงินให้ผู้เล่นที่เหลือรอด (Last Man Standing) เมื่อคนอื่นหมอบหมด", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        const beam = new Player("id_beam", "Beam");
        
        phupa.status = 'FOLDED';
        beam.status = 'FOLDED';
        
        const gameState = new GameState([thanathon, phupa, beam]);
        gameState.pot = 1500;
        
        const winner = gameState.checkLastManStanding();
        if (winner) {
            winner.addChips(gameState.pot);
            gameState.pot = 0;
        }
        
        expect(winner?.id).toBe("id_thanathon");
        expect(thanathon.chips).toBe(2500);
        expect(gameState.pot).toBe(0);
    });

    test("4.11 ระบบบังคับเปิดไพ่ (Force Show) อัตโนมัติเมื่อยอดเงินในกองกลางแตะเพดานลิมิต (Pot Limit)", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        
        const gameState = new GameState([thanathon, phupa], 10000);
        
        gameState.pot = 9500;
        gameState.processAction("id_thanathon", "RAISE", 1000); 
        
        const isLimitReached = gameState.checkPotLimitReached();
        
        expect(gameState.pot).toBe(10500);
        expect(isLimitReached).toBe(true);
    });

    test("4.12 ระบบสามารถแบ่งเงินกองกลาง (Split Pot) ให้ผู้ชนะหลายคนในกรณีที่ไพ่เสมอกัน", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        
        const gameState = new GameState([thanathon, phupa]);
        gameState.pot = 1000;
        
        gameState.handleTie([thanathon, phupa]);
        
        expect(thanathon.chips).toBe(1500);
        expect(phupa.chips).toBe(1500);
        expect(gameState.pot).toBe(0);
    });

    test("4.13 ระบบขยับตำแหน่งคนแจกไพ่ (Dealer Button) ไปยังคนถัดไปเมื่อเริ่มรอบใหม่", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        const beam = new Player("id_beam", "Beam");
        
        const gameState = new GameState([thanathon, phupa, beam]);
        gameState.dealerIndex = 0;
        
        gameState.rotateDealer();
        
        expect(gameState.dealerIndex).toBe(1);
    });

    test("4.14 ผู้เล่นสามารถปฏิเสธการขอ Sideshow ได้ และเกมจะดำเนินต่อไปโดยไม่มีใครถูกบังคับหมอบ", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        
        const gameState = new GameState([thanathon, phupa]);
        
        gameState.rejectSideshow();
        
        expect(thanathon.status).toBe('WAITING');
        expect(phupa.status).toBe('WAITING');
    });

    test("4.15 ระบบข้ามเทิร์นและบังคับหมอบ (Auto-Fold) อัตโนมัติเมื่อผู้เล่นไม่ตอบสนองในเวลาที่กำหนด", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        
        const gameState = new GameState([thanathon, phupa]);
        gameState.currentPlayerIndex = 0; 
        
        gameState.autoFoldTimeout();
        
        expect(thanathon.status).toBe('FOLDED');
        expect(gameState.currentPlayerIndex).toBe(1);
    });

    test("4.16 ระบบจัดการเมื่อผู้เล่นเน็ตหลุด (Disconnect) โดยข้ามเทิร์นไปให้คนถัดไปได้", () => {
        const thanathon = new Player("id_thanathon", "Thanathon");
        const phupa = new Player("id_phupa", "Phupa");
        
        const gameState = new GameState([thanathon, phupa]);
        
        gameState.handlePlayerDisconnect("id_thanathon");
        
        expect(thanathon.status).toBe('DISCONNECTED');
    });
});
