import { expect, test, describe } from 'bun:test';

import { createDeck, shuffleDeck, dealCards } from '../../src/server/core/gameLogic';

import type { Card } from '../../src/shared/types';
import { ZodError } from 'zod';

describe('3. ระบบจัดการสำรับไพ่และการแจกไพ่', () => {
  test('[createDeck] 3.1 สร้างสำรับใหม่ → ได้ไพ่ 52 ใบและไม่มีคู่ดอก-แต้มซ้ำ', () => {
    const deck = createDeck();
    expect(deck).toBeInstanceOf(Array);
    expect(deck.length).toBe(52);

    const uniqueCards = new Set(deck.map((card) => `${card.suit}-${card.rank}`));
    expect(uniqueCards.size).toBe(52);
  });

  test('[createDeck] 3.1.2 สร้างสำรับสองครั้ง → ต้องได้ Array และ Object ไพ่คนละ Reference (Deep new object) และประกอบด้วยไพ่ 52 ใบมาตรฐาน', () => {
    const deck1 = createDeck();
    const deck2 = createDeck();

    const suits: Card['suit'][] = ['SPADES', 'HEARTS', 'CLUBS', 'DIAMONDS'];
    const ranks: Card['rank'][] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const expectedDeck: Card[] = suits.flatMap((suit) =>
      ranks.map((rank) => ({ suit, rank })),
    );

    expect(deck1.length).toBe(52);

    const sortCards = (cards: Card[]) =>
      cards.sort((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit));
    expect(sortCards([...deck1])).toEqual(sortCards([...expectedDeck]));

    const firstDeckReferences = new Set(deck1);
    for (const card of deck2) {
      expect(firstDeckReferences.has(card)).toBe(false);
    }
  });

  test('[shuffleDeck] 3.2 สับไพ่ด้วย RNG → ต้นฉบับไม่ถูกแก้ไขและได้ไพ่เรียงใหม่ตามลำดับ RNG', () => {
    const originalDeck: Card[] = [
      { suit: 'SPADES', rank: 2 },
      { suit: 'HEARTS', rank: 3 },
      { suit: 'CLUBS', rank: 4 },
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
      { suit: 'CLUBS', rank: 4 },
    ]);

    const sortCards = (cards: Card[]) =>
      cards.sort((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit));
    expect(sortCards([...shuffledDeck])).toEqual(sortCards([...originalDeck]));
  });

  test('[shuffleDeck] 3.2.1 สำรับว่างและสำรับใบเดียว → คืนค่าสำรับเดิมได้โดยไม่พัง (Happy Path)', () => {
    expect(shuffleDeck([], () => 0)).toEqual([]);
    expect(shuffleDeck([{ suit: 'SPADES', rank: 2 }], () => 0)).toEqual([
      { suit: 'SPADES', rank: 2 },
    ]);
  });

  test('[shuffleDeck] 3.2.2 ค่า RNG ที่ขอบเขต 0 และ 0.999... → ถือเป็นค่าที่ถูกต้อง (Happy Path)', () => {
    const validDeck: Card[] = [
      { suit: 'SPADES', rank: 2 },
      { suit: 'HEARTS', rank: 3 },
    ];
    expect(() => shuffleDeck(validDeck, () => 0)).not.toThrow();
    expect(() => shuffleDeck(validDeck, () => 0.9999)).not.toThrow();
  });

  test('[dealCards] 3.3 แจกให้ 4 คน คนละ 3 ใบ → มือแรกมี 3 ใบ กองเหลือ 40 ใบ และไพ่รวมมี 52 คู่ดอก-แต้มไม่ซ้ำ', () => {
    const deck = createDeck();
    const playerCount = 4;
    const cardsPerPlayer = 3;

    const result = dealCards(deck, playerCount, cardsPerPlayer);

    expect(result.hands.length).toBe(4);
    expect(result.hands[0].length).toBe(3);
    expect(result.remainingDeck.length).toBe(52 - 4 * 3);

    const allDealtCards = result.hands.flat();
    const combinedCards = [...allDealtCards, ...result.remainingDeck];
    const uniqueCombinedCards = new Set(
      combinedCards.map((card) => `${card.suit}-${card.rank}`),
    );

    expect(uniqueCombinedCards.size).toBe(52);
  });

  test('[dealCards] 3.3.1 แจกไพ่พอดีจำนวนสำรับ (แจกหมด) → remainingDeck ต้องว่างเปล่า และทุกคนได้ไพ่คนละ 1 ใบ', () => {
    const deck = createDeck();
    const result = dealCards(deck, 52, 1);
    expect(result.hands.length).toBe(52);

    result.hands.forEach((hand) => expect(hand.length).toBe(1));

    const allDealtCards = result.hands.flat();
    const sortCards = (cards: Card[]) =>
      cards.sort((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit));
    expect(sortCards(allDealtCards)).toEqual(sortCards(createDeck()));

    expect(result.remainingDeck).toEqual([]);
  });

  test('[dealCards] 3.4 แจกไพ่ 2 คน คนละ 3 ใบ → ไพ่ถูกแจกแบบวนทีละใบ (Round-Robin)', () => {
    const mockDeck: Card[] = [
      { suit: 'SPADES', rank: 2 },
      { suit: 'HEARTS', rank: 3 },
      { suit: 'CLUBS', rank: 4 },
      { suit: 'DIAMONDS', rank: 5 },
      { suit: 'SPADES', rank: 6 },
      { suit: 'HEARTS', rank: 7 },
    ];
    const result = dealCards(mockDeck, 2, 3);

    expect(result.hands[0]).toEqual([
      { suit: 'SPADES', rank: 2 },
      { suit: 'CLUBS', rank: 4 },
      { suit: 'SPADES', rank: 6 },
    ]);
    expect(result.hands[1]).toEqual([
      { suit: 'HEARTS', rank: 3 },
      { suit: 'DIAMONDS', rank: 5 },
      { suit: 'HEARTS', rank: 7 },
    ]);
  });

  test('[dealCards] 3.5 แจกไพ่แล้วออบเจกต์สำรับต้นฉบับต้องไม่ถูกเปลี่ยนแปลง (Immutability)', () => {
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
      result.hands.forEach((hand) => expect(hand.length).toBe(3));
      expect(result.remainingDeck.length).toBe(52 - playerCount * 3);

      const allDealtCards = result.hands.flat();
      const combinedCards = [...allDealtCards, ...result.remainingDeck];

      const sortCards = (cards: Card[]) =>
        cards.sort((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit));

      expect(sortCards(combinedCards)).toEqual(sortCards(structuredClone(deck)));
    });
  }
});

describe('9. Unhappy Paths (รอ Dev เชื่อม Validation เพื่อให้ Test เขียว)', () => {
  describe('9.1 dealCards', () => {
    test.each([
      {
        testDescription: 'จำนวนผู้เล่นมีค่าน้อยกว่าศูนย์ (ติดลบ)',
        playerCount: -1,
        cardsPerPlayer: 3,
      },
      {
        testDescription: 'จำนวนผู้เล่นมีค่าเป็นศูนย์',
        playerCount: 0,
        cardsPerPlayer: 3,
      },
      {
        testDescription: 'จำนวนผู้เล่นเป็นตัวเลขทศนิยม',
        playerCount: 1.5,
        cardsPerPlayer: 3,
      },
      {
        testDescription: 'จำนวนผู้เล่นมีค่าเป็นประเภท NaN',
        playerCount: NaN,
        cardsPerPlayer: 3,
      },
      {
        testDescription: 'จำนวนผู้เล่นมีค่าเป็น Infinity',
        playerCount: Infinity,
        cardsPerPlayer: 3,
      },
      {
        testDescription: 'จำนวนผู้เล่นมีค่าเป็น -Infinity',
        playerCount: -Infinity,
        cardsPerPlayer: 3,
      },
      {
        testDescription: 'จำนวนผู้เล่นเกินค่าความปลอดภัย (MAX_SAFE_INTEGER+1)',
        playerCount: Number.MAX_SAFE_INTEGER + 1,
        cardsPerPlayer: 3,
      },
      {
        testDescription: 'จำนวนผู้เล่นถูกส่งมาเป็นประเภทข้อความ (String)',
        playerCount: '2' as unknown as number,
        cardsPerPlayer: 3,
      },

      {
        testDescription: 'จำนวนไพ่ต่อคนมีค่าน้อยกว่าศูนย์ (ติดลบ)',
        playerCount: 4,
        cardsPerPlayer: -1,
      },
      {
        testDescription: 'จำนวนไพ่ต่อคนมีค่าเป็นศูนย์',
        playerCount: 4,
        cardsPerPlayer: 0,
      },
      {
        testDescription: 'จำนวนไพ่ต่อคนเป็นตัวเลขทศนิยม',
        playerCount: 4,
        cardsPerPlayer: 1.5,
      },
      {
        testDescription: 'จำนวนไพ่ต่อคนมีค่าเป็นประเภท NaN',
        playerCount: 4,
        cardsPerPlayer: NaN,
      },
      {
        testDescription: 'จำนวนไพ่ต่อคนมีค่าเป็น Infinity',
        playerCount: 4,
        cardsPerPlayer: Infinity,
      },
      {
        testDescription: 'จำนวนไพ่ต่อคนมีค่าเป็น -Infinity',
        playerCount: 4,
        cardsPerPlayer: -Infinity,
      },
      {
        testDescription: 'จำนวนไพ่ต่อคนเกินค่าความปลอดภัย (MAX_SAFE_INTEGER+1)',
        playerCount: 4,
        cardsPerPlayer: Number.MAX_SAFE_INTEGER + 1,
      },
      {
        testDescription: 'จำนวนไพ่ต่อคนถูกส่งมาเป็นประเภทข้อความ (String)',
        playerCount: 4,
        cardsPerPlayer: '3' as unknown as number,
      },
    ])('โยน ZodError เมื่อ $testDescription', ({ playerCount, cardsPerPlayer }) => {
      const standardDeck = createDeck();
      const originalStandardDeck = structuredClone(standardDeck);
      expect(() => dealCards(standardDeck, playerCount, cardsPerPlayer)).toThrow(
        ZodError,
      );
      expect(standardDeck).toEqual(originalStandardDeck);
    });

    test('โยน ZodError เมื่อสำรับมีไพ่ไม่เพียงพอต่อการแจกให้ผู้เล่นทุกคน', () => {
      const insufficientDeck: Card[] = [{ suit: 'SPADES', rank: 2 }];
      const originalInsufficientDeck = structuredClone(insufficientDeck);
      expect(() => dealCards(insufficientDeck, 2, 3)).toThrow(ZodError);
      expect(insufficientDeck).toEqual(originalInsufficientDeck);
    });

    test('โยน ZodError เมื่อสำรับมีไพ่ที่ซ้ำซ้อนกัน', () => {
      const duplicateDeck: Card[] = [
        { suit: 'SPADES', rank: 2 },
        { suit: 'SPADES', rank: 2 },
      ];
      const originalDuplicateDeck = structuredClone(duplicateDeck);
      expect(() => dealCards(duplicateDeck, 1, 1)).toThrow(ZodError);
      expect(duplicateDeck).toEqual(originalDuplicateDeck);
    });

    test('โยน ZodError เมื่อสำรับมีไพ่ที่ผิดรูปแบบ (Invalid card)', () => {
      const invalidDeck: Card[] = [{ suit: 'INVALID_SUIT', rank: 2 } as unknown as Card];
      const originalInvalidDeck = structuredClone(invalidDeck);
      expect(() => dealCards(invalidDeck, 1, 1)).toThrow(ZodError);
      expect(invalidDeck).toEqual(originalInvalidDeck);
    });

    test.each([
      {
        testDescription: 'สำรับเป็น null',
        deck: null as unknown as Card[],
        playerCount: 1,
        cardsPerPlayer: 1,
      },
      {
        testDescription: 'สำรับเป็น undefined',
        deck: undefined as unknown as Card[],
        playerCount: 1,
        cardsPerPlayer: 1,
      },
      {
        testDescription: 'จำนวนผู้เล่นเป็น null',
        deck: createDeck(),
        playerCount: null as unknown as number,
        cardsPerPlayer: 1,
      },
      {
        testDescription: 'จำนวนไพ่ต่อคนเป็น undefined',
        deck: createDeck(),
        playerCount: 1,
        cardsPerPlayer: undefined as unknown as number,
      },
    ])(
      'โยน ZodError เมื่อ Input ไม่ใช่โครงสร้างที่ถูกต้อง ($testDescription)',
      ({ deck, playerCount, cardsPerPlayer }) => {
        expect(() => dealCards(deck, playerCount, cardsPerPlayer)).toThrow(ZodError);
      },
    );
  });

  describe('9.6 shuffleDeck', () => {
    test('โยน ZodError เมื่อตรวจพบว่าสำรับไพ่มีไพ่ที่ซ้ำซ้อนกัน', () => {
      const invalidDeck: Card[] = [
        { suit: 'SPADES', rank: 2 },
        { suit: 'SPADES', rank: 2 },
      ];
      const originalDeck = structuredClone(invalidDeck);
      expect(() => shuffleDeck(invalidDeck)).toThrow(ZodError);
      expect(invalidDeck).toEqual(originalDeck);
    });

    test('โยน ZodError เมื่อ RNG คืนค่านอกขอบเขตตั้งแต่ครั้งแรก และไม่มีการดัดแปลงสำรับไพ่', () => {
      const validDeck: Card[] = [
        { suit: 'SPADES', rank: 2 },
        { suit: 'HEARTS', rank: 3 },
      ];
      const originalDeck = structuredClone(validDeck);
      const invalidRngGenerator = () => 1.5;

      expect(() => shuffleDeck(validDeck, invalidRngGenerator)).toThrow(ZodError);
      expect(validDeck).toEqual(originalDeck);
    });

    test('โยน ZodError เมื่อ RNG คืนค่าที่ถูกต้องในรอบแรกและคืนค่านอกขอบเขตในรอบถัดไป และไม่มีการดัดแปลงสำรับไพ่', () => {
      const validDeck: Card[] = [
        { suit: 'SPADES', rank: 2 },
        { suit: 'HEARTS', rank: 3 },
        { suit: 'CLUBS', rank: 4 },
      ];
      const originalDeck = structuredClone(validDeck);
      let invocationCount = 0;
      const maliciousRngGenerator = () => {
        invocationCount++;
        if (invocationCount === 1) {
          return 0.5;
        }
        return -0.1;
      };

      expect(() => shuffleDeck(validDeck, maliciousRngGenerator)).toThrow(ZodError);
      expect(validDeck).toEqual(originalDeck);
    });

    test.each([
      { testDescription: 'RNG เป็น 1', mockRng: () => 1 },
      { testDescription: 'RNG เป็น NaN', mockRng: () => NaN },
      { testDescription: 'RNG เป็น String', mockRng: () => '0.5' as unknown as number },
      { testDescription: 'RNG เป็น Infinity', mockRng: () => Infinity },
    ])('โยน ZodError เมื่อ $testDescription', ({ mockRng }) => {
      const validDeck: Card[] = [
        { suit: 'SPADES', rank: 2 },
        { suit: 'HEARTS', rank: 3 },
      ];
      expect(() => shuffleDeck(validDeck, mockRng)).toThrow(ZodError);
    });

    test.each([
      { testDescription: 'สำรับเป็น null', deck: null as unknown as Card[] },
      { testDescription: 'สำรับเป็น undefined', deck: undefined as unknown as Card[] },
      {
        testDescription: 'สำรับเป็น Object ไม่ใช่อาร์เรย์',
        deck: { suit: 'SPADES', rank: 2 } as unknown as Card[],
      },
      {
        testDescription: 'สำรับมีไพ่ที่ผิดรูปแบบ',
        deck: [{ suit: 'INVALID_SUIT', rank: 2 } as unknown as Card] as Card[],
      },
    ])('โยน ZodError เมื่อสำรับผิดโครงสร้าง ($testDescription)', ({ deck }) => {
      expect(() => shuffleDeck(deck, () => 0.5)).toThrow(ZodError);
    });
  });
});
