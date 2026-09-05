import { expect, test, describe } from "bun:test";

import {
    createDeck,
    shuffleDeck,
    dealCards,
    evaluateHand,
    compareHands,
    getWinners,
    calculateSplitPot
} from "../../src/server/core/gameLogic";

import type { Card } from "../../src/shared/types";

describe("1. ระบบประเมินหน้าไพ่ (evaluateHand)", () => {

    test("1.1 ประเมินผลเป็น 'ไพ่ตอง (TRAIL)' เมื่อไพ่ทั้ง 3 ใบมีแต้มเท่ากัน", () => {
        const cards: Card[] = [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 14 },
            { suit: 'DIAMONDS', rank: 14 }
        ];

        const result = evaluateHand(cards);
        expect(result.rank).toBe('TRAIL');
        expect(result.rankValue).toBe(14);
        expect(result.kickers).toBeInstanceOf(Array);
    });

    test("1.2 ประเมินผลเป็น 'สเตรทฟลัช (PURE SEQUENCE)' เมื่อไพ่เรียงกันและดอกเดียวกัน", () => {
        const cards: Card[] = [
            { suit: 'HEARTS', rank: 12 },
            { suit: 'HEARTS', rank: 13 },
            { suit: 'HEARTS', rank: 14 }
        ];

        const result = evaluateHand(cards);
        expect(result.rank).toBe('PURE_SEQUENCE');
        expect(result.rankValue).toBe(14);
    });

    test("1.3 ประเมินผลเป็น 'สเตรท (SEQUENCE)' โดยที่ไพ่เข้ามือแบบสลับตำแหน่งกัน", () => {
        const cards: Card[] = [
            { suit: 'HEARTS', rank: 3 },
            { suit: 'SPADES', rank: 4 },
            { suit: 'DIAMONDS', rank: 2 }
        ];

        const result = evaluateHand(cards);
        expect(result.rank).toBe('SEQUENCE');
        expect(result.rankValue).toBe(4);
    });

    test("1.4 ประเมินผลเป็น 'ฟลัช (COLOR)' เมื่อไพ่เป็นดอกเดียวกันทั้งหมดโดยแต้มไม่เรียงกัน", () => {
        const cards: Card[] = [
            { suit: 'CLUBS', rank: 2 },
            { suit: 'CLUBS', rank: 8 },
            { suit: 'CLUBS', rank: 10 }
        ];

        const result = evaluateHand(cards);
        expect(result.rank).toBe('COLOR');
    });

    test("1.5 ประเมินผลเป็น 'ไพ่คู่ (PAIR)' เมื่อไพ่มีแต้มซ้ำกันแค่ 2 ใบ", () => {
        const cards: Card[] = [
            { suit: 'SPADES', rank: 9 },
            { suit: 'HEARTS', rank: 9 },
            { suit: 'DIAMONDS', rank: 11 }
        ];

        const result = evaluateHand(cards);
        expect(result.rank).toBe('PAIR');
        expect(result.rankValue).toBe(9);
        expect(result.kickers).toContain(11);
    });

    test("1.6 ประเมินผลเป็น 'ไพ่สูง (HIGH CARD)' เมื่อไม่เข้าเงื่อนไขใดเลย", () => {
        const cards: Card[] = [
            { suit: 'SPADES', rank: 2 },
            { suit: 'HEARTS', rank: 7 },
            { suit: 'DIAMONDS', rank: 13 }
        ];

        const result = evaluateHand(cards);
        expect(result.rank).toBe('HIGH_CARD');
        expect(result.rankValue).toBe(13);
        expect(result.kickers).toEqual([7, 2]);
    });

    test("1.7 กฎของไพ่ A-2-3 ถือเป็น SEQUENCE", () => {
        const cards: Card[] = [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 2 },
            { suit: 'DIAMONDS', rank: 3 }
        ];

        const result = evaluateHand(cards);
        expect(result.rank).toBe('SEQUENCE');
    });

    test("1.8 กฎของไพ่ A-2-3 ที่เป็นดอกเดียวกัน ต้องถือเป็น PURE_SEQUENCE", () => {
        const cards: Card[] = [
            { suit: 'CLUBS', rank: 14 },
            { suit: 'CLUBS', rank: 2 },
            { suit: 'CLUBS', rank: 3 }
        ];
        const result = evaluateHand(cards);
        expect(result.rank).toBe('PURE_SEQUENCE');
    });
});

describe("2. ระบบเปรียบเทียบเพื่อหาผู้ชนะ (compareHands)", () => {

    test("2.1 ลำดับชั้นความใหญ่ของไพ่ต้องถูกต้อง (Hierarchy Validation)", () => {
        const handTrail: Card[] = [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 2 }, { suit: 'DIAMONDS', rank: 2 }];
        const handPureSeq: Card[] = [{ suit: 'HEARTS', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'HEARTS', rank: 4 }];
        const handSeq: Card[] = [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'DIAMONDS', rank: 4 }];
        const handColor: Card[] = [{ suit: 'CLUBS', rank: 2 }, { suit: 'CLUBS', rank: 5 }, { suit: 'CLUBS', rank: 8 }];
        const handPair: Card[] = [{ suit: 'SPADES', rank: 9 }, { suit: 'HEARTS', rank: 9 }, { suit: 'DIAMONDS', rank: 10 }];
        const handHigh: Card[] = [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 7 }, { suit: 'DIAMONDS', rank: 13 }];

        expect(compareHands(handTrail, handPureSeq)).toBeGreaterThan(0);
        expect(compareHands(handPureSeq, handSeq)).toBeGreaterThan(0);
        expect(compareHands(handSeq, handColor)).toBeGreaterThan(0);
        expect(compareHands(handColor, handPair)).toBeGreaterThan(0);
        expect(compareHands(handPair, handHigh)).toBeGreaterThan(0);
    });

    test("2.2 หากได้ไพ่รูปแบบเดียวกัน ให้ตัดสินแพ้ชนะจากตัวเตะ (Kicker) ที่สูงกว่า", () => {
        const highPair: Card[] = [
            { suit: 'SPADES', rank: 9 },
            { suit: 'HEARTS', rank: 9 },
            { suit: 'DIAMONDS', rank: 14 }
        ];
        const lowPair: Card[] = [
            { suit: 'CLUBS', rank: 9 },
            { suit: 'DIAMONDS', rank: 9 },
            { suit: 'SPADES', rank: 13 }
        ];

        const result = compareHands(highPair, lowPair);
        expect(result).toBeGreaterThan(0);
    });

    test("2.3 หากได้ไพ่ HIGH_CARD ที่ไพ่สูงสุดเท่ากัน ให้ตัดสินแพ้ชนะจากไพ่ใบรอง (Kicker)", () => {
        const handAK5: Card[] = [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 13 },
            { suit: 'DIAMONDS', rank: 5 }
        ];
        const handAQ9: Card[] = [
            { suit: 'CLUBS', rank: 14 },
            { suit: 'DIAMONDS', rank: 12 },
            { suit: 'SPADES', rank: 9 }
        ];

        const result = compareHands(handAK5, handAQ9);
        expect(result).toBeGreaterThan(0);
    });

    test("2.4 หากได้ไพ่รูปแบบเดียวกัน ให้ไพ่ที่มี Rank สูงสุดชนะ", () => {
        const highTrail: Card[] = [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }];
        const lowTrail: Card[] = [{ suit: 'CLUBS', rank: 13 }, { suit: 'SPADES', rank: 13 }, { suit: 'HEARTS', rank: 13 }];
        expect(compareHands(highTrail, lowTrail)).toBeGreaterThan(0);

        const highSeq: Card[] = [{ suit: 'SPADES', rank: 12 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 14 }];
        const lowSeq: Card[] = [{ suit: 'CLUBS', rank: 2 }, { suit: 'SPADES', rank: 3 }, { suit: 'HEARTS', rank: 4 }];
        expect(compareHands(highSeq, lowSeq)).toBeGreaterThan(0);
    });

    test("2.5 การตัดสินแพ้ชนะของ PAIR และ COLOR ที่แต้มหลักต่างกัน ต้องอ้างอิงจากแต้มหลักก่อนเสมอ", () => {
        const highPair: Card[] = [{ suit: 'SPADES', rank: 13 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 2 }];
        const lowPair: Card[] = [{ suit: 'CLUBS', rank: 12 }, { suit: 'DIAMONDS', rank: 12 }, { suit: 'SPADES', rank: 14 }];
        expect(compareHands(highPair, lowPair)).toBeGreaterThan(0);

        const highColor: Card[] = [{ suit: 'HEARTS', rank: 14 }, { suit: 'HEARTS', rank: 9 }, { suit: 'HEARTS', rank: 2 }];
        const lowColor: Card[] = [{ suit: 'SPADES', rank: 13 }, { suit: 'SPADES', rank: 10 }, { suit: 'SPADES', rank: 8 }];
        expect(compareHands(highColor, lowColor)).toBeGreaterThan(0);
    });

    test("2.6 ลำดับความใหญ่ของ SEQUENCE ตามกฎ A-2-3 ต้องถูกต้อง", () => {
        const seqAKQ: Card[] = [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 12 }];
        const seqA23: Card[] = [{ suit: 'CLUBS', rank: 14 }, { suit: 'DIAMONDS', rank: 2 }, { suit: 'SPADES', rank: 3 }];
        const seqKQJ: Card[] = [{ suit: 'HEARTS', rank: 13 }, { suit: 'SPADES', rank: 12 }, { suit: 'CLUBS', rank: 11 }];
        const seq432: Card[] = [{ suit: 'DIAMONDS', rank: 4 }, { suit: 'CLUBS', rank: 3 }, { suit: 'HEARTS', rank: 2 }];

        expect(compareHands(seqAKQ, seqA23)).toBeGreaterThan(0);
        expect(compareHands(seqA23, seqKQJ)).toBeGreaterThan(0);
        expect(compareHands(seqKQJ, seq432)).toBeGreaterThan(0);
    });

    test("2.7 หากได้ไพ่รูปแบบเดียวกันและแต้มเท่ากันทุกใบ ต้องตัดสินว่าเสมอ (คืนค่า 0)", () => {
        const handA: Card[] = [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 13 },
            { suit: 'DIAMONDS', rank: 5 }
        ];
        const handB: Card[] = [
            { suit: 'CLUBS', rank: 14 },
            { suit: 'DIAMONDS', rank: 13 },
            { suit: 'SPADES', rank: 5 }
        ];
        expect(compareHands(handA, handB)).toBe(0);
    });
});

describe("3. ระบบจัดการสำรับไพ่และการแจกไพ่", () => {

    test("3.1 เมื่อสร้างสำรับใหม่ ต้องได้ไพ่ครบ 52 ใบและต้องไม่มีไพ่ซ้ำกัน", () => {
        const deck = createDeck();
        expect(deck).toBeInstanceOf(Array);
        expect(deck.length).toBe(52);

        const uniqueCards = new Set(deck.map(card => `${card.suit}-${card.rank}`));
        expect(uniqueCards.size).toBe(52);
    });

    test("3.2 เมื่อสับไพ่ ต้นฉบับต้องไม่ถูกแก้ไข (Pure Function) และได้ผลลัพธ์ที่สามารถคาดเดาได้ผ่าน RNG", () => {
        const originalDeck: Card[] = [
            { suit: 'SPADES', rank: 2 },
            { suit: 'HEARTS', rank: 3 },
            { suit: 'CLUBS', rank: 4 }
        ];
        const before = structuredClone(originalDeck);
        
        let callCount = 0;
        const mockRng = () => {
            const seq = [0.9, 0.1, 0.5];
            return seq[callCount++];
        };

        const shuffledDeck = shuffleDeck(originalDeck, mockRng);

        expect(originalDeck).toEqual(before);

        expect(shuffledDeck.length).toBe(3);
        const unique = new Set(shuffledDeck.map(card => `${card.suit}-${card.rank}`));
        expect(unique.size).toBe(3);
    });

    test("3.3 แจกไพ่ตามจำนวนผู้เล่นได้ถูกต้อง ไพ่บนมือและในกองรวมกันต้องครบ 52 ใบโดยไม่ซ้ำกัน", () => {
        const deck = createDeck();
        const playerCount = 4;
        const cardsPerPlayer = 3;

        const result = dealCards(deck, playerCount, cardsPerPlayer);

        expect(result.hands.length).toBe(4);
        expect(result.hands[0].length).toBe(3);
        expect(result.remainingDeck.length).toBe(52 - (4 * 3));

        const allDealtCards = result.hands.flat();
        const combinedCards = [...allDealtCards, ...result.remainingDeck];
        const uniqueCombinedCards = new Set(combinedCards.map(card => `${card.suit}-${card.rank}`));

        expect(uniqueCombinedCards.size).toBe(52);
    });

    test("3.4 การแจกไพ่ต้องแจกแบบวนทีละใบ (Round-Robin)", () => {
        const mockDeck: Card[] = [
            { suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 },
            { suit: 'CLUBS', rank: 4 }, { suit: 'DIAMONDS', rank: 5 },
            { suit: 'SPADES', rank: 6 }, { suit: 'HEARTS', rank: 7 }
        ];
        const result = dealCards(mockDeck, 2, 3);
        
        expect(result.hands[0]).toEqual([
            { suit: 'SPADES', rank: 2 },
            { suit: 'CLUBS', rank: 4 },
            { suit: 'SPADES', rank: 6 }
        ]);
        expect(result.hands[1]).toEqual([
            { suit: 'HEARTS', rank: 3 },
            { suit: 'DIAMONDS', rank: 5 },
            { suit: 'HEARTS', rank: 7 }
        ]);
    });
});

describe("4. ระบบค้นหาผู้ชนะจากวงเล่น (Multiplayer Winner Evaluation)", () => {

    test("4.1 สามารถค้นหาผู้ชนะเพียงหนึ่งเดียวจากผู้เล่น 4 คนได้ถูกต้อง", () => {
        const players: { id: string, cards: Card[] }[] = [
            { id: "player_1", cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 7 }, { suit: 'DIAMONDS', rank: 13 }] },
            { id: "player_2", cards: [{ suit: 'SPADES', rank: 9 }, { suit: 'HEARTS', rank: 9 }, { suit: 'DIAMONDS', rank: 11 }] },
            { id: "player_3", cards: [{ suit: 'CLUBS', rank: 2 }, { suit: 'CLUBS', rank: 8 }, { suit: 'CLUBS', rank: 10 }] },
            { id: "player_4", cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }] }
        ];

        const winners = getWinners(players);

        expect(winners).toBeInstanceOf(Array);
        expect(winners.length).toBe(1);
        expect(winners[0]).toBe("player_4");
    });

    test("4.2 หากมีผู้เล่นถือไพ่ที่คะแนนเท่ากันเป๊ะ ต้องคืนค่าผู้ชนะมากกว่า 1 คน (Split Pot)", () => {
        const players: { id: string, cards: Card[] }[] = [
            { id: "player_1", cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] },
            { id: "player_2", cards: [{ suit: 'CLUBS', rank: 14 }, { suit: 'DIAMONDS', rank: 13 }, { suit: 'SPADES', rank: 5 }] },
            { id: "player_3", cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 7 }, { suit: 'DIAMONDS', rank: 9 }] }
        ];

        const winners = getWinners(players);

        expect(winners).toBeInstanceOf(Array);
        expect(winners.length).toBe(2);
        expect(winners).toContain("player_1");
        expect(winners).toContain("player_2");
    });
});

describe("5. ระบบจัดการกองกลางและการจ่ายเงิน (Pot Settlement)", () => {
    test("5.1 แบ่งเงินกองกลางให้ผู้ชนะหลายคนได้ถูกต้อง และจัดการเศษชิป", () => {
        const pot = 1000;
        const winnerIds = ["player_1", "player_2", "player_3"];
        
        const payouts = calculateSplitPot(pot, winnerIds);
        
        expect(payouts["player_1"]).toBeDefined();
        expect(payouts["player_2"]).toBeDefined();
        expect(payouts["player_3"]).toBeDefined();
        
        const totalPaid = payouts["player_1"] + payouts["player_2"] + payouts["player_3"];
        expect(totalPaid).toBeLessThanOrEqual(1000);
        expect(totalPaid).toBeGreaterThan(990);
    });
});
