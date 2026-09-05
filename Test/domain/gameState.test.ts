import { expect, test, describe } from "bun:test";
import { GameState } from "../../src/server/domain/models/GameState";
import { Player } from "../../src/server/domain/models/Player";
import { WrongTurnError, PlayerStateError } from "../../src/server/domain/errors/GameError";

function createMockGameState(overrides?: Partial<GameState>, playersParams?: { id: string, name: string, status: any, chips: number, cards?: any[] }[]): GameState {
    const players = (playersParams || [
        { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000 },
        { id: "player2", name: "Player2", status: "ACTIVE", chips: 1000 }
    ]).map(playerParam => {
        const player = new Player(playerParam.id, playerParam.name);
        player.status = playerParam.status;
        player.chips = playerParam.chips;
        if (playerParam.cards) player.privateCards = playerParam.cards;
        return player;
    });

    const gameState = new GameState(players, 50, 10000);
    if (overrides) {
        Object.assign(gameState, overrides);
    }
    return gameState;
}

describe("4. ระบบการเล่นบนโต๊ะ (Game State Engine)", () => {
    describe("Happy Paths", () => {
        test("4.1 เมื่อเริ่มเกม ระบบจะต้องหักเงิน Boot 50 จากผู้เล่นทุกคนไปรวมที่กองกลางและแจกไพ่ 3 ใบให้ทุกคน", () => {
            const gameState = createMockGameState({}, [
                { id: "player1", name: "Player1", status: "WAITING", chips: 1000 },
                { id: "player2", name: "Player2", status: "WAITING", chips: 1000 }
            ]);
            
            gameState.startGame();
            
            expect(gameState.pot).toBe(100);
            expect(gameState.activePlayers[0].chips).toBe(950);
            expect(gameState.activePlayers[1].chips).toBe(950);
            expect(gameState.activePlayers[0].privateCards.length).toBe(3);
            expect(gameState.activePlayers[1].privateCards.length).toBe(3);
            expect(gameState.activePlayers[0].status).toBe("ACTIVE");
        });

        test("4.2 ระบบสามารถเปลี่ยนเทิร์นไปยังผู้เล่นคนถัดไปได้อย่างถูกต้อง", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0 });
            gameState.nextTurn();
            expect(gameState.currentPlayerIndex).toBe(1);
        });

        test("4.3 ระบบสามารถข้ามเทิร์นผู้เล่นที่หมอบ (FOLDED) หรือหลุด (DISCONNECTED) ไปยังคนถัดไปได้", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000 },
                { id: "player2", name: "Player2", status: "FOLDED", chips: 1000 },
                { id: "player3", name: "Player3", status: "DISCONNECTED", chips: 1000 },
                { id: "player4", name: "Player4", status: "ACTIVE", chips: 1000 }
            ]);
            gameState.nextTurn();
            expect(gameState.currentPlayerIndex).toBe(3);
        });

        test("4.4 ผู้เล่นสามารถ Call ตามน้ำ และระบบจะอัปเดตยอดรวมในกองกลาง", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0, currentHighestBet: 50, pot: 100 });
            gameState.processAction("player1", "CALL");
            
            expect(gameState.activePlayers[0].bet).toBe(50);
            expect(gameState.pot).toBe(150);
        });

        test("4.5 ผู้เล่นสามารถ Raise เกทับ ระบบจะปรับยอดเดิมพันสูงสุดของโต๊ะและอัปเดตกองกลาง", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0, currentHighestBet: 50, pot: 100 });
            gameState.processAction("player1", "RAISE", 150);
            
            expect(gameState.currentHighestBet).toBe(150);
            expect(gameState.activePlayers[0].bet).toBe(150);
            expect(gameState.pot).toBe(250);
        });

        test("4.6 คนที่ดูไพ่แล้ว (Seen) จะต้องจ่ายชิปเป็น 2 เท่าของคนตาบอด (Blind) เมื่อขอ Call", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0, currentHighestBet: 50, pot: 100 });
            gameState.activePlayers[0].isBlind = false; 
            
            gameState.processAction("player1", "CALL");
            
            expect(gameState.activePlayers[0].bet).toBe(100);
            expect(gameState.pot).toBe(200);
        });

        test("4.7 ระบบหาผู้ชนะเมื่อจบเกมและโอนเงินกองกลางทั้งหมดให้ผู้ชนะ", () => {
            const gameState = createMockGameState({ pot: 500 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }] },
                { id: "player2", name: "Player2", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'DIAMONDS', rank: 4 }] }
            ]);
            
            gameState.evaluateWinner();
            
            expect(gameState.activePlayers[0].chips).toBe(1500);
            expect(gameState.activePlayers[1].chips).toBe(1000);
            expect(gameState.pot).toBe(0);
        });

        test("4.8 ระบบสามารถประมวลผล Sideshow และบังคับคนแพ้หมอบ", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'DIAMONDS', rank: 4 }] },
                { id: "player2", name: "Player2", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }] }
            ]);
            
            gameState.executeSideshow("player1", "player2");
            
            expect(gameState.activePlayers[0].status).toBe('FOLDED');
            expect(gameState.activePlayers[1].status).toBe('ACTIVE');
        });

        test("4.9 ระบบจบเกมอัตโนมัติและมอบเงินให้ผู้เล่นที่เหลือรอดเมื่อคนอื่นหมอบหมด (Last Man Standing)", () => {
            const gameState = createMockGameState({ pot: 1500 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000 },
                { id: "player2", name: "Player2", status: "FOLDED", chips: 1000 },
                { id: "player3", name: "Player3", status: "FOLDED", chips: 1000 }
            ]);
            
            gameState.endGame(); 
            
            expect(gameState.activePlayers[0].chips).toBe(2500);
            expect(gameState.pot).toBe(0);
        });

        test("4.10 ระบบบังคับเปิดไพ่ (Force Show) อัตโนมัติเมื่อยอดเงินในกองกลางแตะเพดานลิมิต", () => {
            const gameState = createMockGameState({ pot: 9500, maxPotLimit: 10000, currentHighestBet: 0, currentPlayerIndex: 0 });
            gameState.processAction("player1", "RAISE", 1000); 
            
            expect(gameState.pot).toBe(10500);
            expect(gameState.checkPotLimitReached()).toBe(true);
        });
    });

    describe("Unhappy Paths", () => {
        test("4.11 ไม่อนุญาตให้สั่งเล่นเมื่อยังไม่ถึงเทิร์นของตัวเอง และกองกลาง/เทิร์นต้องไม่เปลี่ยนแปลง", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 1, pot: 500, currentHighestBet: 50 });
            
            expect(() => {
                gameState.processAction("player1", "CALL");
            }).toThrow(WrongTurnError);
            
            expect(gameState.pot).toBe(500);
            expect(gameState.currentPlayerIndex).toBe(1);
            expect(gameState.activePlayers[0].bet).toBe(0);
        });

        test("4.12 ผู้เล่นที่มีสถานะ WAITING หรือ FOLDED ไม่สามารถทำ Action ได้", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0, pot: 500, currentHighestBet: 50 }, [
                { id: "player1", name: "Player1", status: "FOLDED", chips: 1000 },
                { id: "player2", name: "Player2", status: "ACTIVE", chips: 1000 }
            ]);
            
            expect(() => {
                gameState.processAction("player1", "CALL");
            }).toThrow(PlayerStateError);
            
            expect(gameState.pot).toBe(500);
        });

        test("4.13 หากจบรอบซ้ำ (End Game Double Call) ต้องไม่มีการจ่ายเงินเบิ้ล", () => {
            const gameState = createMockGameState({ pot: 1000 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }] },
                { id: "player2", name: "Player2", status: "FOLDED", chips: 1000 }
            ]);
            
            gameState.endGame(); 
            expect(gameState.activePlayers[0].chips).toBe(2000);
            expect(gameState.pot).toBe(0);
            
            gameState.endGame(); 
            expect(gameState.activePlayers[0].chips).toBe(2000);
        });
    });
});
