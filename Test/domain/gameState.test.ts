import { expect, test, describe } from "bun:test";
import { GameState } from "../../src/server/domain/models/GameState";
import { Player } from "../../src/server/domain/models/Player";
import { WrongTurnError, PlayerStateError, InvalidActionError } from "../../src/server/domain/errors/GameError";
import type { PlayerStatus, Card } from "../../src/shared/types";

type PlayerFixture = {
    id: string;
    name: string;
    status: PlayerStatus;
    chips: number;
    cards?: Card[];
};

function createMockGameState(overrides?: Partial<GameState>, playersParams?: PlayerFixture[]): GameState {
    const defaultPlayers: PlayerFixture[] = [
        { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000 },
        { id: "player2", name: "Player2", status: "ACTIVE", chips: 1000 }
    ];

    const players = (playersParams ?? defaultPlayers).map(playerParam => {
        const player = new Player(playerParam.id, playerParam.name);
        player.status = playerParam.status;
        player.chips = playerParam.chips;
        
        if (playerParam.cards) {player.privateCards = playerParam.cards;}
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
        test("[GameState.startGame] 4.1 เริ่มเกม → หักชิปเป็น Boot 50 เข้า Pot 100, ผู้เล่นได้รับไพ่คนละ 3 ใบ และผู้เล่นคนแรกสถานะเป็น ACTIVE", () => {
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

        test("[GameState.nextTurn] 4.2 เปลี่ยนเทิร์น → เปลี่ยนไปยังผู้เล่นคนถัดไป", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0 });
            gameState.nextTurn();
            expect(gameState.currentPlayerIndex).toBe(1);
        });

        test("[GameState.nextTurn] 4.3 ผู้เล่นสถานะ FOLDED หรือ DISCONNECTED → ข้ามเทิร์นไปยังคนถัดไปที่เป็น ACTIVE", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000 },
                { id: "player2", name: "Player2", status: "FOLDED", chips: 1000 },
                { id: "player3", name: "Player3", status: "DISCONNECTED", chips: 1000 },
                { id: "player4", name: "Player4", status: "ACTIVE", chips: 1000 }
            ]);
            gameState.nextTurn();
            expect(gameState.currentPlayerIndex).toBe(3);
        });

        test("[GameState.processAction] 4.4 ผู้เล่น Blind ขอ CALL → หักชิปเท่า currentStake 50 เข้า Pot 150 และ currentStake คงเดิมที่ 50", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0, currentStake: 50, pot: 100 });
            gameState.processAction("player1", "CALL");
            
            expect(gameState.pot).toBe(150);
            expect(gameState.currentStake).toBe(50);
            expect(gameState.activePlayers[0].chips).toBe(950);
            expect(gameState.activePlayers[0].bet).toBe(50);
        });

        test("[GameState.processAction] 4.5 ผู้เล่น Blind ขอ RAISE ด้วย 100 → หักชิป 100 เข้า Pot 200 และ currentStake เปลี่ยนเป็น 100", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0, currentStake: 50, pot: 100 });
            gameState.processAction("player1", "RAISE", 100);
            
            expect(gameState.pot).toBe(200);
            expect(gameState.currentStake).toBe(100);
            expect(gameState.activePlayers[0].chips).toBe(900);
            expect(gameState.activePlayers[0].bet).toBe(100);
        });

        test("[GameState.processAction] 4.6 ผู้เล่น Seen ขอ CALL → หักชิป 100 เข้า Pot 200 และ currentStake คงเดิมที่ 50", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0, currentStake: 50, pot: 100 });
            gameState.activePlayers[0].isBlind = false; 
            
            gameState.processAction("player1", "CALL");
            
            expect(gameState.pot).toBe(200);
            expect(gameState.currentStake).toBe(50);
            expect(gameState.activePlayers[0].chips).toBe(900);
            expect(gameState.activePlayers[0].bet).toBe(100);
        });

        test("[GameState.processAction] 4.6.1 ผู้เล่น Seen ขอ RAISE ด้วย 200 → หักชิป 200 เข้า Pot 300 และ currentStake เปลี่ยนเป็น 100", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0, currentStake: 50, pot: 100 });
            gameState.activePlayers[0].isBlind = false; 
            
            gameState.processAction("player1", "RAISE", 200);
            
            expect(gameState.pot).toBe(300);
            expect(gameState.currentStake).toBe(100);
            expect(gameState.activePlayers[0].chips).toBe(800);
            expect(gameState.activePlayers[0].bet).toBe(200);
        });

        test("[GameState.processAction] 4.6.2 วนเทิร์นกลับมาที่ผู้เล่นเดิมแล้วขอ CALL → หักชิปเต็ม 100 เข้า Pot 350 โดยไม่หักลบยอดเดิม", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0, currentStake: 50, pot: 100 });
            
            gameState.processAction("player1", "CALL");
            gameState.nextTurn();
            gameState.processAction("player2", "RAISE", 100);
            gameState.nextTurn(); 
            
            gameState.processAction("player1", "CALL");
            
            expect(gameState.pot).toBe(350);
            expect(gameState.currentStake).toBe(100);
            expect(gameState.activePlayers[0].chips).toBe(850);
            expect(gameState.activePlayers[0].bet).toBe(150);
        });

        test("[GameState.evaluateWinner] 4.7 จบเกมและผู้เล่นคนแรกถือมือดีกว่า → โอนเงินใน Pot 500 ให้ผู้ชนะ", () => {
            const gameState = createMockGameState({ pot: 500 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }] },
                { id: "player2", name: "Player2", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'DIAMONDS', rank: 4 }] }
            ]);
            
            gameState.evaluateWinner();
            
            expect(gameState.activePlayers[0].chips).toBe(1500);
            expect(gameState.activePlayers[1].chips).toBe(1000);
            expect(gameState.pot).toBe(0);
        });

        test.skip("[GameState.executeSideshow] 4.8 [พักไว้หลังเดโม] → ผู้แพ้เปลี่ยนสถานะเป็น FOLDED", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'DIAMONDS', rank: 4 }] },
                { id: "player2", name: "Player2", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }] }
            ]);
            
            gameState.executeSideshow("player1", "player2");
            
            expect(gameState.activePlayers[0].status).toBe('FOLDED');
            expect(gameState.activePlayers[1].status).toBe('ACTIVE');
        });

        test("[GameState.endGame] 4.9 คนอื่นหมอบหมดเหลือผู้เล่นคนเดียว → จบเกมและโอนเงิน Pot 1500 ให้ผู้เล่นที่เหลือรอด", () => {
            const gameState = createMockGameState({ pot: 1500 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000 },
                { id: "player2", name: "Player2", status: "FOLDED", chips: 1000 },
                { id: "player3", name: "Player3", status: "FOLDED", chips: 1000 }
            ]);
            
            gameState.endGame(); 
            
            expect(gameState.activePlayers[0].chips).toBe(2500);
            expect(gameState.pot).toBe(0);
        });

        test("[GameState.processAction] 4.10 เหลือผู้เล่น Blind 2 คนและไพ่เสมอ → ผู้ขอจ่ายค่า SHOW และอีกคนรับกองกลางทั้งหมด", () => {
            const gameState = createMockGameState({ pot: 500, currentPlayerIndex: 0, currentStake: 100 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] },
                { id: "player2", name: "Player2", status: "ACTIVE", chips: 1000, cards: [{ suit: 'CLUBS', rank: 14 }, { suit: 'DIAMONDS', rank: 13 }, { suit: 'SPADES', rank: 5 }] }
            ]);
            
            gameState.processAction("player1", "SHOW");
            
            expect(gameState.pot).toBe(0);
            expect(gameState.activePlayers[0].chips).toBe(900);
            expect(gameState.activePlayers[1].chips).toBe(1600);
        });

        test("[GameState.processAction] 4.10.1 ผู้เล่น Seen ขอ SHOW กับ Seen และไพ่เสมอ → ผู้ขอจ่ายค่า SHOW สองเท่า (200) และอีกคนรับกองกลางทั้งหมด", () => {
            const gameState = createMockGameState({ pot: 500, currentPlayerIndex: 0, currentStake: 100 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] },
                { id: "player2", name: "Player2", status: "ACTIVE", chips: 1000, cards: [{ suit: 'CLUBS', rank: 14 }, { suit: 'DIAMONDS', rank: 13 }, { suit: 'SPADES', rank: 5 }] }
            ]);
            gameState.activePlayers[0].isBlind = false; 
            gameState.activePlayers[1].isBlind = false; 
            
            gameState.processAction("player1", "SHOW");
            
            expect(gameState.activePlayers[0].chips).toBe(800); 
            expect(gameState.activePlayers[1].chips).toBe(1700); 
        });

        test("[GameState.processAction] 4.10.2 ขอ SHOW เมื่อเหลือผู้เล่นมากกว่า 2 คน → โยน InvalidActionError", () => {
            const gameState = createMockGameState({ pot: 500, currentPlayerIndex: 0, currentStake: 100 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] },
                { id: "player2", name: "Player2", status: "ACTIVE", chips: 1000, cards: [{ suit: 'CLUBS', rank: 14 }, { suit: 'DIAMONDS', rank: 13 }, { suit: 'SPADES', rank: 5 }] },
                { id: "player3", name: "Player3", status: "ACTIVE", chips: 1000, cards: [{ suit: 'HEARTS', rank: 2 }, { suit: 'CLUBS', rank: 3 }, { suit: 'DIAMONDS', rank: 4 }] }
            ]);
            expect(() => {
                gameState.processAction("player1", "SHOW");
            }).toThrow(InvalidActionError);
            
            expect(gameState.pot).toBe(500);
            expect(gameState.activePlayers[0].chips).toBe(1000);
        });

        test("[GameState.processAction] 4.10.3 ขอ SHOW เมื่อไม่ใช่เทิร์นตนเอง → โยน WrongTurnError", () => {
            const gameState = createMockGameState({ pot: 500, currentPlayerIndex: 1, currentStake: 100 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] },
                { id: "player2", name: "Player2", status: "ACTIVE", chips: 1000, cards: [{ suit: 'CLUBS', rank: 14 }, { suit: 'DIAMONDS', rank: 13 }, { suit: 'SPADES', rank: 5 }] }
            ]);
            expect(() => {
                gameState.processAction("player1", "SHOW");
            }).toThrow(WrongTurnError);
            
            expect(gameState.pot).toBe(500);
            expect(gameState.activePlayers[0].chips).toBe(1000);
        });

        test("[GameState.processAction] 4.10.4 ผู้เล่น Seen ขอ SHOW กับผู้เล่น Blind → โยน InvalidActionError", () => {
            const gameState = createMockGameState({ pot: 500, currentPlayerIndex: 0, currentStake: 100 }, [
                { id: "player1", name: "Player1", status: "ACTIVE", chips: 1000, cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] },
                { id: "player2", name: "Player2", status: "ACTIVE", chips: 1000, cards: [{ suit: 'CLUBS', rank: 14 }, { suit: 'DIAMONDS', rank: 13 }, { suit: 'SPADES', rank: 5 }] }
            ]);
            gameState.activePlayers[0].isBlind = false; 
            gameState.activePlayers[1].isBlind = true;  
            
            expect(() => {
                gameState.processAction("player1", "SHOW");
            }).toThrow(InvalidActionError);
            
            expect(gameState.pot).toBe(500);
            expect(gameState.activePlayers[0].chips).toBe(1000);
        });

        test("[GameState.startGame] 4.11 เริ่มเกมกับผู้เล่นสถานะ Blind → ผู้เล่นได้รับ privateCards ครบ 3 ใบและ isBlind ยังเป็น true", () => {
            const gameState = createMockGameState({}, [
                { id: "player1", name: "Player1", status: "WAITING", chips: 1000 },
                { id: "player2", name: "Player2", status: "WAITING", chips: 1000 }
            ]);
            gameState.startGame();
            
            expect(gameState.activePlayers[0].isBlind).toBe(true);
            expect(gameState.activePlayers[0].privateCards.length).toBe(3);
        });
    });

    describe("Unhappy Paths", () => {
        test("[GameState.processAction] 4.11 สั่งเล่น CALL นอกเทิร์นตนเอง → โยน WrongTurnError และ pot, currentPlayerIndex และ bet ของผู้ขอไม่เปลี่ยน", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 1, pot: 500, currentStake: 50 });
            
            expect(() => {
                gameState.processAction("player1", "CALL");
            }).toThrow(WrongTurnError);
            
            expect(gameState.pot).toBe(500);
            expect(gameState.currentPlayerIndex).toBe(1);
            expect(gameState.activePlayers[0].bet).toBe(0);
        });

        test("[GameState.processAction] 4.12 ผู้เล่นที่มีสถานะ FOLDED ขอ CALL → โยน PlayerStateError", () => {
            const gameState = createMockGameState({ currentPlayerIndex: 0, pot: 500, currentStake: 50 }, [
                { id: "player1", name: "Player1", status: "FOLDED", chips: 1000 },
                { id: "player2", name: "Player2", status: "ACTIVE", chips: 1000 }
            ]);
            
            expect(() => {
                gameState.processAction("player1", "CALL");
            }).toThrow(PlayerStateError);
            
            expect(gameState.pot).toBe(500);
        });

        test("[GameState.endGame] 4.13 จบรอบซ้ำสองครั้ง → ผู้ชนะรับเงินจาก Pot แค่รอบแรก และชิปไม่เพิ่มเบิ้ล", () => {
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


