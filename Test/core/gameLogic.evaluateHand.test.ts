import { expect, test, describe } from 'bun:test';

import { evaluateHand } from '../../src/server/core/gameLogic';

import type { Card } from '../../src/shared/types';
import { ZodError } from 'zod';

describe('[gameLogic.evaluateHand] 1. ระบบประเมินหน้าไพ่', () => {
  test('1.1 ไพ่ทั้ง 3 ใบมีแต้มเท่ากัน → คืนค่า rank เป็น TRAIL และ rankValue เท่ากับแต้ม', () => {
    const cards: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'HEARTS', rank: 14 },
      { suit: 'DIAMONDS', rank: 14 },
    ];

    const result = evaluateHand(cards);
    expect(result.rank).toBe('TRAIL');
    expect(result.rankValue).toBe(14);
    expect(result.kickers).toBeInstanceOf(Array);
  });

  test('1.2 ไพ่เรียงกันและดอกเดียวกัน → คืนค่า rank เป็น PURE_SEQUENCE', () => {
    const cards: Card[] = [
      { suit: 'HEARTS', rank: 12 },
      { suit: 'HEARTS', rank: 13 },
      { suit: 'HEARTS', rank: 14 },
    ];

    const result = evaluateHand(cards);
    expect(result.rank).toBe('PURE_SEQUENCE');
    expect(result.rankValue).toBe(14);
  });

  test('1.3 ไพ่เรียงกันสลับดอกสลับตำแหน่ง → คืนค่า rank เป็น SEQUENCE', () => {
    const cards: Card[] = [
      { suit: 'HEARTS', rank: 3 },
      { suit: 'SPADES', rank: 4 },
      { suit: 'DIAMONDS', rank: 2 },
    ];

    const result = evaluateHand(cards);
    expect(result.rank).toBe('SEQUENCE');
    expect(result.rankValue).toBe(4);
  });

  test('1.4 ไพ่ดอกเดียวกันทั้งหมดโดยแต้มไม่เรียงกัน → คืนค่า rank เป็น COLOR', () => {
    const cards: Card[] = [
      { suit: 'CLUBS', rank: 2 },
      { suit: 'CLUBS', rank: 8 },
      { suit: 'CLUBS', rank: 10 },
    ];

    const result = evaluateHand(cards);
    expect(result.rank).toBe('COLOR');
  });

  test('1.5 ไพ่แต้มซ้ำกัน 2 ใบ → คืนค่า rank เป็น PAIR พร้อมระบุ kickers', () => {
    const cards: Card[] = [
      { suit: 'SPADES', rank: 9 },
      { suit: 'HEARTS', rank: 9 },
      { suit: 'DIAMONDS', rank: 11 },
    ];

    const result = evaluateHand(cards);
    expect(result.rank).toBe('PAIR');
    expect(result.rankValue).toBe(9);
    expect(result.kickers).toContain(11);
  });

  test('1.6 ไม่เข้าเงื่อนไขใดเลย → คืนค่า rank เป็น HIGH_CARD พร้อมเรียง kickers จากมากไปน้อย', () => {
    const cards: Card[] = [
      { suit: 'SPADES', rank: 2 },
      { suit: 'HEARTS', rank: 7 },
      { suit: 'DIAMONDS', rank: 13 },
    ];

    const result = evaluateHand(cards);
    expect(result.rank).toBe('HIGH_CARD');
    expect(result.rankValue).toBe(13);
    expect(result.kickers).toEqual([7, 2]);
  });

  test('1.7 ไพ่ A-2-3 → คืนค่า rank เป็น SEQUENCE', () => {
    const cards: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'HEARTS', rank: 2 },
      { suit: 'DIAMONDS', rank: 3 },
    ];

    const result = evaluateHand(cards);
    expect(result.rank).toBe('SEQUENCE');
  });

  test('1.8 ไพ่ A-2-3 ดอกเดียวกัน → คืนค่า rank เป็น PURE_SEQUENCE', () => {
    const cards: Card[] = [
      { suit: 'CLUBS', rank: 14 },
      { suit: 'CLUBS', rank: 2 },
      { suit: 'CLUBS', rank: 3 },
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe('PURE_SEQUENCE');
  });

  test('1.9 ไพ่ K-A-2 → ไม่คืนค่า rank เป็น SEQUENCE หรือ PURE_SEQUENCE', () => {
    const cards: Card[] = [
      { suit: 'SPADES', rank: 13 },
      { suit: 'HEARTS', rank: 14 },
      { suit: 'DIAMONDS', rank: 2 },
    ];

    const result = evaluateHand(cards);
    expect(result.rank).not.toBe('SEQUENCE');
    expect(result.rank).not.toBe('PURE_SEQUENCE');
  });

  test('1.10 สลับลำดับไพ่ในมือแล้วผลประเมินต้องเท่าเดิม (HIGH_CARD)', () => {
    const cards: Card[] = [
      { suit: 'SPADES', rank: 13 },
      { suit: 'HEARTS', rank: 7 },
      { suit: 'DIAMONDS', rank: 2 },
    ];

    const perms = [
      [cards[0], cards[1], cards[2]],
      [cards[0], cards[2], cards[1]],
      [cards[1], cards[0], cards[2]],
      [cards[1], cards[2], cards[0]],
      [cards[2], cards[0], cards[1]],
      [cards[2], cards[1], cards[0]],
    ];

    const expected = {
      rank: 'HIGH_CARD' as const,
      rankValue: 13,
      kickers: [7, 2],
    };

    for (const perm of perms) {
      expect(evaluateHand(perm)).toEqual(expected);
    }
  });

  test('1.11 ประเมินหน้าไพ่แล้วออบเจกต์ไพ่ต้นฉบับต้องไม่ถูกเปลี่ยนแปลง (Immutability)', () => {
    const originalCards: Card[] = [
      { suit: 'HEARTS', rank: 7 },
      { suit: 'SPADES', rank: 13 },
      { suit: 'DIAMONDS', rank: 2 },
    ];
    const clonedCards = structuredClone(originalCards);

    evaluateHand(originalCards);

    expect(originalCards).toEqual(clonedCards);
  });

  test('1.12 สลับลำดับไพ่ในมือสำหรับประเภทมืออื่นๆ (PAIR) แล้วผลต้องเท่าเดิม', () => {
    const cards: Card[] = [
      { suit: 'SPADES', rank: 9 },
      { suit: 'HEARTS', rank: 9 },
      { suit: 'DIAMONDS', rank: 11 },
    ];
    const perms = [
      [cards[0], cards[1], cards[2]],
      [cards[0], cards[2], cards[1]],
      [cards[1], cards[0], cards[2]],
      [cards[1], cards[2], cards[0]],
      [cards[2], cards[0], cards[1]],
      [cards[2], cards[1], cards[0]],
    ];
    const expected = { rank: 'PAIR' as const, rankValue: 9, kickers: [11] };
    for (const perm of perms) {
      expect(evaluateHand(perm)).toEqual(expected);
    }
  });

  test('1.13 สลับลำดับไพ่ในมือสำหรับประเภทมือ TRAIL แล้วผลต้องเท่าเดิม', () => {
    const cards: Card[] = [
      { suit: 'SPADES', rank: 10 },
      { suit: 'HEARTS', rank: 10 },
      { suit: 'DIAMONDS', rank: 10 },
    ];
    const perms = [
      [cards[0], cards[1], cards[2]],
      [cards[0], cards[2], cards[1]],
      [cards[1], cards[0], cards[2]],
      [cards[1], cards[2], cards[0]],
      [cards[2], cards[0], cards[1]],
      [cards[2], cards[1], cards[0]],
    ];
    const expected = { rank: 'TRAIL' as const, rankValue: 10, kickers: [] };
    for (const perm of perms) {
      expect(evaluateHand(perm)).toEqual(expected);
    }
  });

  test('1.14 สลับลำดับไพ่ในมือสำหรับประเภทมือ PURE_SEQUENCE แล้วผลต้องเท่าเดิม', () => {
    const cards: Card[] = [
      { suit: 'HEARTS', rank: 5 },
      { suit: 'HEARTS', rank: 6 },
      { suit: 'HEARTS', rank: 7 },
    ];
    const perms = [
      [cards[0], cards[1], cards[2]],
      [cards[0], cards[2], cards[1]],
      [cards[1], cards[0], cards[2]],
      [cards[1], cards[2], cards[0]],
      [cards[2], cards[0], cards[1]],
      [cards[2], cards[1], cards[0]],
    ];
    const expected = { rank: 'PURE_SEQUENCE' as const, rankValue: 7, kickers: [] };
    for (const perm of perms) {
      expect(evaluateHand(perm)).toEqual(expected);
    }
  });

  test('1.15 สลับลำดับไพ่ในมือสำหรับประเภทมือ SEQUENCE แล้วผลต้องเท่าเดิม', () => {
    const cards: Card[] = [
      { suit: 'SPADES', rank: 8 },
      { suit: 'HEARTS', rank: 9 },
      { suit: 'DIAMONDS', rank: 10 },
    ];
    const perms = [
      [cards[0], cards[1], cards[2]],
      [cards[0], cards[2], cards[1]],
      [cards[1], cards[0], cards[2]],
      [cards[1], cards[2], cards[0]],
      [cards[2], cards[0], cards[1]],
      [cards[2], cards[1], cards[0]],
    ];
    const expected = { rank: 'SEQUENCE' as const, rankValue: 10, kickers: [] };
    for (const perm of perms) {
      expect(evaluateHand(perm)).toEqual(expected);
    }
  });

  test('1.16 สลับลำดับไพ่ในมือสำหรับประเภทมือ COLOR แล้วผลต้องเท่าเดิม', () => {
    const cards: Card[] = [
      { suit: 'CLUBS', rank: 2 },
      { suit: 'CLUBS', rank: 5 },
      { suit: 'CLUBS', rank: 11 },
    ];
    const perms = [
      [cards[0], cards[1], cards[2]],
      [cards[0], cards[2], cards[1]],
      [cards[1], cards[0], cards[2]],
      [cards[1], cards[2], cards[0]],
      [cards[2], cards[0], cards[1]],
      [cards[2], cards[1], cards[0]],
    ];
    const expected = { rank: 'COLOR' as const, rankValue: 11, kickers: [5, 2] };
    for (const perm of perms) {
      expect(evaluateHand(perm)).toEqual(expected);
    }
  });
});

describe('9. Unhappy Paths (รอ Dev เชื่อม Validation เพื่อให้ Test เขียว)', () => {
  describe('9.2 evaluateHand', () => {
    test.each([
      { testDescription: 'ไม่มีไพ่ในมือ (อาร์เรย์ว่างเปล่า)', hand: [] as Card[] },
      {
        testDescription: 'จำนวนไพ่ในมือมีเพียง 1 ใบ',
        hand: [{ suit: 'SPADES', rank: 2 }] as Card[],
      },
      {
        testDescription: 'จำนวนไพ่ในมือมี 2 ใบโดยตรง',
        hand: [
          { suit: 'SPADES', rank: 2 },
          { suit: 'HEARTS', rank: 3 },
        ] as Card[],
      },
      {
        testDescription: 'จำนวนไพ่ในมือเกินกำหนด (4 ใบ)',
        hand: [
          { suit: 'SPADES', rank: 2 },
          { suit: 'HEARTS', rank: 3 },
          { suit: 'CLUBS', rank: 4 },
          { suit: 'DIAMONDS', rank: 5 },
        ] as Card[],
      },
      {
        testDescription: 'พบไพ่ที่ซ้ำกันในมือเดียวกัน',
        hand: [
          { suit: 'SPADES', rank: 2 },
          { suit: 'SPADES', rank: 2 },
          { suit: 'CLUBS', rank: 4 },
        ] as Card[],
      },
      {
        testDescription: 'พบดอกไพ่ (Suit) ที่ไม่ถูกต้อง',
        hand: [
          { suit: 'INVALID_SUIT', rank: 14 },
          { suit: 'HEARTS', rank: 13 },
          { suit: 'DIAMONDS', rank: 5 },
        ] as unknown as Card[],
      },
      {
        testDescription: 'พบแต้มไพ่ (Rank) มีค่าน้อยเกินไป (น้อยกว่า 2)',
        hand: [
          { suit: 'SPADES', rank: 1 },
          { suit: 'HEARTS', rank: 13 },
          { suit: 'DIAMONDS', rank: 5 },
        ] as Card[],
      },
      {
        testDescription: 'พบแต้มไพ่ (Rank) มีค่ามากเกินไป (มากกว่า 14)',
        hand: [
          { suit: 'SPADES', rank: 15 },
          { suit: 'HEARTS', rank: 13 },
          { suit: 'DIAMONDS', rank: 5 },
        ] as Card[],
      },
      {
        testDescription: 'พบแต้มไพ่เป็นทศนิยม',
        hand: [
          { suit: 'SPADES', rank: 2.5 },
          { suit: 'HEARTS', rank: 13 },
          { suit: 'DIAMONDS', rank: 5 },
        ] as Card[],
      },
      {
        testDescription: 'พบแต้มไพ่เป็น NaN',
        hand: [
          { suit: 'SPADES', rank: NaN },
          { suit: 'HEARTS', rank: 13 },
          { suit: 'DIAMONDS', rank: 5 },
        ] as Card[],
      },
      {
        testDescription: 'พบแต้มไพ่เป็นข้อความ (String)',
        hand: [
          { suit: 'SPADES', rank: '10' as unknown as number },
          { suit: 'HEARTS', rank: 13 },
          { suit: 'DIAMONDS', rank: 5 },
        ] as Card[],
      },
      {
        testDescription: 'ไพ่ขาดฟิลด์',
        hand: [
          { suit: 'SPADES' } as Card,
          { suit: 'HEARTS', rank: 13 },
          { suit: 'DIAMONDS', rank: 5 },
        ] as Card[],
      },
      {
        testDescription: 'ไพ่มีฟิลด์ส่วนเกิน',
        hand: [
          { suit: 'SPADES', rank: 2, extra: true } as unknown as Card,
          { suit: 'HEARTS', rank: 13 },
          { suit: 'DIAMONDS', rank: 5 },
        ] as Card[],
      },
    ])('โยน ZodError เมื่อ $testDescription', ({ hand }) => {
      const originalHand = structuredClone(hand);
      expect(() => evaluateHand(hand)).toThrow(ZodError);
      expect(hand).toEqual(originalHand);
    });

    test.each([
      { testDescription: 'Input เป็น null', hand: null as unknown as Card[] },
      { testDescription: 'Input เป็น undefined', hand: undefined as unknown as Card[] },
      {
        testDescription: 'Input เป็น object ที่ไม่ใช่ array',
        hand: { suit: 'SPADES', rank: 2 } as unknown as Card[],
      },
    ])(
      'โยน ZodError เมื่อ Input ไม่ใช่โครงสร้างที่ถูกต้อง ($testDescription)',
      ({ hand }) => {
        expect(() => evaluateHand(hand)).toThrow(ZodError);
      },
    );
  });
});
