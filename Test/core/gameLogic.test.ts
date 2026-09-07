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

describe("[gameLogic.evaluateHand] 1. ระบบประเมินหน้าไพ่", () => {

    test("1.1 ไพ่ทั้ง 3 ใบมีแต้มเท่ากัน → คืนค่า rank เป็น TRAIL และ rankValue เท่ากับแต้ม", () => {
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

    test("1.2 ไพ่เรียงกันและดอกเดียวกัน → คืนค่า rank เป็น PURE_SEQUENCE", () => {
        const cards: Card[] = [
            { suit: 'HEARTS', rank: 12 },
            { suit: 'HEARTS', rank: 13 },
            { suit: 'HEARTS', rank: 14 }
        ];

        const result = evaluateHand(cards);
        expect(result.rank).toBe('PURE_SEQUENCE');
        expect(result.rankValue).toBe(14);
    });

    test("1.3 ไพ่เรียงกันสลับดอกสลับตำแหน่ง → คืนค่า rank เป็น SEQUENCE", () => {
        const cards: Card[] = [
            { suit: 'HEARTS', rank: 3 },
            { suit: 'SPADES', rank: 4 },
            { suit: 'DIAMONDS', rank: 2 }
        ];

        const result = evaluateHand(cards);
        expect(result.rank).toBe('SEQUENCE');
        expect(result.rankValue).toBe(4);
    });

    test("1.4 ไพ่ดอกเดียวกันทั้งหมดโดยแต้มไม่เรียงกัน → คืนค่า rank เป็น COLOR", () => {
        const cards: Card[] = [
            { suit: 'CLUBS', rank: 2 },
            { suit: 'CLUBS', rank: 8 },
            { suit: 'CLUBS', rank: 10 }
        ];

        const result = evaluateHand(cards);
        expect(result.rank).toBe('COLOR');
    });

    test("1.5 ไพ่แต้มซ้ำกัน 2 ใบ → คืนค่า rank เป็น PAIR พร้อมระบุ kickers", () => {
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

    test("1.6 ไม่เข้าเงื่อนไขใดเลย → คืนค่า rank เป็น HIGH_CARD พร้อมเรียง kickers จากมากไปน้อย", () => {
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

    test("1.7 ไพ่ A-2-3 → คืนค่า rank เป็น SEQUENCE", () => {
        const cards: Card[] = [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 2 },
            { suit: 'DIAMONDS', rank: 3 }
        ];

        const result = evaluateHand(cards);
        expect(result.rank).toBe('SEQUENCE');
    });

    test("1.8 ไพ่ A-2-3 ดอกเดียวกัน → คืนค่า rank เป็น PURE_SEQUENCE", () => {
        const cards: Card[] = [
            { suit: 'CLUBS', rank: 14 },
            { suit: 'CLUBS', rank: 2 },
            { suit: 'CLUBS', rank: 3 }
        ];
        const result = evaluateHand(cards);
        expect(result.rank).toBe('PURE_SEQUENCE');
    });

    test("1.9 ไพ่ K-A-2 → ไม่คืนค่า rank เป็น SEQUENCE หรือ PURE_SEQUENCE", () => {
        const cards: Card[] = [
            { suit: 'SPADES', rank: 13 },
            { suit: 'HEARTS', rank: 14 },
            { suit: 'DIAMONDS', rank: 2 }
        ];

        const result = evaluateHand(cards);
        expect(result.rank).not.toBe('SEQUENCE');
        expect(result.rank).not.toBe('PURE_SEQUENCE');
    });

    test("1.10 สลับลำดับไพ่ในมือแล้วผลประเมินต้องเท่าเดิม (HIGH_CARD)", () => {
        const cards: Card[] = [
            { suit: 'SPADES', rank: 13 },
            { suit: 'HEARTS', rank: 7 },
            { suit: 'DIAMONDS', rank: 2 }
        ];

        // หา permutations ทั้ง 6 รูปแบบ
        const perms = [
            [cards[0], cards[1], cards[2]],
            [cards[0], cards[2], cards[1]],
            [cards[1], cards[0], cards[2]],
            [cards[1], cards[2], cards[0]],
            [cards[2], cards[0], cards[1]],
            [cards[2], cards[1], cards[0]]
        ];

        const expected = evaluateHand(perms[0]);

        for (const perm of perms) {
            expect(evaluateHand(perm)).toEqual(expected);
        }
    });

    test("1.11 ประเมินหน้าไพ่แล้วออบเจกต์ไพ่ต้นฉบับต้องไม่ถูกเปลี่ยนแปลง (Immutability)", () => {
        const originalCards: Card[] = [
            { suit: 'SPADES', rank: 13 },
            { suit: 'HEARTS', rank: 7 },
            { suit: 'DIAMONDS', rank: 2 }
        ];
        const clonedCards = structuredClone(originalCards);

        evaluateHand(originalCards);

        expect(originalCards).toEqual(clonedCards);
    });
});

describe("[gameLogic.compareHands] 2. ระบบเปรียบเทียบเพื่อหาผู้ชนะ", () => {

    test("2.1 เปรียบเทียบไพ่ต่างลำดับชั้น → คืนค่ามากกว่า 0 เมื่อไพ่ลำดับชั้นสูงกว่าชนะ", () => {
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

    test("2.2 เปรียบเทียบไพ่คู่ระดับเดียวกันที่มีแต้มคู่เท่ากัน → ตัดสินผู้ชนะจากตัวเตะ (Kicker) ที่สูงกว่า", () => {
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

    test("2.3 เปรียบเทียบ HIGH_CARD ที่แต้มสูงสุดเท่ากัน → ตัดสินผู้ชนะจากไพ่ใบรองลงมา", () => {
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

    test("2.4 เปรียบเทียบไพ่ลำดับชั้นเดียวกัน → ตัดสินผู้ชนะจากแต้มหลักที่สูงกว่า", () => {
        const highTrail: Card[] = [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }];
        const lowTrail: Card[] = [{ suit: 'CLUBS', rank: 13 }, { suit: 'SPADES', rank: 13 }, { suit: 'HEARTS', rank: 13 }];
        expect(compareHands(highTrail, lowTrail)).toBeGreaterThan(0);

        const highSeq: Card[] = [{ suit: 'SPADES', rank: 12 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 14 }];
        const lowSeq: Card[] = [{ suit: 'CLUBS', rank: 2 }, { suit: 'SPADES', rank: 3 }, { suit: 'HEARTS', rank: 4 }];
        expect(compareHands(highSeq, lowSeq)).toBeGreaterThan(0);
    });

    test("2.5 เปรียบเทียบ PAIR และ COLOR ที่แต้มหลักต่างกัน → ตัดสินผู้ชนะจากแต้มหลักก่อนเสมอ", () => {
        const highPair: Card[] = [{ suit: 'SPADES', rank: 13 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 2 }];
        const lowPair: Card[] = [{ suit: 'CLUBS', rank: 12 }, { suit: 'DIAMONDS', rank: 12 }, { suit: 'SPADES', rank: 14 }];
        expect(compareHands(highPair, lowPair)).toBeGreaterThan(0);

        const highColor: Card[] = [{ suit: 'HEARTS', rank: 14 }, { suit: 'HEARTS', rank: 9 }, { suit: 'HEARTS', rank: 2 }];
        const lowColor: Card[] = [{ suit: 'SPADES', rank: 13 }, { suit: 'SPADES', rank: 10 }, { suit: 'SPADES', rank: 8 }];
        expect(compareHands(highColor, lowColor)).toBeGreaterThan(0);
    });

    test("2.6 เปรียบเทียบ SEQUENCE ตามกฎ Pagat → ลำดับความใหญ่ A-2-3 ชนะ A-K-Q และลดหลั่นตามลำดับ", () => {
        const seqA23: Card[] = [{ suit: 'CLUBS', rank: 14 }, { suit: 'DIAMONDS', rank: 2 }, { suit: 'SPADES', rank: 3 }];
        const seqAKQ: Card[] = [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 12 }];
        const seqKQJ: Card[] = [{ suit: 'HEARTS', rank: 13 }, { suit: 'SPADES', rank: 12 }, { suit: 'CLUBS', rank: 11 }];
        const seq432: Card[] = [{ suit: 'DIAMONDS', rank: 4 }, { suit: 'CLUBS', rank: 3 }, { suit: 'HEARTS', rank: 2 }];

        expect(compareHands(seqA23, seqAKQ)).toBeGreaterThan(0);
        expect(compareHands(seqAKQ, seqKQJ)).toBeGreaterThan(0);
        expect(compareHands(seqKQJ, seq432)).toBeGreaterThan(0);
    });

    test("2.6.1 เปรียบเทียบ PURE_SEQUENCE ตามกฎ Pagat → ลำดับความใหญ่ A-2-3 ชนะ A-K-Q", () => {
        const pureSeqA23: Card[] = [{ suit: 'CLUBS', rank: 14 }, { suit: 'CLUBS', rank: 2 }, { suit: 'CLUBS', rank: 3 }];
        const pureSeqAKQ: Card[] = [{ suit: 'SPADES', rank: 14 }, { suit: 'SPADES', rank: 13 }, { suit: 'SPADES', rank: 12 }];

        expect(compareHands(pureSeqA23, pureSeqAKQ)).toBeGreaterThan(0);
    });

    test("2.7 เปรียบเทียบไพ่รูปแบบเดียวกันและแต้มเท่ากันทุกใบ → คืนค่า 0 (เสมอ)", () => {
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

    test("2.8 เปรียบเทียบ HIGH_CARD ที่มี Kicker ตัวสุดท้ายต่างกัน", () => {
        // A-9-5 vs A-9-4
        const handA95: Card[] = [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 9 },
            { suit: 'DIAMONDS', rank: 5 }
        ];
        const handA94: Card[] = [
            { suit: 'CLUBS', rank: 14 },
            { suit: 'DIAMONDS', rank: 9 },
            { suit: 'SPADES', rank: 4 }
        ];

        expect(compareHands(handA95, handA94)).toBeGreaterThan(0);
        expect(compareHands(handA94, handA95)).toBeLessThan(0);
    });
});

describe("3. ระบบจัดการสำรับไพ่และการแจกไพ่", () => {

    test("[createDeck] 3.1 สร้างสำรับใหม่ → ได้ไพ่ 52 ใบและไม่มีคู่ดอก-แต้มซ้ำ", () => {
        const deck = createDeck();
        expect(deck).toBeInstanceOf(Array);
        expect(deck.length).toBe(52);

        const uniqueCards = new Set(deck.map(card => `${card.suit}-${card.rank}`));
        expect(uniqueCards.size).toBe(52);
    });

    test("[shuffleDeck] 3.2 สับไพ่ด้วย RNG → ต้นฉบับไม่ถูกแก้ไขและได้ไพ่เรียงใหม่ตามลำดับ RNG", () => {
        const originalDeck: Card[] = [
            { suit: 'SPADES', rank: 2 },
            { suit: 'HEARTS', rank: 3 },
            { suit: 'CLUBS', rank: 4 }
        ];
        const before = structuredClone(originalDeck);

        let callCount = 0;
        const mockRng = () => {
            const seq = [0.9, 0.1];
            return seq[callCount++];
        };

        const shuffledDeck = shuffleDeck(originalDeck, mockRng);

        expect(originalDeck).toEqual(before);

        expect(shuffledDeck.length).toBe(3);
        expect(shuffledDeck).toEqual([
            { suit: 'HEARTS', rank: 3 },
            { suit: 'SPADES', rank: 2 },
            { suit: 'CLUBS', rank: 4 }
        ]);
    });

    test("[dealCards] 3.3 แจกให้ 4 คน คนละ 3 ใบ → มือแรกมี 3 ใบ กองเหลือ 40 ใบ และไพ่รวมมี 52 คู่ดอก-แต้มไม่ซ้ำ", () => {
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

    test("[dealCards] 3.4 แจกไพ่ 2 คน คนละ 3 ใบ → ไพ่ถูกแจกแบบวนทีละใบ (Round-Robin)", () => {
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

    test("[dealCards] 3.5 แจกไพ่แล้วออบเจกต์สำรับต้นฉบับต้องไม่ถูกเปลี่ยนแปลง (Immutability)", () => {
        const deck = createDeck();
        const clonedDeck = structuredClone(deck);

        dealCards(deck, 4, 3);

        expect(deck).toEqual(clonedDeck);
    });

    test("[dealCards] 3.6 แจกไพ่ 2, 3 และ 4 คน → ไพ่ในมือและไพ่ที่เหลือต้องรวมกันได้เท่ากับสำรับต้นฉบับเป๊ะ", () => {
        const deck = createDeck();
        
        for (const playerCount of [2, 3, 4]) {
            const result = dealCards(deck, playerCount, 3);
            
            const allDealtCards = result.hands.flat();
            const combinedCards = [...allDealtCards, ...result.remainingDeck];
            
            // เรียงไพ่ทั้งสองชุดเพื่อเปรียบเทียบให้ง่ายขึ้น
            const sortCards = (cards: Card[]) => cards.sort((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit));
            
            expect(sortCards(combinedCards)).toEqual(sortCards(structuredClone(deck)));
        }
    });
});

describe("[gameLogic.getWinners] 4. ค้นหาผู้เล่นที่ถือมือดีที่สุด", () => {

    test("4.1 มีผู้ชนะอันดับสูงสุดคนเดียวจาก 4 คน → คืน ID ผู้ชนะเพียงคนเดียว", () => {
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

    test("4.2 เมื่อผู้เล่นสองคนเสมอกันที่อันดับสูงสุด → ต้องคืน ID ทั้งสองคนและไม่รวมผู้เล่นที่แพ้", () => {
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

    test("4.3 ผู้เล่นคนแรกแพ้, คนที่สองชนะ, และคนที่สามเสมอกับคนที่สอง → ต้องคืนค่าแค่คนที่สองและสาม", () => {
        const players: { id: string, cards: Card[] }[] = [
            // คนแรกลำดับชั้นต่ำ (HIGH_CARD)
            { id: "player_1", cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 7 }, { suit: 'DIAMONDS', rank: 9 }] },
            // คนที่สองลำดับชั้นสูง (PAIR)
            { id: "player_2", cards: [{ suit: 'CLUBS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }, { suit: 'SPADES', rank: 5 }] },
            // คนที่สามลำดับชั้นสูงเท่ากับคนที่สอง (PAIR)
            { id: "player_3", cards: [{ suit: 'HEARTS', rank: 14 }, { suit: 'SPADES', rank: 14 }, { suit: 'CLUBS', rank: 5 }] }
        ];

        const winners = getWinners(players);

        expect(winners).toBeInstanceOf(Array);
        expect(winners.length).toBe(2);
        expect(winners).toContain("player_2");
        expect(winners).toContain("player_3");
        expect(winners).not.toContain("player_1");
    });
});

describe("[gameLogic.calculateSplitPot] 5. แบ่งเงินให้ผู้ชนะ", () => {
    test("5.1 ผู้ชนะ 3 คน กองกลาง 1000 และ 900 → แบ่งเงินลงตัวและแจกเศษส่วนเกินให้คนแรกๆ", () => {
        const pot1 = 1000;
        const winnerIds1 = ["player_1", "player_2", "player_3"];
        const payouts1 = calculateSplitPot(pot1, winnerIds1);

        expect(payouts1["player_1"]).toBe(334);
        expect(payouts1["player_2"]).toBe(333);
        expect(payouts1["player_3"]).toBe(333);
        expect(payouts1["player_1"] + payouts1["player_2"] + payouts1["player_3"]).toBe(1000);

        const pot2 = 900;
        const winnerIds2 = ["player_A", "player_B", "player_C"];
        const payouts2 = calculateSplitPot(pot2, winnerIds2);

        expect(payouts2["player_A"]).toBe(300);
        expect(payouts2["player_B"]).toBe(300);
        expect(payouts2["player_C"]).toBe(300);
        expect(payouts2["player_A"] + payouts2["player_B"] + payouts2["player_C"]).toBe(900);
    });
});



