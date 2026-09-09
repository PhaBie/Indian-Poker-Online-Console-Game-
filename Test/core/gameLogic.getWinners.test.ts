import { expect, test, describe } from 'bun:test';

import { getWinners } from '../../src/server/core/gameLogic';

import type { Card } from '../../src/shared/types';
import { ZodError } from 'zod';

describe('[gameLogic.getWinners] 4. ค้นหาผู้เล่นที่ถือมือดีที่สุด', () => {
  test('4.1 มีผู้ชนะอันดับสูงสุดคนเดียวจาก 4 คน → คืน ID ผู้ชนะเพียงคนเดียว', () => {
    const players: { id: string; cards: Card[] }[] = [
      {
        id: 'player_1',
        cards: [
          { suit: 'SPADES', rank: 2 },
          { suit: 'HEARTS', rank: 7 },
          { suit: 'DIAMONDS', rank: 13 },
        ],
      },
      {
        id: 'player_2',
        cards: [
          { suit: 'SPADES', rank: 9 },
          { suit: 'HEARTS', rank: 9 },
          { suit: 'DIAMONDS', rank: 11 },
        ],
      },
      {
        id: 'player_3',
        cards: [
          { suit: 'CLUBS', rank: 2 },
          { suit: 'CLUBS', rank: 8 },
          { suit: 'CLUBS', rank: 10 },
        ],
      },
      {
        id: 'player_4',
        cards: [
          { suit: 'SPADES', rank: 14 },
          { suit: 'HEARTS', rank: 14 },
          { suit: 'DIAMONDS', rank: 14 },
        ],
      },
    ];

    const winners = getWinners(players);

    expect(winners).toBeInstanceOf(Array);
    expect(winners.length).toBe(1);
    expect(winners[0]).toBe('player_4');
  });

  test('4.2 เมื่อผู้เล่นสองคนเสมอกันที่อันดับสูงสุด → ต้องคืน ID ทั้งสองคนและไม่รวมผู้เล่นที่แพ้', () => {
    const players: { id: string; cards: Card[] }[] = [
      {
        id: 'player_1',
        cards: [
          { suit: 'SPADES', rank: 14 },
          { suit: 'HEARTS', rank: 13 },
          { suit: 'DIAMONDS', rank: 5 },
        ],
      },
      {
        id: 'player_2',
        cards: [
          { suit: 'CLUBS', rank: 14 },
          { suit: 'DIAMONDS', rank: 13 },
          { suit: 'SPADES', rank: 5 },
        ],
      },
      {
        id: 'player_3',
        cards: [
          { suit: 'SPADES', rank: 2 },
          { suit: 'HEARTS', rank: 7 },
          { suit: 'DIAMONDS', rank: 9 },
        ],
      },
    ];

    const winners = getWinners(players);

    expect(winners).toBeInstanceOf(Array);
    expect(winners.length).toBe(2);
    expect(winners).toContain('player_1');
    expect(winners).toContain('player_2');
  });

  test('4.3 ผู้เล่นคนแรกแพ้, คนที่สองชนะ, และคนที่สามเสมอกับคนที่สอง → ต้องคืนค่าแค่คนที่สองและสาม', () => {
    const players: { id: string; cards: Card[] }[] = [
      {
        id: 'player_1',
        cards: [
          { suit: 'SPADES', rank: 2 },
          { suit: 'HEARTS', rank: 7 },
          { suit: 'DIAMONDS', rank: 9 },
        ],
      },
      {
        id: 'player_2',
        cards: [
          { suit: 'CLUBS', rank: 14 },
          { suit: 'DIAMONDS', rank: 14 },
          { suit: 'SPADES', rank: 5 },
        ],
      },
      {
        id: 'player_3',
        cards: [
          { suit: 'HEARTS', rank: 14 },
          { suit: 'SPADES', rank: 14 },
          { suit: 'CLUBS', rank: 5 },
        ],
      },
    ];

    const winners = getWinners(players);

    expect(winners).toBeInstanceOf(Array);
    expect(winners.length).toBe(2);
    expect(winners).toContain('player_2');
    expect(winners).toContain('player_3');
    expect(winners).not.toContain('player_1');
  });
});

describe('[gameLogic.getWinners] 7. การหาผู้ชนะเชิงลึก (Deep Happy Paths)', () => {
  test('7.1 สลับลำดับผู้เล่นในอาร์เรย์ → ต้องได้กลุ่มผู้ชนะคนเดิมเสมอ', () => {
    const playerOne = {
      id: 'player_one_id',
      cards: [
        { suit: 'SPADES', rank: 14 },
        { suit: 'HEARTS', rank: 13 },
        { suit: 'DIAMONDS', rank: 5 },
      ] as Card[],
    };
    const playerTwo = {
      id: 'player_two_id',
      cards: [
        { suit: 'CLUBS', rank: 14 },
        { suit: 'DIAMONDS', rank: 13 },
        { suit: 'SPADES', rank: 5 },
      ] as Card[],
    };
    const playerThree = {
      id: 'player_three_id',
      cards: [
        { suit: 'SPADES', rank: 2 },
        { suit: 'HEARTS', rank: 7 },
        { suit: 'DIAMONDS', rank: 9 },
      ] as Card[],
    };

    const winnersForward = getWinners([playerOne, playerTwo, playerThree]);
    const winnersBackward = getWinners([playerThree, playerTwo, playerOne]);
    const winnersScrambled = getWinners([playerTwo, playerThree, playerOne]);

    const expectedWinners = ['player_one_id', 'player_two_id'];

    expect([...winnersForward].sort()).toEqual([...expectedWinners].sort());
    expect([...winnersBackward].sort()).toEqual([...expectedWinners].sort());
    expect([...winnersScrambled].sort()).toEqual([...expectedWinners].sort());
  });

  test('7.2 รายการผู้เล่นว่างเปล่า → คืนค่าอาร์เรย์ว่าง', () => {
    expect(getWinners([])).toEqual([]);
  });

  test('7.2.1 มีผู้เล่นคนเดียวในวงที่มีมือถูกต้อง → ชนะ 100%', () => {
    const singlePlayer = [
      {
        id: 'p1',
        cards: [
          { suit: 'SPADES', rank: 2 },
          { suit: 'HEARTS', rank: 3 },
          { suit: 'CLUBS', rank: 4 },
        ] as Card[],
      },
    ];
    expect(getWinners(singlePlayer)).toEqual(['p1']);
  });

  test('7.2.2 ผู้เล่นทุกคนเสมอกันด้วยมือที่เกิดร่วมกันได้จริง (High Card คนละดอก) → ชนะทุกคน', () => {
    const tiePlayers = [
      {
        id: 'p1',
        cards: [
          { suit: 'SPADES', rank: 14 },
          { suit: 'HEARTS', rank: 13 },
          { suit: 'CLUBS', rank: 2 },
        ] as Card[],
      },
      {
        id: 'p2',
        cards: [
          { suit: 'HEARTS', rank: 14 },
          { suit: 'SPADES', rank: 13 },
          { suit: 'DIAMONDS', rank: 2 },
        ] as Card[],
      },
    ];
    expect(getWinners(tiePlayers).sort()).toEqual(['p1', 'p2'].sort());
  });

  test('7.3 การเรียก getWinners ไม่เปลี่ยนแปลงข้อมูล Input เดิม (Immutability)', () => {
    const players = [
      {
        id: 'player_one_id',
        cards: [
          { suit: 'HEARTS', rank: 13 },
          { suit: 'SPADES', rank: 14 },
          { suit: 'DIAMONDS', rank: 5 },
        ] as Card[],
      },
      {
        id: 'player_two_id',
        cards: [
          { suit: 'DIAMONDS', rank: 13 },
          { suit: 'CLUBS', rank: 14 },
          { suit: 'SPADES', rank: 5 },
        ] as Card[],
      },
    ];
    const originalPlayers = structuredClone(players);
    getWinners(players);
    expect(players).toEqual(originalPlayers);
  });
});

describe('9. Unhappy Paths (รอ Dev เชื่อม Validation เพื่อให้ Test เขียว)', () => {
  describe('9.4 getWinners', () => {
    const playerOneId = 'player_one_id';
    const playerTwoId = 'player_two_id';

    test('โยน ZodError เมื่อพบรหัสประจำตัวผู้เล่น (ID) ซ้ำซ้อนกันในวง', () => {
      const duplicatedIdPlayers = [
        {
          id: playerOneId,
          cards: [
            { suit: 'SPADES', rank: 2 },
            { suit: 'HEARTS', rank: 7 },
            { suit: 'DIAMONDS', rank: 13 },
          ] as Card[],
        },
        {
          id: playerOneId,
          cards: [
            { suit: 'CLUBS', rank: 2 },
            { suit: 'DIAMONDS', rank: 7 },
            { suit: 'SPADES', rank: 10 },
          ] as Card[],
        },
      ];
      const originalPlayers = structuredClone(duplicatedIdPlayers);
      expect(() => getWinners(duplicatedIdPlayers)).toThrow(ZodError);
      expect(duplicatedIdPlayers).toEqual(originalPlayers);
    });

    test('โยน ZodError เมื่อพบว่ามีไพ่ใบเดียวกันถูกถือโดยผู้เล่นหลายคน (ไพ่ซ้ำข้ามผู้เล่น)', () => {
      const overlappingCardsPlayers = [
        {
          id: playerOneId,
          cards: [
            { suit: 'SPADES', rank: 2 },
            { suit: 'HEARTS', rank: 7 },
            { suit: 'DIAMONDS', rank: 13 },
          ] as Card[],
        },
        {
          id: playerTwoId,
          cards: [
            { suit: 'SPADES', rank: 2 },
            { suit: 'CLUBS', rank: 5 },
            { suit: 'HEARTS', rank: 10 },
          ] as Card[],
        },
      ];
      const originalPlayers = structuredClone(overlappingCardsPlayers);
      expect(() => getWinners(overlappingCardsPlayers)).toThrow(ZodError);
      expect(overlappingCardsPlayers).toEqual(originalPlayers);
    });

    test('โยน ZodError แม้ว่าจะมีผู้เล่นในวงเพียงคนเดียวแต่มือไพ่ของผู้เล่นนั้นมีรูปแบบไม่ถูกต้อง', () => {
      const singlePlayerWithInvalidHand = [
        { id: playerOneId, cards: [{ suit: 'SPADES', rank: 2 }] as Card[] },
      ];
      const originalPlayers = structuredClone(singlePlayerWithInvalidHand);
      expect(() => getWinners(singlePlayerWithInvalidHand)).toThrow(ZodError);
      expect(singlePlayerWithInvalidHand).toEqual(originalPlayers);
    });

    test.each([
      {
        testDescription: 'ID ผู้เล่นว่าง (Empty string)',
        players: [
          {
            id: '',
            cards: [
              { suit: 'SPADES', rank: 2 },
              { suit: 'HEARTS', rank: 3 },
              { suit: 'CLUBS', rank: 4 },
            ] as Card[],
          },
        ] as { id: string; cards: Card[] }[],
      },
      {
        testDescription: 'ID ผิดประเภท (Number)',
        players: [
          {
            id: 123 as unknown as string,
            cards: [
              { suit: 'SPADES', rank: 2 },
              { suit: 'HEARTS', rank: 3 },
              { suit: 'CLUBS', rank: 4 },
            ] as Card[],
          },
        ] as { id: string; cards: Card[] }[],
      },
      {
        testDescription: 'ไม่มีฟิลด์ ID',
        players: [
          {
            cards: [
              { suit: 'SPADES', rank: 2 },
              { suit: 'HEARTS', rank: 3 },
              { suit: 'CLUBS', rank: 4 },
            ] as Card[],
          },
        ] as unknown as { id: string; cards: Card[] }[],
      },
    ])('โยน ZodError เมื่อ $testDescription', ({ players }) => {
      expect(() => getWinners(players)).toThrow(ZodError);
    });

    test.each([
      {
        testDescription: 'Input เป็น null',
        players: null as unknown as { id: string; cards: Card[] }[],
      },
      {
        testDescription: 'Input เป็น undefined',
        players: undefined as unknown as { id: string; cards: Card[] }[],
      },
      {
        testDescription: 'Input เป็น object ธรรมดา',
        players: { id: 'p1' } as unknown as { id: string; cards: Card[] }[],
      },
    ])(
      'โยน ZodError เมื่อ Input ไม่ใช่โครงสร้างที่ถูกต้อง ($testDescription)',
      ({ players }) => {
        expect(() => getWinners(players)).toThrow(ZodError);
      },
    );

    test('โยน ZodError เมื่อผู้เล่นที่มีไพ่ผิดรูปแบบไม่ได้อยู่ตำแหน่งแรก (ตำแหน่งที่สอง)', () => {
      const invalidSecondPlayer = [
        {
          id: playerOneId,
          cards: [
            { suit: 'SPADES', rank: 2 },
            { suit: 'HEARTS', rank: 3 },
            { suit: 'CLUBS', rank: 4 },
          ] as Card[],
        },
        { id: playerTwoId, cards: [{ suit: 'DIAMONDS', rank: 2 }] as Card[] },
      ];
      expect(() => getWinners(invalidSecondPlayer)).toThrow(ZodError);
    });
  });
});
