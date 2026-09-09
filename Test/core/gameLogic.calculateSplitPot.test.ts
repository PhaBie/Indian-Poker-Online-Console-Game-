import { expect, test, describe } from 'bun:test';

import { calculateSplitPot } from '../../src/server/core/gameLogic';

import { ZodError } from 'zod';

describe('[gameLogic.calculateSplitPot] 5. แบ่งเงินให้ผู้ชนะ', () => {
  test('5.1 ผู้ชนะ 3 คน กองกลาง 1000 และ 900 → แบ่งเงินลงตัวและแจกเศษส่วนเกินให้คนแรกๆ', () => {
    const pot1 = 1000;
    const winnerIds1 = ['player_1', 'player_2', 'player_3'];
    const payouts1 = calculateSplitPot(pot1, winnerIds1);

    expect(payouts1['player_1']).toBe(334);
    expect(payouts1['player_2']).toBe(333);
    expect(payouts1['player_3']).toBe(333);
    expect(payouts1['player_1'] + payouts1['player_2'] + payouts1['player_3']).toBe(1000);

    const pot2 = 900;
    const winnerIds2 = ['player_A', 'player_B', 'player_C'];
    const payouts2 = calculateSplitPot(pot2, winnerIds2);

    expect(payouts2['player_A']).toBe(300);
    expect(payouts2['player_B']).toBe(300);
    expect(payouts2['player_C']).toBe(300);
    expect(payouts2['player_A'] + payouts2['player_B'] + payouts2['player_C']).toBe(900);
  });
});

describe('[gameLogic.calculateSplitPot] 8. การแบ่ง Pot เชิงลึก (Deep Happy Paths)', () => {
  test('8.1 Pot เป็น 0 และไม่มีผู้ชนะ → คืนค่าออบเจกต์ว่าง', () => {
    expect(calculateSplitPot(0, [])).toEqual({});
  });

  test('8.2 Pot เป็น 0 แต่มีผู้ชนะ → แจกให้ทุกคนคนละ 0', () => {
    expect(calculateSplitPot(0, ['p1', 'p2'])).toEqual({ p1: 0, p2: 0 });
  });

  test('8.3 ผู้ชนะคนเดียว → ได้รับกองกลางไปทั้งหมดเต็มจำนวน', () => {
    expect(calculateSplitPot(1000, ['p1'])).toEqual({ p1: 1000 });
  });

  test('8.4 Pot น้อยกว่าจำนวนผู้ชนะ → แจกเศษเป็นชิปจำนวนเต็ม', () => {
    const result = calculateSplitPot(2, ['p1', 'p2', 'p3']);
    expect(result).toEqual({ p1: 1, p2: 1, p3: 0 });
  });

  test('8.5 Pot เท่ากับ MAX_SAFE_INTEGER แจก 1 คน', () => {
    expect(calculateSplitPot(Number.MAX_SAFE_INTEGER, ['p1'])).toEqual({
      p1: Number.MAX_SAFE_INTEGER,
    });
  });

  test('8.6 ยืนยันว่า Array ผู้ชนะ (Input) ไม่ถูกเปลี่ยนแปลงหลังหักเงิน', () => {
    const winners = ['p1', 'p2'];
    const originalWinners = structuredClone(winners);
    calculateSplitPot(1000, winners);
    expect(winners).toEqual(originalWinners);
  });
});

describe('9. Unhappy Paths (รอ Dev เชื่อม Validation เพื่อให้ Test เขียว)', () => {
  describe('9.5 calculateSplitPot', () => {
    const playerOneId = 'player_one_id';

    test.each([
      {
        testDescription: 'เงินรางวัลรวม (Pot) มีค่าน้อยกว่าศูนย์ (ติดลบ)',
        potAmount: -100,
        winners: [playerOneId] as string[],
      },
      {
        testDescription: 'เงินรางวัลรวม (Pot) เป็นตัวเลขทศนิยม',
        potAmount: 100.5,
        winners: [playerOneId] as string[],
      },
      {
        testDescription: 'เงินรางวัลรวม (Pot) เป็นประเภท NaN',
        potAmount: NaN,
        winners: [playerOneId] as string[],
      },
      {
        testDescription: 'เงินรางวัลรวม (Pot) เป็น Infinity',
        potAmount: Infinity,
        winners: [playerOneId] as string[],
      },
      {
        testDescription: 'เงินรางวัลรวม (Pot) เป็น null',
        potAmount: null as unknown as number,
        winners: [playerOneId] as string[],
      },
      {
        testDescription: 'เงินรางวัลรวม (Pot) เป็น undefined',
        potAmount: undefined as unknown as number,
        winners: [playerOneId] as string[],
      },
      {
        testDescription: 'เงินรางวัลรวม (Pot) ถูกส่งมาเป็นประเภทข้อความ (String)',
        potAmount: '100' as unknown as number,
        winners: [playerOneId] as string[],
      },
      {
        testDescription:
          'เงินรางวัลรวม (Pot) มีค่าเกินขอบเขตตัวเลขปลอดภัย (MAX_SAFE_INTEGER)',
        potAmount: Number.MAX_SAFE_INTEGER + 1,
        winners: [playerOneId] as string[],
      },
      {
        testDescription: 'เงินรางวัลรวม (Pot) มีค่ามากกว่าศูนย์แต่ไม่มีรายชื่อผู้ชนะ',
        potAmount: 100,
        winners: [] as string[],
      },
      {
        testDescription: 'รายชื่อผู้ชนะมีรหัสประจำตัว (ID) ซ้ำซ้อนกัน',
        potAmount: 100,
        winners: [playerOneId, playerOneId] as string[],
      },
      {
        testDescription: 'รายชื่อผู้ชนะมีรหัสประจำตัว (ID) ว่างเปล่า',
        potAmount: 100,
        winners: [''] as string[],
      },
      {
        testDescription: 'รายชื่อผู้ชนะถูกส่งมาเป็นชนิดตัวเลข',
        potAmount: 100,
        winners: [123 as unknown as string] as string[],
      },
      {
        testDescription: 'อาร์เรย์ผู้ชนะเป็น null',
        potAmount: 100,
        winners: null as unknown as string[],
      },
      {
        testDescription: 'อาร์เรย์ผู้ชนะเป็น undefined',
        potAmount: 100,
        winners: undefined as unknown as string[],
      },
      {
        testDescription: 'อาร์เรย์ผู้ชนะเป็น Object',
        potAmount: 100,
        winners: { p1: true } as unknown as string[],
      },
    ])('โยน ZodError เมื่อ $testDescription', ({ potAmount, winners }) => {
      expect(() => calculateSplitPot(potAmount, winners)).toThrow(ZodError);
    });
  });
});
