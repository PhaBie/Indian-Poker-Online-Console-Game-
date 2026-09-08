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
import { ZodError } from "zod";

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

        const perms = [
            [cards[0], cards[1], cards[2]],
            [cards[0], cards[2], cards[1]],
            [cards[1], cards[0], cards[2]],
            [cards[1], cards[2], cards[0]],
            [cards[2], cards[0], cards[1]],
            [cards[2], cards[1], cards[0]]
        ];

        const expected = {
            rank: 'HIGH_CARD' as const,
            rankValue: 13,
            kickers: [7, 2]
        };

        for (const perm of perms) {
            expect(evaluateHand(perm)).toEqual(expected);
        }
    });

    test("1.11 ประเมินหน้าไพ่แล้วออบเจกต์ไพ่ต้นฉบับต้องไม่ถูกเปลี่ยนแปลง (Immutability)", () => {
        const originalCards: Card[] = [
            { suit: 'HEARTS', rank: 7 },
            { suit: 'SPADES', rank: 13 },
            { suit: 'DIAMONDS', rank: 2 }
        ];
        const clonedCards = structuredClone(originalCards);

        evaluateHand(originalCards);

        expect(originalCards).toEqual(clonedCards);
    });

    test("1.12 สลับลำดับไพ่ในมือสำหรับประเภทมืออื่นๆ (PAIR) แล้วผลต้องเท่าเดิม", () => {
        const cards: Card[] = [
            { suit: 'SPADES', rank: 9 },
            { suit: 'HEARTS', rank: 9 },
            { suit: 'DIAMONDS', rank: 11 }
        ];
        const perms = [
            [cards[0], cards[1], cards[2]],
            [cards[0], cards[2], cards[1]],
            [cards[1], cards[0], cards[2]],
            [cards[1], cards[2], cards[0]],
            [cards[2], cards[0], cards[1]],
            [cards[2], cards[1], cards[0]]
        ];
        const expected = { rank: 'PAIR' as const, rankValue: 9, kickers: [11] };
        for (const perm of perms) {
            expect(evaluateHand(perm)).toEqual(expected);
        }
    });

    test("1.13 สลับลำดับไพ่ในมือสำหรับประเภทมือ TRAIL แล้วผลต้องเท่าเดิม", () => {
        const cards: Card[] = [{ suit: 'SPADES', rank: 10 }, { suit: 'HEARTS', rank: 10 }, { suit: 'DIAMONDS', rank: 10 }];
        const perms = [
            [cards[0], cards[1], cards[2]], [cards[0], cards[2], cards[1]], [cards[1], cards[0], cards[2]],
            [cards[1], cards[2], cards[0]], [cards[2], cards[0], cards[1]], [cards[2], cards[1], cards[0]]
        ];
        const expected = { rank: 'TRAIL' as const, rankValue: 10, kickers: [] };
        for (const perm of perms) {
            expect(evaluateHand(perm)).toEqual(expected);
        }
    });

    test("1.14 สลับลำดับไพ่ในมือสำหรับประเภทมือ PURE_SEQUENCE แล้วผลต้องเท่าเดิม", () => {
        const cards: Card[] = [{ suit: 'HEARTS', rank: 5 }, { suit: 'HEARTS', rank: 6 }, { suit: 'HEARTS', rank: 7 }];
        const perms = [
            [cards[0], cards[1], cards[2]], [cards[0], cards[2], cards[1]], [cards[1], cards[0], cards[2]],
            [cards[1], cards[2], cards[0]], [cards[2], cards[0], cards[1]], [cards[2], cards[1], cards[0]]
        ];
        const expected = { rank: 'PURE_SEQUENCE' as const, rankValue: 7, kickers: [] };
        for (const perm of perms) {
            expect(evaluateHand(perm)).toEqual(expected);
        }
    });

    test("1.15 สลับลำดับไพ่ในมือสำหรับประเภทมือ SEQUENCE แล้วผลต้องเท่าเดิม", () => {
        const cards: Card[] = [{ suit: 'SPADES', rank: 8 }, { suit: 'HEARTS', rank: 9 }, { suit: 'DIAMONDS', rank: 10 }];
        const perms = [
            [cards[0], cards[1], cards[2]], [cards[0], cards[2], cards[1]], [cards[1], cards[0], cards[2]],
            [cards[1], cards[2], cards[0]], [cards[2], cards[0], cards[1]], [cards[2], cards[1], cards[0]]
        ];
        const expected = { rank: 'SEQUENCE' as const, rankValue: 10, kickers: [] };
        for (const perm of perms) {
            expect(evaluateHand(perm)).toEqual(expected);
        }
    });

    test("1.16 สลับลำดับไพ่ในมือสำหรับประเภทมือ COLOR แล้วผลต้องเท่าเดิม", () => {
        const cards: Card[] = [{ suit: 'CLUBS', rank: 2 }, { suit: 'CLUBS', rank: 5 }, { suit: 'CLUBS', rank: 11 }];
        const perms = [
            [cards[0], cards[1], cards[2]], [cards[0], cards[2], cards[1]], [cards[1], cards[0], cards[2]],
            [cards[1], cards[2], cards[0]], [cards[2], cards[0], cards[1]], [cards[2], cards[1], cards[0]]
        ];
        const expected = { rank: 'COLOR' as const, rankValue: 11, kickers: [5, 2] };
        for (const perm of perms) {
            expect(evaluateHand(perm)).toEqual(expected);
        }
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

    test("2.8 เปรียบเทียบ HIGH_CARD ที่มี Kicker ใบสุดท้ายต่างกัน → A-9-5 ชนะ A-9-4 และสลับคู่แล้วแพ้", () => {
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

    test("[createDeck] 3.1.2 สร้างสำรับสองครั้ง → ต้องได้ Array และ Object ไพ่คนละ Reference (Deep new object) และประกอบด้วยไพ่ 52 ใบมาตรฐาน", () => {
        const deck1 = createDeck();
        const deck2 = createDeck();

        const suits: Card['suit'][] = ['SPADES', 'HEARTS', 'CLUBS', 'DIAMONDS'];
        const ranks: Card['rank'][] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
        const expectedDeck: Card[] = suits.flatMap(suit => ranks.map(rank => ({ suit, rank })));

        expect(deck1.length).toBe(52);

        const sortCards = (cards: Card[]) => cards.sort((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit));
        expect(sortCards([...deck1])).toEqual(sortCards([...expectedDeck]));


        const firstDeckReferences = new Set(deck1);
        for (const card of deck2) {
            expect(firstDeckReferences.has(card)).toBe(false);
        }
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

        const sortCards = (cards: Card[]) => cards.sort((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit));
        expect(sortCards([...shuffledDeck])).toEqual(sortCards([...originalDeck]));
    });

    test("[shuffleDeck] 3.2.1 สำรับว่างและสำรับใบเดียว → คืนค่าสำรับเดิมได้โดยไม่พัง (Happy Path)", () => {
        expect(shuffleDeck([], () => 0)).toEqual([]);
        expect(shuffleDeck([{ suit: 'SPADES', rank: 2 }], () => 0)).toEqual([{ suit: 'SPADES', rank: 2 }]);
    });

    test("[shuffleDeck] 3.2.2 ค่า RNG ที่ขอบเขต 0 และ 0.999... → ถือเป็นค่าที่ถูกต้อง (Happy Path)", () => {
        const validDeck: Card[] = [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }];
        expect(() => shuffleDeck(validDeck, () => 0)).not.toThrow();
        expect(() => shuffleDeck(validDeck, () => 0.9999)).not.toThrow();
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

    test("[dealCards] 3.3.1 แจกไพ่พอดีจำนวนสำรับ (แจกหมด) → remainingDeck ต้องว่างเปล่า และทุกคนได้ไพ่คนละ 1 ใบ", () => {
        const deck = createDeck();
        const result = dealCards(deck, 52, 1);
        expect(result.hands.length).toBe(52);

        result.hands.forEach(hand => expect(hand.length).toBe(1));

        const allDealtCards = result.hands.flat();
        const sortCards = (cards: Card[]) => cards.sort((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit));
        expect(sortCards(allDealtCards)).toEqual(sortCards(createDeck()));

        expect(result.remainingDeck).toEqual([]);
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

    for (const playerCount of [2, 3, 4]) {
        test(`[dealCards] 3.6 แจกไพ่ ${playerCount} คน → ไพ่ในมือและไพ่ที่เหลือต้องรวมกันได้เท่ากับสำรับต้นฉบับเป๊ะ`, () => {
            const deck = createDeck();
            const result = dealCards(deck, playerCount, 3);

            expect(result.hands.length).toBe(playerCount);
            result.hands.forEach(hand => expect(hand.length).toBe(3));
            expect(result.remainingDeck.length).toBe(52 - (playerCount * 3));

            const allDealtCards = result.hands.flat();
            const combinedCards = [...allDealtCards, ...result.remainingDeck];

            const sortCards = (cards: Card[]) => cards.sort((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit));

            expect(sortCards(combinedCards)).toEqual(sortCards(structuredClone(deck)));
        });
    }
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
            { id: "player_1", cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 7 }, { suit: 'DIAMONDS', rank: 9 }] },
            { id: "player_2", cards: [{ suit: 'CLUBS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }, { suit: 'SPADES', rank: 5 }] },
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
describe("[gameLogic.compareHands] 6. ระบบเปรียบเทียบเชิงลึก (Deep Happy Paths)", () => {
    test("6.1 เปรียบเทียบไพ่คู่ที่มี Kicker เท่ากันทุกใบ → คืนค่า 0 (เสมอ)", () => {
        const handA: Card[] = [{ suit: 'SPADES', rank: 9 }, { suit: 'HEARTS', rank: 9 }, { suit: 'DIAMONDS', rank: 11 }];
        const handB: Card[] = [{ suit: 'CLUBS', rank: 9 }, { suit: 'DIAMONDS', rank: 9 }, { suit: 'SPADES', rank: 11 }];
        expect(compareHands(handA, handB)).toBe(0);
    });

    test("6.2 เปรียบเทียบไพ่สี (COLOR) ที่ใบสูงสุดเท่ากัน ใบที่สองเท่ากัน และใบที่สามต่างกัน → ตัดสินที่ใบที่สาม", () => {
        const handA: Card[] = [{ suit: 'SPADES', rank: 14 }, { suit: 'SPADES', rank: 9 }, { suit: 'SPADES', rank: 5 }];
        const handB: Card[] = [{ suit: 'CLUBS', rank: 14 }, { suit: 'CLUBS', rank: 9 }, { suit: 'CLUBS', rank: 4 }];
        expect(compareHands(handA, handB)).toBeGreaterThan(0);
        expect(compareHands(handB, handA)).toBeLessThan(0);
    });

    test("6.2.1 เปรียบเทียบไพ่สี (COLOR) ที่ใบสูงสุดเท่ากัน แต่ใบที่สองต่างกัน → ตัดสินที่ใบที่สอง", () => {
        const handA: Card[] = [{ suit: 'SPADES', rank: 14 }, { suit: 'SPADES', rank: 9 }, { suit: 'SPADES', rank: 5 }];
        const handB: Card[] = [{ suit: 'HEARTS', rank: 14 }, { suit: 'HEARTS', rank: 8 }, { suit: 'HEARTS', rank: 6 }];
        expect(compareHands(handA, handB)).toBeGreaterThan(0);
        expect(compareHands(handB, handA)).toBeLessThan(0);
    });

    test("6.3 สลับตำแหน่งมือซ้ายขวาในการเปรียบเทียบ → ผลลัพธ์ต้องตรงข้ามกัน (ถ้า A > B แล้ว B < A)", () => {
        const handA: Card[] = [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }];
        const handB: Card[] = [{ suit: 'CLUBS', rank: 2 }, { suit: 'DIAMONDS', rank: 2 }, { suit: 'SPADES', rank: 2 }];
        const resultAB = compareHands(handA, handB);
        const resultBA = compareHands(handB, handA);

        expect(resultAB).toBeGreaterThan(0);
        expect(resultBA).toBeLessThan(0);
    });

    test("6.4 เสมอแบบ TRAIL (หน้าไพ่แต้มเท่ากัน ดอกต่างกัน)", () => {
        const handA: Card[] = [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }];
        const handB: Card[] = [{ suit: 'CLUBS', rank: 14 }, { suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 14 }];
        expect(compareHands(handA, handB)).toBe(0);
    });

    test("6.5 เสมอแบบ PURE_SEQUENCE (แต้มเท่ากัน ดอกต่างกัน)", () => {
        const handA: Card[] = [{ suit: 'SPADES', rank: 14 }, { suit: 'SPADES', rank: 2 }, { suit: 'SPADES', rank: 3 }];
        const handB: Card[] = [{ suit: 'HEARTS', rank: 14 }, { suit: 'HEARTS', rank: 2 }, { suit: 'HEARTS', rank: 3 }];
        expect(compareHands(handA, handB)).toBe(0);
    });

    test("6.6 เสมอแบบ SEQUENCE (แต้มเท่ากัน สลับดอก)", () => {
        const handA: Card[] = [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 2 }, { suit: 'DIAMONDS', rank: 3 }];
        const handB: Card[] = [{ suit: 'CLUBS', rank: 14 }, { suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }];
        expect(compareHands(handA, handB)).toBe(0);
    });

    test("6.7 เสมอแบบ COLOR (แต้มเท่ากัน ดอกต่างกัน)", () => {
        const handA: Card[] = [{ suit: 'SPADES', rank: 14 }, { suit: 'SPADES', rank: 9 }, { suit: 'SPADES', rank: 5 }];
        const handB: Card[] = [{ suit: 'HEARTS', rank: 14 }, { suit: 'HEARTS', rank: 9 }, { suit: 'HEARTS', rank: 5 }];
        expect(compareHands(handA, handB)).toBe(0);
    });

    test("6.8 การเรียก compareHands ไม่เปลี่ยนแปลงข้อมูล Input เดิม (Immutability)", () => {
        const handA: Card[] = [{ suit: 'HEARTS', rank: 9 }, { suit: 'SPADES', rank: 14 }, { suit: 'DIAMONDS', rank: 5 }];
        const handB: Card[] = [{ suit: 'DIAMONDS', rank: 9 }, { suit: 'CLUBS', rank: 14 }, { suit: 'SPADES', rank: 4 }];

        const cloneA = structuredClone(handA);
        const cloneB = structuredClone(handB);

        compareHands(handA, handB);

        expect(handA).toEqual(cloneA);
        expect(handB).toEqual(cloneB);
    });
});

describe("[gameLogic.getWinners] 7. การหาผู้ชนะเชิงลึก (Deep Happy Paths)", () => {
    test("7.1 สลับลำดับผู้เล่นในอาร์เรย์ → ต้องได้กลุ่มผู้ชนะคนเดิมเสมอ", () => {
        const playerOne = { id: "player_one_id", cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] as Card[] };
        const playerTwo = { id: "player_two_id", cards: [{ suit: 'CLUBS', rank: 14 }, { suit: 'DIAMONDS', rank: 13 }, { suit: 'SPADES', rank: 5 }] as Card[] };
        const playerThree = { id: "player_three_id", cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 7 }, { suit: 'DIAMONDS', rank: 9 }] as Card[] };

        const winnersForward = getWinners([playerOne, playerTwo, playerThree]);
        const winnersBackward = getWinners([playerThree, playerTwo, playerOne]);
        const winnersScrambled = getWinners([playerTwo, playerThree, playerOne]);

        const expectedWinners = ["player_one_id", "player_two_id"];

        expect([...winnersForward].sort()).toEqual([...expectedWinners].sort());
        expect([...winnersBackward].sort()).toEqual([...expectedWinners].sort());
        expect([...winnersScrambled].sort()).toEqual([...expectedWinners].sort());
    });

    test("7.2 รายการผู้เล่นว่างเปล่า → คืนค่าอาร์เรย์ว่าง", () => {
        expect(getWinners([])).toEqual([]);
    });

    test("7.2.1 มีผู้เล่นคนเดียวในวงที่มีมือถูกต้อง → ชนะ 100%", () => {
        const singlePlayer = [{ id: "p1", cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'CLUBS', rank: 4 }] as Card[] }];
        expect(getWinners(singlePlayer)).toEqual(["p1"]);
    });

    test("7.2.2 ผู้เล่นทุกคนเสมอกันด้วยมือที่เกิดร่วมกันได้จริง (High Card คนละดอก) → ชนะทุกคน", () => {
        const tiePlayers = [
            { id: "p1", cards: [{ suit: 'SPADES', rank: 14 }, { suit: 'HEARTS', rank: 13 }, { suit: 'CLUBS', rank: 2 }] as Card[] },
            { id: "p2", cards: [{ suit: 'HEARTS', rank: 14 }, { suit: 'SPADES', rank: 13 }, { suit: 'DIAMONDS', rank: 2 }] as Card[] }
        ];
        expect(getWinners(tiePlayers).sort()).toEqual(["p1", "p2"].sort());
    });

    test("7.3 การเรียก getWinners ไม่เปลี่ยนแปลงข้อมูล Input เดิม (Immutability)", () => {
        const players = [
            { id: "player_one_id", cards: [{ suit: 'HEARTS', rank: 13 }, { suit: 'SPADES', rank: 14 }, { suit: 'DIAMONDS', rank: 5 }] as Card[] },
            { id: "player_two_id", cards: [{ suit: 'DIAMONDS', rank: 13 }, { suit: 'CLUBS', rank: 14 }, { suit: 'SPADES', rank: 5 }] as Card[] }
        ];
        const originalPlayers = structuredClone(players);
        getWinners(players);
        expect(players).toEqual(originalPlayers);
    });
});

describe("[gameLogic.calculateSplitPot] 8. การแบ่ง Pot เชิงลึก (Deep Happy Paths)", () => {
    test("8.1 Pot เป็น 0 และไม่มีผู้ชนะ → คืนค่าออบเจกต์ว่าง", () => {
        expect(calculateSplitPot(0, [])).toEqual({});
    });

    test("8.2 Pot เป็น 0 แต่มีผู้ชนะ → แจกให้ทุกคนคนละ 0", () => {
        expect(calculateSplitPot(0, ["p1", "p2"])).toEqual({ p1: 0, p2: 0 });
    });

    test("8.3 ผู้ชนะคนเดียว → ได้รับกองกลางไปทั้งหมดเต็มจำนวน", () => {
        expect(calculateSplitPot(1000, ["p1"])).toEqual({ p1: 1000 });
    });

    test("8.4 Pot น้อยกว่าจำนวนผู้ชนะ → แจกเศษเป็นชิปจำนวนเต็ม", () => {
        const result = calculateSplitPot(2, ["p1", "p2", "p3"]);
        expect(result).toEqual({ p1: 1, p2: 1, p3: 0 });
    });

    test("8.5 Pot เท่ากับ MAX_SAFE_INTEGER แจก 1 คน", () => {
        expect(calculateSplitPot(Number.MAX_SAFE_INTEGER, ["p1"])).toEqual({ p1: Number.MAX_SAFE_INTEGER });
    });

    test("8.6 ยืนยันว่า Array ผู้ชนะ (Input) ไม่ถูกเปลี่ยนแปลงหลังหักเงิน", () => {
        const winners = ["p1", "p2"];
        const originalWinners = structuredClone(winners);
        calculateSplitPot(1000, winners);
        expect(winners).toEqual(originalWinners);
    });
});

describe("9. Unhappy Paths (รอ Dev เชื่อม Validation เพื่อให้ Test เขียว)", () => {
    describe("9.1 dealCards", () => {
        test.each([
            { testDescription: "จำนวนผู้เล่นมีค่าน้อยกว่าศูนย์ (ติดลบ)", playerCount: -1, cardsPerPlayer: 3 },
            { testDescription: "จำนวนผู้เล่นมีค่าเป็นศูนย์", playerCount: 0, cardsPerPlayer: 3 },
            { testDescription: "จำนวนผู้เล่นเป็นตัวเลขทศนิยม", playerCount: 1.5, cardsPerPlayer: 3 },
            { testDescription: "จำนวนผู้เล่นมีค่าเป็นประเภท NaN", playerCount: NaN, cardsPerPlayer: 3 },
            { testDescription: "จำนวนผู้เล่นมีค่าเป็น Infinity", playerCount: Infinity, cardsPerPlayer: 3 },
            { testDescription: "จำนวนผู้เล่นมีค่าเป็น -Infinity", playerCount: -Infinity, cardsPerPlayer: 3 },
            { testDescription: "จำนวนผู้เล่นเกินค่าความปลอดภัย (MAX_SAFE_INTEGER+1)", playerCount: Number.MAX_SAFE_INTEGER + 1, cardsPerPlayer: 3 },
            { testDescription: "จำนวนผู้เล่นถูกส่งมาเป็นประเภทข้อความ (String)", playerCount: "2" as unknown as number, cardsPerPlayer: 3 },

            { testDescription: "จำนวนไพ่ต่อคนมีค่าน้อยกว่าศูนย์ (ติดลบ)", playerCount: 4, cardsPerPlayer: -1 },
            { testDescription: "จำนวนไพ่ต่อคนมีค่าเป็นศูนย์", playerCount: 4, cardsPerPlayer: 0 },
            { testDescription: "จำนวนไพ่ต่อคนเป็นตัวเลขทศนิยม", playerCount: 4, cardsPerPlayer: 1.5 },
            { testDescription: "จำนวนไพ่ต่อคนมีค่าเป็นประเภท NaN", playerCount: 4, cardsPerPlayer: NaN },
            { testDescription: "จำนวนไพ่ต่อคนมีค่าเป็น Infinity", playerCount: 4, cardsPerPlayer: Infinity },
            { testDescription: "จำนวนไพ่ต่อคนมีค่าเป็น -Infinity", playerCount: 4, cardsPerPlayer: -Infinity },
            { testDescription: "จำนวนไพ่ต่อคนเกินค่าความปลอดภัย (MAX_SAFE_INTEGER+1)", playerCount: 4, cardsPerPlayer: Number.MAX_SAFE_INTEGER + 1 },
            { testDescription: "จำนวนไพ่ต่อคนถูกส่งมาเป็นประเภทข้อความ (String)", playerCount: 4, cardsPerPlayer: "3" as unknown as number },
        ])("โยน ZodError เมื่อ $testDescription", ({ playerCount, cardsPerPlayer }) => {
            const standardDeck = createDeck();
            const originalStandardDeck = structuredClone(standardDeck);
            expect(() => dealCards(standardDeck, playerCount, cardsPerPlayer)).toThrow(ZodError);
            expect(standardDeck).toEqual(originalStandardDeck);
        });

        test("โยน ZodError เมื่อสำรับมีไพ่ไม่เพียงพอต่อการแจกให้ผู้เล่นทุกคน", () => {
            const insufficientDeck: Card[] = [{ suit: 'SPADES', rank: 2 }];
            const originalInsufficientDeck = structuredClone(insufficientDeck);
            expect(() => dealCards(insufficientDeck, 2, 3)).toThrow(ZodError);
            expect(insufficientDeck).toEqual(originalInsufficientDeck);
        });

        test("โยน ZodError เมื่อสำรับมีไพ่ที่ซ้ำซ้อนกัน", () => {
            const duplicateDeck: Card[] = [{ suit: 'SPADES', rank: 2 }, { suit: 'SPADES', rank: 2 }];
            const originalDuplicateDeck = structuredClone(duplicateDeck);
            expect(() => dealCards(duplicateDeck, 1, 1)).toThrow(ZodError);
            expect(duplicateDeck).toEqual(originalDuplicateDeck);
        });

        test("โยน ZodError เมื่อสำรับมีไพ่ที่ผิดรูปแบบ (Invalid card)", () => {
            const invalidDeck: Card[] = [{ suit: 'INVALID_SUIT', rank: 2 } as unknown as Card];
            const originalInvalidDeck = structuredClone(invalidDeck);
            expect(() => dealCards(invalidDeck, 1, 1)).toThrow(ZodError);
            expect(invalidDeck).toEqual(originalInvalidDeck);
        });

        test.each([
            { testDescription: "สำรับเป็น null", deck: null as unknown as Card[], playerCount: 1, cardsPerPlayer: 1 },
            { testDescription: "สำรับเป็น undefined", deck: undefined as unknown as Card[], playerCount: 1, cardsPerPlayer: 1 },
            { testDescription: "จำนวนผู้เล่นเป็น null", deck: createDeck(), playerCount: null as unknown as number, cardsPerPlayer: 1 },
            { testDescription: "จำนวนไพ่ต่อคนเป็น undefined", deck: createDeck(), playerCount: 1, cardsPerPlayer: undefined as unknown as number }
        ])("โยน ZodError เมื่อ Input ไม่ใช่โครงสร้างที่ถูกต้อง ($testDescription)", ({ deck, playerCount, cardsPerPlayer }) => {
            expect(() => dealCards(deck, playerCount, cardsPerPlayer)).toThrow(ZodError);
        });
    });

    describe("9.2 evaluateHand", () => {
        test.each([
            { testDescription: "ไม่มีไพ่ในมือ (อาร์เรย์ว่างเปล่า)", hand: [] as Card[] },
            { testDescription: "จำนวนไพ่ในมือมีเพียง 1 ใบ", hand: [{ suit: 'SPADES', rank: 2 }] as Card[] },
            { testDescription: "จำนวนไพ่ในมือมี 2 ใบโดยตรง", hand: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }] as Card[] },
            { testDescription: "จำนวนไพ่ในมือเกินกำหนด (4 ใบ)", hand: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'CLUBS', rank: 4 }, { suit: 'DIAMONDS', rank: 5 }] as Card[] },
            { testDescription: "พบไพ่ที่ซ้ำกันในมือเดียวกัน", hand: [{ suit: 'SPADES', rank: 2 }, { suit: 'SPADES', rank: 2 }, { suit: 'CLUBS', rank: 4 }] as Card[] },
            { testDescription: "พบดอกไพ่ (Suit) ที่ไม่ถูกต้อง", hand: [{ suit: 'INVALID_SUIT', rank: 14 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] as unknown as Card[] },
            { testDescription: "พบแต้มไพ่ (Rank) มีค่าน้อยเกินไป (น้อยกว่า 2)", hand: [{ suit: 'SPADES', rank: 1 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] as Card[] },
            { testDescription: "พบแต้มไพ่ (Rank) มีค่ามากเกินไป (มากกว่า 14)", hand: [{ suit: 'SPADES', rank: 15 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] as Card[] },
            { testDescription: "พบแต้มไพ่เป็นทศนิยม", hand: [{ suit: 'SPADES', rank: 2.5 }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] as Card[] },
            { testDescription: "พบแต้มไพ่เป็น NaN", hand: [{ suit: 'SPADES', rank: NaN }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] as Card[] },
            { testDescription: "พบแต้มไพ่เป็นข้อความ (String)", hand: [{ suit: 'SPADES', rank: "10" as unknown as number }, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] as Card[] },
            { testDescription: "ไพ่ขาดฟิลด์", hand: [{ suit: 'SPADES' } as Card, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] as Card[] },
            { testDescription: "ไพ่มีฟิลด์ส่วนเกิน", hand: [{ suit: 'SPADES', rank: 2, extra: true } as unknown as Card, { suit: 'HEARTS', rank: 13 }, { suit: 'DIAMONDS', rank: 5 }] as Card[] },
        ])("โยน ZodError เมื่อ $testDescription", ({ hand }) => {
            const originalHand = structuredClone(hand);
            expect(() => evaluateHand(hand)).toThrow(ZodError);
            expect(hand).toEqual(originalHand);
        });

        test.each([
            { testDescription: "Input เป็น null", hand: null as unknown as Card[] },
            { testDescription: "Input เป็น undefined", hand: undefined as unknown as Card[] },
            { testDescription: "Input เป็น object ที่ไม่ใช่ array", hand: { suit: 'SPADES', rank: 2 } as unknown as Card[] }
        ])("โยน ZodError เมื่อ Input ไม่ใช่โครงสร้างที่ถูกต้อง ($testDescription)", ({ hand }) => {
            expect(() => evaluateHand(hand)).toThrow(ZodError);
        });
    });

    describe("9.3 compareHands", () => {
        const validHand: Card[] = [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'CLUBS', rank: 4 }];
        const invalidHandLength: Card[] = [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }];
        const invalidHandDuplicate: Card[] = [{ suit: 'SPADES', rank: 2 }, { suit: 'SPADES', rank: 2 }, { suit: 'CLUBS', rank: 4 }];
        const invalidHandStructure: Card[] = [{ suit: 'INVALID_SUIT', rank: 14 } as unknown as Card, { suit: 'HEARTS', rank: 14 }, { suit: 'DIAMONDS', rank: 14 }];

        test.each([
            { testDescription: "มือไพ่แรกผิดรูปแบบ (จำนวนไม่ครบ)", firstHand: invalidHandLength, secondHand: validHand },
            { testDescription: "มือไพ่ที่สองผิดรูปแบบ (จำนวนไม่ครบ)", firstHand: validHand, secondHand: invalidHandLength },
            { testDescription: "ผิดรูปแบบทั้งสองฝั่ง (จำนวนไม่ครบ)", firstHand: invalidHandLength, secondHand: invalidHandLength },
            { testDescription: "มือไพ่แรกมีไพ่ซ้ำ", firstHand: invalidHandDuplicate, secondHand: validHand },
            { testDescription: "มือไพ่ที่สองมีไพ่ซ้ำ", firstHand: validHand, secondHand: invalidHandDuplicate },
            { testDescription: "มีไพ่ซ้ำทั้งสองฝั่ง", firstHand: invalidHandDuplicate, secondHand: invalidHandDuplicate },
            { testDescription: "มือไพ่แรกมีโครงสร้างผิด (invalid vs valid)", firstHand: invalidHandStructure, secondHand: validHand },
            { testDescription: "มือไพ่ที่สองมีโครงสร้างผิด (valid vs invalid)", firstHand: validHand, secondHand: invalidHandStructure },
            { testDescription: "โครงสร้างผิดทั้งสองฝั่ง", firstHand: invalidHandStructure, secondHand: invalidHandStructure },
        ])("โยน ZodError เมื่อ $testDescription", ({ firstHand, secondHand }) => {
            const cloneFirst = structuredClone(firstHand);
            const cloneSecond = structuredClone(secondHand);
            expect(() => compareHands(firstHand, secondHand)).toThrow(ZodError);
            expect(firstHand).toEqual(cloneFirst);
            expect(secondHand).toEqual(cloneSecond);
        });

        test.each([
            { testDescription: "มือไพ่แรกเป็น null", firstHand: null as unknown as Card[], secondHand: validHand },
            { testDescription: "มือไพ่แรกเป็น undefined", firstHand: undefined as unknown as Card[], secondHand: validHand },
            { testDescription: "มือไพ่ที่สองเป็น null", firstHand: validHand, secondHand: null as unknown as Card[] },
            { testDescription: "มือไพ่ที่สองเป็น undefined", firstHand: validHand, secondHand: undefined as unknown as Card[] },
            { testDescription: "ผิดประเภททั้งสองฝั่ง", firstHand: null as unknown as Card[], secondHand: undefined as unknown as Card[] },
        ])("โยน ZodError เมื่อ Input ไม่ใช่โครงสร้างที่ถูกต้อง ($testDescription)", ({ firstHand, secondHand }) => {
            expect(() => compareHands(firstHand, secondHand)).toThrow(ZodError);
        });
    });

    describe("9.4 getWinners", () => {
        const playerOneId = "player_one_id";
        const playerTwoId = "player_two_id";

        test("โยน ZodError เมื่อพบรหัสประจำตัวผู้เล่น (ID) ซ้ำซ้อนกันในวง", () => {
            const duplicatedIdPlayers = [
                { id: playerOneId, cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 7 }, { suit: 'DIAMONDS', rank: 13 }] as Card[] },
                { id: playerOneId, cards: [{ suit: 'CLUBS', rank: 2 }, { suit: 'DIAMONDS', rank: 7 }, { suit: 'SPADES', rank: 10 }] as Card[] }
            ];
            const originalPlayers = structuredClone(duplicatedIdPlayers);
            expect(() => getWinners(duplicatedIdPlayers)).toThrow(ZodError);
            expect(duplicatedIdPlayers).toEqual(originalPlayers);
        });

        test("โยน ZodError เมื่อพบว่ามีไพ่ใบเดียวกันถูกถือโดยผู้เล่นหลายคน (ไพ่ซ้ำข้ามผู้เล่น)", () => {
            const overlappingCardsPlayers = [
                { id: playerOneId, cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 7 }, { suit: 'DIAMONDS', rank: 13 }] as Card[] },
                { id: playerTwoId, cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'CLUBS', rank: 5 }, { suit: 'HEARTS', rank: 10 }] as Card[] }
            ];
            const originalPlayers = structuredClone(overlappingCardsPlayers);
            expect(() => getWinners(overlappingCardsPlayers)).toThrow(ZodError);
            expect(overlappingCardsPlayers).toEqual(originalPlayers);
        });

        test("โยน ZodError แม้ว่าจะมีผู้เล่นในวงเพียงคนเดียวแต่มือไพ่ของผู้เล่นนั้นมีรูปแบบไม่ถูกต้อง", () => {
            const singlePlayerWithInvalidHand = [
                { id: playerOneId, cards: [{ suit: 'SPADES', rank: 2 }] as Card[] }
            ];
            const originalPlayers = structuredClone(singlePlayerWithInvalidHand);
            expect(() => getWinners(singlePlayerWithInvalidHand)).toThrow(ZodError);
            expect(singlePlayerWithInvalidHand).toEqual(originalPlayers);
        });

        test.each([
            { testDescription: "ID ผู้เล่นว่าง (Empty string)", players: [{ id: "", cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'CLUBS', rank: 4 }] as Card[] }] as { id: string, cards: Card[] }[] },
            { testDescription: "ID ผิดประเภท (Number)", players: [{ id: 123 as unknown as string, cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'CLUBS', rank: 4 }] as Card[] }] as { id: string, cards: Card[] }[] },
            { testDescription: "ไม่มีฟิลด์ ID", players: [{ cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'CLUBS', rank: 4 }] as Card[] }] as unknown as { id: string, cards: Card[] }[] }
        ])("โยน ZodError เมื่อ $testDescription", ({ players }) => {
            expect(() => getWinners(players)).toThrow(ZodError);
        });

        test.each([
            { testDescription: "Input เป็น null", players: null as unknown as { id: string, cards: Card[] }[] },
            { testDescription: "Input เป็น undefined", players: undefined as unknown as { id: string, cards: Card[] }[] },
            { testDescription: "Input เป็น object ธรรมดา", players: { id: "p1" } as unknown as { id: string, cards: Card[] }[] }
        ])("โยน ZodError เมื่อ Input ไม่ใช่โครงสร้างที่ถูกต้อง ($testDescription)", ({ players }) => {
            expect(() => getWinners(players)).toThrow(ZodError);
        });

        test("โยน ZodError เมื่อผู้เล่นที่มีไพ่ผิดรูปแบบไม่ได้อยู่ตำแหน่งแรก (ตำแหน่งที่สอง)", () => {
            const invalidSecondPlayer = [
                { id: playerOneId, cards: [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'CLUBS', rank: 4 }] as Card[] },
                { id: playerTwoId, cards: [{ suit: 'DIAMONDS', rank: 2 }] as Card[] }
            ];
            expect(() => getWinners(invalidSecondPlayer)).toThrow(ZodError);
        });
    });

    describe("9.5 calculateSplitPot", () => {
        const playerOneId = "player_one_id";

        test.each([
            { testDescription: "เงินรางวัลรวม (Pot) มีค่าน้อยกว่าศูนย์ (ติดลบ)", potAmount: -100, winners: [playerOneId] as string[] },
            { testDescription: "เงินรางวัลรวม (Pot) เป็นตัวเลขทศนิยม", potAmount: 100.5, winners: [playerOneId] as string[] },
            { testDescription: "เงินรางวัลรวม (Pot) เป็นประเภท NaN", potAmount: NaN, winners: [playerOneId] as string[] },
            { testDescription: "เงินรางวัลรวม (Pot) เป็น Infinity", potAmount: Infinity, winners: [playerOneId] as string[] },
            { testDescription: "เงินรางวัลรวม (Pot) เป็น null", potAmount: null as unknown as number, winners: [playerOneId] as string[] },
            { testDescription: "เงินรางวัลรวม (Pot) เป็น undefined", potAmount: undefined as unknown as number, winners: [playerOneId] as string[] },
            { testDescription: "เงินรางวัลรวม (Pot) ถูกส่งมาเป็นประเภทข้อความ (String)", potAmount: "100" as unknown as number, winners: [playerOneId] as string[] },
            { testDescription: "เงินรางวัลรวม (Pot) มีค่าเกินขอบเขตตัวเลขปลอดภัย (MAX_SAFE_INTEGER)", potAmount: Number.MAX_SAFE_INTEGER + 1, winners: [playerOneId] as string[] },
            { testDescription: "เงินรางวัลรวม (Pot) มีค่ามากกว่าศูนย์แต่ไม่มีรายชื่อผู้ชนะ", potAmount: 100, winners: [] as string[] },
            { testDescription: "รายชื่อผู้ชนะมีรหัสประจำตัว (ID) ซ้ำซ้อนกัน", potAmount: 100, winners: [playerOneId, playerOneId] as string[] },
            { testDescription: "รายชื่อผู้ชนะมีรหัสประจำตัว (ID) ว่างเปล่า", potAmount: 100, winners: [""] as string[] },
            { testDescription: "รายชื่อผู้ชนะถูกส่งมาเป็นชนิดตัวเลข", potAmount: 100, winners: [123 as unknown as string] as string[] },
            { testDescription: "อาร์เรย์ผู้ชนะเป็น null", potAmount: 100, winners: null as unknown as string[] },
            { testDescription: "อาร์เรย์ผู้ชนะเป็น undefined", potAmount: 100, winners: undefined as unknown as string[] },
            { testDescription: "อาร์เรย์ผู้ชนะเป็น Object", potAmount: 100, winners: { p1: true } as unknown as string[] },
        ])("โยน ZodError เมื่อ $testDescription", ({ potAmount, winners }) => {
            expect(() => calculateSplitPot(potAmount, winners)).toThrow(ZodError);
        });
    });

    describe("9.6 shuffleDeck", () => {
        test("โยน ZodError เมื่อตรวจพบว่าสำรับไพ่มีไพ่ที่ซ้ำซ้อนกัน", () => {
            const invalidDeck: Card[] = [{ suit: 'SPADES', rank: 2 }, { suit: 'SPADES', rank: 2 }];
            const originalDeck = structuredClone(invalidDeck);
            expect(() => shuffleDeck(invalidDeck)).toThrow(ZodError);
            expect(invalidDeck).toEqual(originalDeck);
        });

        test("โยน ZodError เมื่อ RNG คืนค่านอกขอบเขตตั้งแต่ครั้งแรก และไม่มีการดัดแปลงสำรับไพ่", () => {
            const validDeck: Card[] = [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }];
            const originalDeck = structuredClone(validDeck);
            const invalidRngGenerator = () => 1.5;

            expect(() => shuffleDeck(validDeck, invalidRngGenerator)).toThrow(ZodError);
            expect(validDeck).toEqual(originalDeck);
        });

        test("โยน ZodError เมื่อ RNG คืนค่าที่ถูกต้องในรอบแรกและคืนค่านอกขอบเขตในรอบถัดไป และไม่มีการดัดแปลงสำรับไพ่", () => {
            const validDeck: Card[] = [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'CLUBS', rank: 4 }];
            const originalDeck = structuredClone(validDeck);
            let invocationCount = 0;
            const maliciousRngGenerator = () => {
                invocationCount++;
                if (invocationCount === 1) { return 0.5; }
                return -0.1;
            };

            expect(() => shuffleDeck(validDeck, maliciousRngGenerator)).toThrow(ZodError);
            expect(validDeck).toEqual(originalDeck);
        });

        test.each([
            { testDescription: "RNG เป็น 1", mockRng: () => 1 },
            { testDescription: "RNG เป็น NaN", mockRng: () => NaN },
            { testDescription: "RNG เป็น String", mockRng: () => "0.5" as unknown as number },
            { testDescription: "RNG เป็น Infinity", mockRng: () => Infinity }
        ])("โยน ZodError เมื่อ $testDescription", ({ mockRng }) => {
            const validDeck: Card[] = [{ suit: 'SPADES', rank: 2 }, { suit: 'HEARTS', rank: 3 }];
            expect(() => shuffleDeck(validDeck, mockRng)).toThrow(ZodError);
        });

        test.each([
            { testDescription: "สำรับเป็น null", deck: null as unknown as Card[] },
            { testDescription: "สำรับเป็น undefined", deck: undefined as unknown as Card[] },
            { testDescription: "สำรับเป็น Object ไม่ใช่อาร์เรย์", deck: { suit: 'SPADES', rank: 2 } as unknown as Card[] },
            { testDescription: "สำรับมีไพ่ที่ผิดรูปแบบ", deck: [{ suit: 'INVALID_SUIT', rank: 2 } as unknown as Card] as Card[] }
        ])("โยน ZodError เมื่อสำรับผิดโครงสร้าง ($testDescription)", ({ deck }) => {
            expect(() => shuffleDeck(deck, () => 0.5)).toThrow(ZodError);
        });
    });
});

