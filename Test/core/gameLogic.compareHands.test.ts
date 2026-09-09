import { expect, test, describe } from 'bun:test';

import { compareHands } from '../../src/server/core/gameLogic';

import type { Card } from '../../src/shared/types';
import { ZodError } from 'zod';

describe('[gameLogic.compareHands] 2. ระบบเปรียบเทียบเพื่อหาผู้ชนะ', () => {
  test('2.1 เปรียบเทียบไพ่ต่างลำดับชั้น → คืนค่ามากกว่า 0 เมื่อไพ่ลำดับชั้นสูงกว่าชนะ', () => {
    const handTrail: Card[] = [
      { suit: 'SPADES', rank: 2 },
      { suit: 'HEARTS', rank: 2 },
      { suit: 'DIAMONDS', rank: 2 },
    ];
    const handPureSeq: Card[] = [
      { suit: 'HEARTS', rank: 2 },
      { suit: 'HEARTS', rank: 3 },
      { suit: 'HEARTS', rank: 4 },
    ];
    const handSeq: Card[] = [
      { suit: 'SPADES', rank: 2 },
      { suit: 'HEARTS', rank: 3 },
      { suit: 'DIAMONDS', rank: 4 },
    ];
    const handColor: Card[] = [
      { suit: 'CLUBS', rank: 2 },
      { suit: 'CLUBS', rank: 5 },
      { suit: 'CLUBS', rank: 8 },
    ];
    const handPair: Card[] = [
      { suit: 'SPADES', rank: 9 },
      { suit: 'HEARTS', rank: 9 },
      { suit: 'DIAMONDS', rank: 10 },
    ];
    const handHigh: Card[] = [
      { suit: 'SPADES', rank: 2 },
      { suit: 'HEARTS', rank: 7 },
      { suit: 'DIAMONDS', rank: 13 },
    ];

    expect(compareHands(handTrail, handPureSeq)).toBeGreaterThan(0);
    expect(compareHands(handPureSeq, handSeq)).toBeGreaterThan(0);
    expect(compareHands(handSeq, handColor)).toBeGreaterThan(0);
    expect(compareHands(handColor, handPair)).toBeGreaterThan(0);
    expect(compareHands(handPair, handHigh)).toBeGreaterThan(0);
  });

  test('2.2 เปรียบเทียบไพ่คู่ระดับเดียวกันที่มีแต้มคู่เท่ากัน → ตัดสินผู้ชนะจากตัวเตะ (Kicker) ที่สูงกว่า', () => {
    const highPair: Card[] = [
      { suit: 'SPADES', rank: 9 },
      { suit: 'HEARTS', rank: 9 },
      { suit: 'DIAMONDS', rank: 14 },
    ];
    const lowPair: Card[] = [
      { suit: 'CLUBS', rank: 9 },
      { suit: 'DIAMONDS', rank: 9 },
      { suit: 'SPADES', rank: 13 },
    ];

    const result = compareHands(highPair, lowPair);
    expect(result).toBeGreaterThan(0);
  });

  test('2.3 เปรียบเทียบ HIGH_CARD ที่แต้มสูงสุดเท่ากัน → ตัดสินผู้ชนะจากไพ่ใบรองลงมา', () => {
    const handAK5: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'HEARTS', rank: 13 },
      { suit: 'DIAMONDS', rank: 5 },
    ];
    const handAQ9: Card[] = [
      { suit: 'CLUBS', rank: 14 },
      { suit: 'DIAMONDS', rank: 12 },
      { suit: 'SPADES', rank: 9 },
    ];

    const result = compareHands(handAK5, handAQ9);
    expect(result).toBeGreaterThan(0);
  });

  test('2.4 เปรียบเทียบไพ่ลำดับชั้นเดียวกัน → ตัดสินผู้ชนะจากแต้มหลักที่สูงกว่า', () => {
    const highTrail: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'HEARTS', rank: 14 },
      { suit: 'DIAMONDS', rank: 14 },
    ];
    const lowTrail: Card[] = [
      { suit: 'CLUBS', rank: 13 },
      { suit: 'SPADES', rank: 13 },
      { suit: 'HEARTS', rank: 13 },
    ];
    expect(compareHands(highTrail, lowTrail)).toBeGreaterThan(0);

    const highSeq: Card[] = [
      { suit: 'SPADES', rank: 12 },
      { suit: 'HEARTS', rank: 13 },
      { suit: 'DIAMONDS', rank: 14 },
    ];
    const lowSeq: Card[] = [
      { suit: 'CLUBS', rank: 2 },
      { suit: 'SPADES', rank: 3 },
      { suit: 'HEARTS', rank: 4 },
    ];
    expect(compareHands(highSeq, lowSeq)).toBeGreaterThan(0);
  });

  test('2.5 เปรียบเทียบ PAIR และ COLOR ที่แต้มหลักต่างกัน → ตัดสินผู้ชนะจากแต้มหลักก่อนเสมอ', () => {
    const highPair: Card[] = [
      { suit: 'SPADES', rank: 13 },
      { suit: 'HEARTS', rank: 13 },
      { suit: 'DIAMONDS', rank: 2 },
    ];
    const lowPair: Card[] = [
      { suit: 'CLUBS', rank: 12 },
      { suit: 'DIAMONDS', rank: 12 },
      { suit: 'SPADES', rank: 14 },
    ];
    expect(compareHands(highPair, lowPair)).toBeGreaterThan(0);

    const highColor: Card[] = [
      { suit: 'HEARTS', rank: 14 },
      { suit: 'HEARTS', rank: 9 },
      { suit: 'HEARTS', rank: 2 },
    ];
    const lowColor: Card[] = [
      { suit: 'SPADES', rank: 13 },
      { suit: 'SPADES', rank: 10 },
      { suit: 'SPADES', rank: 8 },
    ];
    expect(compareHands(highColor, lowColor)).toBeGreaterThan(0);
  });

  test('2.6 เปรียบเทียบ SEQUENCE ตามกฎ Pagat → ลำดับความใหญ่ A-2-3 ชนะ A-K-Q และลดหลั่นตามลำดับ', () => {
    const seqA23: Card[] = [
      { suit: 'CLUBS', rank: 14 },
      { suit: 'DIAMONDS', rank: 2 },
      { suit: 'SPADES', rank: 3 },
    ];
    const seqAKQ: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'HEARTS', rank: 13 },
      { suit: 'DIAMONDS', rank: 12 },
    ];
    const seqKQJ: Card[] = [
      { suit: 'HEARTS', rank: 13 },
      { suit: 'SPADES', rank: 12 },
      { suit: 'CLUBS', rank: 11 },
    ];
    const seq432: Card[] = [
      { suit: 'DIAMONDS', rank: 4 },
      { suit: 'CLUBS', rank: 3 },
      { suit: 'HEARTS', rank: 2 },
    ];

    expect(compareHands(seqA23, seqAKQ)).toBeGreaterThan(0);
    expect(compareHands(seqAKQ, seqKQJ)).toBeGreaterThan(0);
    expect(compareHands(seqKQJ, seq432)).toBeGreaterThan(0);
  });

  test('2.6.1 เปรียบเทียบ PURE_SEQUENCE ตามกฎ Pagat → ลำดับความใหญ่ A-2-3 ชนะ A-K-Q', () => {
    const pureSeqA23: Card[] = [
      { suit: 'CLUBS', rank: 14 },
      { suit: 'CLUBS', rank: 2 },
      { suit: 'CLUBS', rank: 3 },
    ];
    const pureSeqAKQ: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'SPADES', rank: 13 },
      { suit: 'SPADES', rank: 12 },
    ];

    expect(compareHands(pureSeqA23, pureSeqAKQ)).toBeGreaterThan(0);
  });

  test('2.7 เปรียบเทียบไพ่รูปแบบเดียวกันและแต้มเท่ากันทุกใบ → คืนค่า 0 (เสมอ)', () => {
    const handA: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'HEARTS', rank: 13 },
      { suit: 'DIAMONDS', rank: 5 },
    ];
    const handB: Card[] = [
      { suit: 'CLUBS', rank: 14 },
      { suit: 'DIAMONDS', rank: 13 },
      { suit: 'SPADES', rank: 5 },
    ];
    expect(compareHands(handA, handB)).toBe(0);
  });

  test('2.8 เปรียบเทียบ HIGH_CARD ที่มี Kicker ใบสุดท้ายต่างกัน → A-9-5 ชนะ A-9-4 และสลับคู่แล้วแพ้', () => {
    const handA95: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'HEARTS', rank: 9 },
      { suit: 'DIAMONDS', rank: 5 },
    ];
    const handA94: Card[] = [
      { suit: 'CLUBS', rank: 14 },
      { suit: 'DIAMONDS', rank: 9 },
      { suit: 'SPADES', rank: 4 },
    ];

    expect(compareHands(handA95, handA94)).toBeGreaterThan(0);
    expect(compareHands(handA94, handA95)).toBeLessThan(0);
  });
});

describe('[gameLogic.compareHands] 6. ระบบเปรียบเทียบเชิงลึก (Deep Happy Paths)', () => {
  test('6.1 เปรียบเทียบไพ่คู่ที่มี Kicker เท่ากันทุกใบ → คืนค่า 0 (เสมอ)', () => {
    const handA: Card[] = [
      { suit: 'SPADES', rank: 9 },
      { suit: 'HEARTS', rank: 9 },
      { suit: 'DIAMONDS', rank: 11 },
    ];
    const handB: Card[] = [
      { suit: 'CLUBS', rank: 9 },
      { suit: 'DIAMONDS', rank: 9 },
      { suit: 'SPADES', rank: 11 },
    ];
    expect(compareHands(handA, handB)).toBe(0);
  });

  test('6.2 เปรียบเทียบไพ่สี (COLOR) ที่ใบสูงสุดเท่ากัน ใบที่สองเท่ากัน และใบที่สามต่างกัน → ตัดสินที่ใบที่สาม', () => {
    const handA: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'SPADES', rank: 9 },
      { suit: 'SPADES', rank: 5 },
    ];
    const handB: Card[] = [
      { suit: 'CLUBS', rank: 14 },
      { suit: 'CLUBS', rank: 9 },
      { suit: 'CLUBS', rank: 4 },
    ];
    expect(compareHands(handA, handB)).toBeGreaterThan(0);
    expect(compareHands(handB, handA)).toBeLessThan(0);
  });

  test('6.2.1 เปรียบเทียบไพ่สี (COLOR) ที่ใบสูงสุดเท่ากัน แต่ใบที่สองต่างกัน → ตัดสินที่ใบที่สอง', () => {
    const handA: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'SPADES', rank: 9 },
      { suit: 'SPADES', rank: 5 },
    ];
    const handB: Card[] = [
      { suit: 'HEARTS', rank: 14 },
      { suit: 'HEARTS', rank: 8 },
      { suit: 'HEARTS', rank: 6 },
    ];
    expect(compareHands(handA, handB)).toBeGreaterThan(0);
    expect(compareHands(handB, handA)).toBeLessThan(0);
  });

  test('6.3 สลับตำแหน่งมือซ้ายขวาในการเปรียบเทียบ → ผลลัพธ์ต้องตรงข้ามกัน (ถ้า A > B แล้ว B < A)', () => {
    const handA: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'HEARTS', rank: 14 },
      { suit: 'DIAMONDS', rank: 14 },
    ];
    const handB: Card[] = [
      { suit: 'CLUBS', rank: 2 },
      { suit: 'DIAMONDS', rank: 2 },
      { suit: 'SPADES', rank: 2 },
    ];
    const resultAB = compareHands(handA, handB);
    const resultBA = compareHands(handB, handA);

    expect(resultAB).toBeGreaterThan(0);
    expect(resultBA).toBeLessThan(0);
  });

  test('6.4 เสมอแบบ TRAIL (หน้าไพ่แต้มเท่ากัน ดอกต่างกัน)', () => {
    const handA: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'HEARTS', rank: 14 },
      { suit: 'DIAMONDS', rank: 14 },
    ];
    const handB: Card[] = [
      { suit: 'CLUBS', rank: 14 },
      { suit: 'SPADES', rank: 14 },
      { suit: 'HEARTS', rank: 14 },
    ];
    expect(compareHands(handA, handB)).toBe(0);
  });

  test('6.5 เสมอแบบ PURE_SEQUENCE (แต้มเท่ากัน ดอกต่างกัน)', () => {
    const handA: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'SPADES', rank: 2 },
      { suit: 'SPADES', rank: 3 },
    ];
    const handB: Card[] = [
      { suit: 'HEARTS', rank: 14 },
      { suit: 'HEARTS', rank: 2 },
      { suit: 'HEARTS', rank: 3 },
    ];
    expect(compareHands(handA, handB)).toBe(0);
  });

  test('6.6 เสมอแบบ SEQUENCE (แต้มเท่ากัน สลับดอก)', () => {
    const handA: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'HEARTS', rank: 2 },
      { suit: 'DIAMONDS', rank: 3 },
    ];
    const handB: Card[] = [
      { suit: 'CLUBS', rank: 14 },
      { suit: 'SPADES', rank: 2 },
      { suit: 'HEARTS', rank: 3 },
    ];
    expect(compareHands(handA, handB)).toBe(0);
  });

  test('6.7 เสมอแบบ COLOR (แต้มเท่ากัน ดอกต่างกัน)', () => {
    const handA: Card[] = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'SPADES', rank: 9 },
      { suit: 'SPADES', rank: 5 },
    ];
    const handB: Card[] = [
      { suit: 'HEARTS', rank: 14 },
      { suit: 'HEARTS', rank: 9 },
      { suit: 'HEARTS', rank: 5 },
    ];
    expect(compareHands(handA, handB)).toBe(0);
  });

  test('6.8 การเรียก compareHands ไม่เปลี่ยนแปลงข้อมูล Input เดิม (Immutability)', () => {
    const handA: Card[] = [
      { suit: 'HEARTS', rank: 9 },
      { suit: 'SPADES', rank: 14 },
      { suit: 'DIAMONDS', rank: 5 },
    ];
    const handB: Card[] = [
      { suit: 'DIAMONDS', rank: 9 },
      { suit: 'CLUBS', rank: 14 },
      { suit: 'SPADES', rank: 4 },
    ];

    const cloneA = structuredClone(handA);
    const cloneB = structuredClone(handB);

    compareHands(handA, handB);

    expect(handA).toEqual(cloneA);
    expect(handB).toEqual(cloneB);
  });
});

describe('9. Unhappy Paths (รอ Dev เชื่อม Validation เพื่อให้ Test เขียว)', () => {
  describe('9.3 compareHands', () => {
    const validHand: Card[] = [
      { suit: 'SPADES', rank: 2 },
      { suit: 'HEARTS', rank: 3 },
      { suit: 'CLUBS', rank: 4 },
    ];
    const invalidHandLength: Card[] = [
      { suit: 'SPADES', rank: 2 },
      { suit: 'HEARTS', rank: 3 },
    ];
    const invalidHandDuplicate: Card[] = [
      { suit: 'SPADES', rank: 2 },
      { suit: 'SPADES', rank: 2 },
      { suit: 'CLUBS', rank: 4 },
    ];
    const invalidHandStructure: Card[] = [
      { suit: 'INVALID_SUIT', rank: 14 } as unknown as Card,
      { suit: 'HEARTS', rank: 14 },
      { suit: 'DIAMONDS', rank: 14 },
    ];

    test.each([
      {
        testDescription: 'มือไพ่แรกผิดรูปแบบ (จำนวนไม่ครบ)',
        firstHand: invalidHandLength,
        secondHand: validHand,
      },
      {
        testDescription: 'มือไพ่ที่สองผิดรูปแบบ (จำนวนไม่ครบ)',
        firstHand: validHand,
        secondHand: invalidHandLength,
      },
      {
        testDescription: 'ผิดรูปแบบทั้งสองฝั่ง (จำนวนไม่ครบ)',
        firstHand: invalidHandLength,
        secondHand: invalidHandLength,
      },
      {
        testDescription: 'มือไพ่แรกมีไพ่ซ้ำ',
        firstHand: invalidHandDuplicate,
        secondHand: validHand,
      },
      {
        testDescription: 'มือไพ่ที่สองมีไพ่ซ้ำ',
        firstHand: validHand,
        secondHand: invalidHandDuplicate,
      },
      {
        testDescription: 'มีไพ่ซ้ำทั้งสองฝั่ง',
        firstHand: invalidHandDuplicate,
        secondHand: invalidHandDuplicate,
      },
      {
        testDescription: 'มือไพ่แรกมีโครงสร้างผิด (invalid vs valid)',
        firstHand: invalidHandStructure,
        secondHand: validHand,
      },
      {
        testDescription: 'มือไพ่ที่สองมีโครงสร้างผิด (valid vs invalid)',
        firstHand: validHand,
        secondHand: invalidHandStructure,
      },
      {
        testDescription: 'โครงสร้างผิดทั้งสองฝั่ง',
        firstHand: invalidHandStructure,
        secondHand: invalidHandStructure,
      },
    ])('โยน ZodError เมื่อ $testDescription', ({ firstHand, secondHand }) => {
      const cloneFirst = structuredClone(firstHand);
      const cloneSecond = structuredClone(secondHand);
      expect(() => compareHands(firstHand, secondHand)).toThrow(ZodError);
      expect(firstHand).toEqual(cloneFirst);
      expect(secondHand).toEqual(cloneSecond);
    });

    test.each([
      {
        testDescription: 'มือไพ่แรกเป็น null',
        firstHand: null as unknown as Card[],
        secondHand: validHand,
      },
      {
        testDescription: 'มือไพ่แรกเป็น undefined',
        firstHand: undefined as unknown as Card[],
        secondHand: validHand,
      },
      {
        testDescription: 'มือไพ่ที่สองเป็น null',
        firstHand: validHand,
        secondHand: null as unknown as Card[],
      },
      {
        testDescription: 'มือไพ่ที่สองเป็น undefined',
        firstHand: validHand,
        secondHand: undefined as unknown as Card[],
      },
      {
        testDescription: 'ผิดประเภททั้งสองฝั่ง',
        firstHand: null as unknown as Card[],
        secondHand: undefined as unknown as Card[],
      },
    ])(
      'โยน ZodError เมื่อ Input ไม่ใช่โครงสร้างที่ถูกต้อง ($testDescription)',
      ({ firstHand, secondHand }) => {
        expect(() => compareHands(firstHand, secondHand)).toThrow(ZodError);
      },
    );
  });
});
