import { expect, test, describe } from 'bun:test';
import { expectGameErrorWithCode } from '../helpers/expectGameErrorWithCode';
import {
  WrongTurnError,
  InvalidActionError,
} from '../../../../src/server/domain/errors/GameError';
import type { Card } from '../../../../src/shared/types';
import { createGameStateFixture } from './fixtures/gameState.fixture';

describe('gameState.show', () => {
  test('[GameState.endGame] รายงาน rank ไพ่จริงของผู้ชนะ ไม่ใช่ HIGH_CARD ตายตัว', () => {
    const gameState = createGameStateFixture({ pot: 300 }, [
      {
        id: 'trailWinner',
        name: 'Trail Winner',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { suit: 'SPADES', rank: 14 },
          { suit: 'HEARTS', rank: 14 },
          { suit: 'DIAMONDS', rank: 14 },
        ],
      },
      {
        id: 'loser',
        name: 'Loser',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { suit: 'SPADES', rank: 13 },
          { suit: 'HEARTS', rank: 8 },
          { suit: 'DIAMONDS', rank: 3 },
        ],
      },
    ]);

    const result = gameState.endGame(true);

    expect(result?.winnerIds).toEqual(['trailWinner']);
    expect(result?.winningHand).toBe('TRAIL');
  });

  test('[GameState.processAction] ผู้ท้าใช้ชิปก้อนสุดท้ายจะหมอบทันที', () => {
    const gameState = createGameStateFixture(
      { pot: 600, currentPlayerIndex: 0, currentStake: 50 },
      [
        {
          id: 'challenger',
          name: 'Challenger',
          status: 'ACTIVE',
          chips: 100,
          isBlind: false,
          cards: [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 14 },
            { suit: 'DIAMONDS', rank: 14 },
          ],
        },
        {
          id: 'thirdPlayer',
          name: 'Third Player',
          status: 'ACTIVE',
          chips: 500,
          isBlind: false,
          cards: [
            { suit: 'SPADES', rank: 9 },
            { suit: 'HEARTS', rank: 8 },
            { suit: 'DIAMONDS', rank: 7 },
          ],
        },
        {
          id: 'target',
          name: 'Target',
          status: 'ACTIVE',
          chips: 500,
          isBlind: false,
          cards: [
            { suit: 'CLUBS', rank: 2 },
            { suit: 'HEARTS', rank: 3 },
            { suit: 'DIAMONDS', rank: 4 },
          ],
        },
      ],
    );

    gameState.processAction('challenger', 'SIDESHOW');

    expect(gameState.activePlayers[0].chips).toBe(0);
    expect(gameState.activePlayers[0].status).toBe('FOLDED');
    expect(gameState.pendingSideshow).toBeNull();
  });

  const HIGH_TRAIL_CARDS: Card[] = [
    { suit: 'SPADES', rank: 14 },
    { suit: 'HEARTS', rank: 14 },
    { suit: 'DIAMONDS', rank: 14 },
  ];

  const LOW_CARDS: Card[] = [
    { suit: 'SPADES', rank: 2 },
    { suit: 'HEARTS', rank: 3 },
    { suit: 'DIAMONDS', rank: 4 },
  ];

  const TIED_CARDS_A: Card[] = [
    { suit: 'SPADES', rank: 14 },
    { suit: 'HEARTS', rank: 13 },
    { suit: 'DIAMONDS', rank: 5 },
  ];

  const TIED_CARDS_B: Card[] = [
    { suit: 'CLUBS', rank: 14 },
    { suit: 'DIAMONDS', rank: 13 },
    { suit: 'SPADES', rank: 5 },
  ];

  const createSideshowTableFixture = (overrides?: {
    pot?: number;
    currentStake?: number;
    targetCards?: Card[];
    challengerCards?: Card[];
    thirdPlayerCards?: Card[];
    targetChips?: number;
    challengerChips?: number;
    thirdPlayerChips?: number;
  }) => {
    return createGameStateFixture(
      {
        pot: overrides?.pot ?? 300,
        currentPlayerIndex: 1,
        currentStake: overrides?.currentStake ?? 50,
      },
      [
        {
          id: 'playerTarget',
          name: 'Target',
          status: 'ACTIVE',
          chips: overrides?.targetChips ?? 1000,
          isBlind: false,
          cards: overrides?.targetCards,
        },
        {
          id: 'playerChallenger',
          name: 'Challenger',
          status: 'ACTIVE',
          chips: overrides?.challengerChips ?? 1000,
          isBlind: false,
          cards: overrides?.challengerCards,
        },
        {
          id: 'playerThird',
          name: 'Third Player',
          status: 'ACTIVE',
          chips: overrides?.thirdPlayerChips ?? 1000,
          isBlind: false,
          cards: overrides?.thirdPlayerCards,
        },
      ],
    );
  };

  test('[GameState.processAction] 4.10.1 ผู้เล่น Seen ขอ Sideshow สำเร็จ → หักชิป เพิ่ม Pot และบันทึก pendingSideshow ชี้ไปยังผู้เล่นก่อนหน้า', () => {
    const initialPot = 300;
    const currentStake = 50;
    const gameState = createSideshowTableFixture({
      pot: initialPot,
      currentStake,
    });

    const isHandTerminated = gameState.processAction('playerChallenger', 'SIDESHOW');

    expect(isHandTerminated).toBe(false);
    expect(gameState.activePlayers[1].chips).toBe(900);
    expect(gameState.pot).toBe(400);
    expect(gameState.pendingSideshow).toEqual({
      challengerId: 'playerChallenger',
      targetId: 'playerTarget',
    });
  });

  test.each([
    [
      'เป้าหมายไพ่สูงกว่าชนะ → ผู้ขอหมอบ (FOLDED)',
      LOW_CARDS,
      HIGH_TRAIL_CARDS,
      'playerTarget',
      'playerChallenger',
    ],
    [
      'ผู้ขอไพ่สูงกว่าชนะ → เป้าหมายหมอบ (FOLDED)',
      HIGH_TRAIL_CARDS,
      LOW_CARDS,
      'playerChallenger',
      'playerTarget',
    ],
    [
      'หน้าไพ่เสมอกันทุกใบ → ผู้ขอเป็นฝ่ายหมอบ (FOLDED) ตามกติกา Teen Patti',
      TIED_CARDS_A,
      TIED_CARDS_B,
      'playerTarget',
      'playerChallenger',
    ],
  ])(
    '[GameState.processAction] 4.10.2 เป้าหมายยอมรับคำขอ Sideshow (%s)',
    (_scenario, challengerCards, targetCards, expectedWinnerId, expectedLoserId) => {
      const gameState = createSideshowTableFixture({
        challengerCards,
        targetCards,
      });

      gameState.processAction('playerChallenger', 'SIDESHOW');
      const isHandTerminated = gameState.processAction('playerTarget', 'ACCEPT_SIDESHOW');

      expect(isHandTerminated).toBe(false);
      expect(gameState.pendingSideshow).toBeNull();
      expect(gameState.lastSideshow?.winnerId).toBe(expectedWinnerId);
      expect(gameState.lastSideshow?.loserId).toBe(expectedLoserId);

      const winnerPlayer = gameState.activePlayers.find(
        (player) => player.id === expectedWinnerId,
      );
      const loserPlayer = gameState.activePlayers.find(
        (player) => player.id === expectedLoserId,
      );
      expect(winnerPlayer?.status).toBe('ACTIVE');
      expect(loserPlayer?.status).toBe('FOLDED');
    },
  );

  test('[GameState.processAction] 4.10.3 เป้าหมายปฏิเสธคำขอ Sideshow (REJECT_SIDESHOW) → ไม่มีผู้เล่นหมอบและไม่เปิดเผยข้อมูลไพ่', () => {
    const gameState = createSideshowTableFixture({
      targetCards: HIGH_TRAIL_CARDS,
      challengerCards: LOW_CARDS,
    });

    gameState.processAction('playerChallenger', 'SIDESHOW');
    const isHandTerminated = gameState.processAction('playerTarget', 'REJECT_SIDESHOW');

    expect(isHandTerminated).toBe(false);
    expect(gameState.pendingSideshow).toBeNull();
    expect(gameState.lastSideshow).toBeNull();
    expect(gameState.lastSideshowNotice).toEqual({
      challengerId: 'playerChallenger',
      targetId: 'playerTarget',
      outcome: 'DECLINED',
    });
    expect(gameState.activePlayers[0].status).toBe('ACTIVE');
    expect(gameState.activePlayers[1].status).toBe('ACTIVE');
    expect(gameState.activePlayers[2].status).toBe('ACTIVE');
  });

  test.each([
    [
      'ผู้เล่นที่ไม่ใช่เป้าหมายพยายามกด ACCEPT_SIDESHOW → โยน WrongTurnError',
      'playerThird',
      'ACCEPT_SIDESHOW' as const,
      WrongTurnError,
    ],
    [
      'ผู้ขอพยายามกด ACCEPT_SIDESHOW ให้ตนเอง → โยน WrongTurnError',
      'playerChallenger',
      'ACCEPT_SIDESHOW' as const,
      WrongTurnError,
    ],
    [
      'ผู้เล่นเป้าหมายพยายามทำ Action อื่นที่ไม่ใช่การตอบรับ Sideshow เช่น CALL → โยน InvalidActionError',
      'playerTarget',
      'CALL' as const,
      InvalidActionError,
    ],
    [
      'ผู้เล่นคนอื่นพยายาม FOLD ระหว่างมีคำขอค้าง → โยน InvalidActionError',
      'playerThird',
      'FOLD' as const,
      InvalidActionError,
    ],
  ])(
    '[GameState.processAction] 4.10.4 สิทธิ์การตอบรับขณะ Sideshow ค้าง (%s)',
    (_scenario, actingPlayerId, action, expectedError) => {
      const gameState = createSideshowTableFixture();
      gameState.processAction('playerChallenger', 'SIDESHOW');
      expect(() => {
        gameState.processAction(actingPlayerId, action);
      }).toThrow(expectedError);
    },
  );

  test.each([
    [
      'เหลือผู้เล่น ACTIVE เพียง 2 คน → โยน InvalidActionError',
      () =>
        createGameStateFixture({ pot: 300, currentPlayerIndex: 0, currentStake: 50 }, [
          {
            id: 'playerA',
            name: 'Player A',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: false,
          },
          {
            id: 'playerB',
            name: 'Player B',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: false,
          },
        ]),
      'playerA',
      InvalidActionError,
    ],
    [
      'ยังมีผู้เล่น ACTIVE ที่เป็น Blind อยู่ในโต๊ะ → โยน InvalidActionError',
      () =>
        createGameStateFixture({ pot: 300, currentPlayerIndex: 1, currentStake: 50 }, [
          {
            id: 'playerA',
            name: 'Player A',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: true,
          },
          {
            id: 'playerB',
            name: 'Player B',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: false,
          },
          {
            id: 'playerC',
            name: 'Player C',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: false,
          },
        ]),
      'playerB',
      InvalidActionError,
    ],
    [
      'ไม่ใช่ตาของผู้เล่นที่ขอ Sideshow → โยน WrongTurnError',
      () =>
        createGameStateFixture({ pot: 300, currentPlayerIndex: 0, currentStake: 50 }, [
          {
            id: 'playerA',
            name: 'Player A',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: false,
          },
          {
            id: 'playerB',
            name: 'Player B',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: false,
          },
          {
            id: 'playerC',
            name: 'Player C',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: false,
          },
        ]),
      'playerB',
      WrongTurnError,
    ],
  ])(
    '[GameState.processAction] 4.10.5 เงื่อนไขที่ไม่อนุญาตให้ขอ Sideshow (%s)',
    (_scenario, setup, actingPlayerId, expectedError) => {
      const gameState = setup();
      expect(() => {
        gameState.processAction(actingPlayerId, 'SIDESHOW');
      }).toThrow(expectedError);
    },
  );

  test('[GameState.processAction] 4.10.5 ผู้เล่นมีชิปไม่พอสำหรับ Sideshow (ต้องเท่ากับ currentStake * 2) → โยน INSUFFICIENT_CHIPS', () => {
    const shortStackGameState = createSideshowTableFixture({
      challengerChips: 80,
    });
    expectGameErrorWithCode(
      () => shortStackGameState.processAction('playerChallenger', 'SIDESHOW'),
      'INSUFFICIENT_CHIPS',
    );
    expect(shortStackGameState.activePlayers[1].chips).toBe(80);
    expect(shortStackGameState.pot).toBe(300);
    expect(shortStackGameState.pendingSideshow).toBeNull();
  });

  test('[GameState.processAction] 4.10.6 ผลการดวล Sideshow ทำให้เหลือผู้เล่นเพียงคนเดียว → จบรอบและจ่าย Pot ให้ผู้ชนะเพียงครั้งเดียว', () => {
    const initialPot = 500;
    const gameState = createSideshowTableFixture({
      pot: initialPot,
      targetCards: HIGH_TRAIL_CARDS,
      challengerCards: LOW_CARDS,
    });

    gameState.processAction('playerChallenger', 'SIDESHOW');
    gameState.handlePlayerDisconnect('playerThird');
    const isHandTerminated = gameState.processAction('playerTarget', 'ACCEPT_SIDESHOW');

    expect(isHandTerminated).toBe(true);
    expect(gameState.checkLastManStanding()?.id).toBe('playerTarget');

    const result = gameState.endGame();
    expect(result?.winnerIds).toEqual(['playerTarget']);
    expect(gameState.pot).toBe(0);
    expect(gameState.activePlayers[0].chips).toBe(1000 + initialPot + 100);

    const secondEndGameResult = gameState.endGame();
    expect(secondEndGameResult).toBe(result);
    expect(gameState.activePlayers[0].chips).toBe(1000 + initialPot + 100);
  });

  test('[GameState.processAction] 4.12 เหลือผู้เล่น Blind 2 คนและไพ่เสมอ → ผู้ขอจ่ายค่า SHOW และอีกคนรับกองกลางทั้งหมด', () => {
    const gameState = createGameStateFixture(
      { pot: 500, currentPlayerIndex: 0, currentStake: 100 },
      [
        {
          id: 'blindRequester',
          name: 'Blind Requester',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 13 },
            { suit: 'DIAMONDS', rank: 5 },
          ],
        },
        {
          id: 'blindTarget',
          name: 'Blind Target',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'CLUBS', rank: 14 },
            { suit: 'DIAMONDS', rank: 13 },
            { suit: 'SPADES', rank: 5 },
          ],
        },
      ],
    );
    const [blindRequester, blindTarget] = gameState.activePlayers;

    gameState.processAction(blindRequester.id, 'SHOW');

    expect(gameState.pot).toBe(0);
    expect(blindRequester.chips).toBe(900);
    expect(blindTarget.chips).toBe(1600);
  });

  test('[GameState.processAction] 4.13 ผู้เล่น Seen ขอ SHOW กับ Seen และไพ่เสมอ → ผู้ขอจ่ายค่า SHOW สองเท่า (200) และอีกคนรับกองกลางทั้งหมด', () => {
    const gameState = createGameStateFixture(
      { pot: 500, currentPlayerIndex: 0, currentStake: 100 },
      [
        {
          id: 'seenRequester',
          name: 'Seen Requester',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 13 },
            { suit: 'DIAMONDS', rank: 5 },
          ],
        },
        {
          id: 'seenTarget',
          name: 'Seen Target',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'CLUBS', rank: 14 },
            { suit: 'DIAMONDS', rank: 13 },
            { suit: 'SPADES', rank: 5 },
          ],
        },
      ],
    );
    const [seenRequester, seenTarget] = gameState.activePlayers;
    seenRequester.isBlind = false;
    seenTarget.isBlind = false;

    gameState.processAction(seenRequester.id, 'SHOW');

    expect(seenRequester.chips).toBe(800);
    expect(seenTarget.chips).toBe(1700);
  });

  test('[GameState.processAction] 4.14 ขอ SHOW เมื่อเหลือผู้เล่นมากกว่า 2 คน → โยน InvalidActionError', () => {
    const gameState = createGameStateFixture(
      { pot: 500, currentPlayerIndex: 0, currentStake: 100 },
      [
        {
          id: 'requester',
          name: 'Requester',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 13 },
            { suit: 'DIAMONDS', rank: 5 },
          ],
        },
        {
          id: 'target1',
          name: 'Target 1',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'CLUBS', rank: 14 },
            { suit: 'DIAMONDS', rank: 13 },
            { suit: 'SPADES', rank: 5 },
          ],
        },
        {
          id: 'target2',
          name: 'Target 2',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'HEARTS', rank: 2 },
            { suit: 'CLUBS', rank: 3 },
            { suit: 'DIAMONDS', rank: 4 },
          ],
        },
      ],
    );
    const [requester] = gameState.activePlayers;

    expect(() => {
      gameState.processAction(requester.id, 'SHOW');
    }).toThrow(InvalidActionError);

    expect(gameState.pot).toBe(500);
    expect(requester.chips).toBe(1000);
  });

  test('[GameState.processAction] 4.15 ขอ SHOW เมื่อไม่ใช่เทิร์นตนเอง → โยน WrongTurnError', () => {
    const gameState = createGameStateFixture(
      { pot: 500, currentPlayerIndex: 1, currentStake: 100 },
      [
        {
          id: 'waitingPlayer',
          name: 'Waiting Player',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 13 },
            { suit: 'DIAMONDS', rank: 5 },
          ],
        },
        {
          id: 'currentPlayer',
          name: 'Current Player',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'CLUBS', rank: 14 },
            { suit: 'DIAMONDS', rank: 13 },
            { suit: 'SPADES', rank: 5 },
          ],
        },
      ],
    );
    const [waitingPlayer] = gameState.activePlayers;

    expect(() => {
      gameState.processAction(waitingPlayer.id, 'SHOW');
    }).toThrow(WrongTurnError);

    expect(gameState.pot).toBe(500);
    expect(waitingPlayer.chips).toBe(1000);
  });

  test('[GameState.processAction] 4.16 ผู้เล่น Seen ขอ SHOW กับผู้เล่น Blind → โยน InvalidActionError', () => {
    const gameState = createGameStateFixture(
      { pot: 500, currentPlayerIndex: 0, currentStake: 100 },
      [
        {
          id: 'seenRequester',
          name: 'Seen Requester',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 13 },
            { suit: 'DIAMONDS', rank: 5 },
          ],
        },
        {
          id: 'blindTarget',
          name: 'Blind Target',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'CLUBS', rank: 14 },
            { suit: 'DIAMONDS', rank: 13 },
            { suit: 'SPADES', rank: 5 },
          ],
        },
      ],
    );
    const [seenRequester, blindTarget] = gameState.activePlayers;
    seenRequester.isBlind = false;
    blindTarget.isBlind = true;

    expect(() => {
      gameState.processAction(seenRequester.id, 'SHOW');
    }).toThrow(InvalidActionError);

    expect(gameState.pot).toBe(500);
    expect(seenRequester.chips).toBe(1000);
  });

  test('[GameState.requestShow] 4.25 ผู้ขอแพ้เมื่อหน้าไพ่เสมอกัน', () => {
    const gameState = createGameStateFixture(
      { pot: 500, currentPlayerIndex: 0, currentStake: 100 },
      [
        {
          id: 'requester',
          name: 'Requester',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 13 },
            { suit: 'DIAMONDS', rank: 5 },
          ],
        },
        {
          id: 'target',
          name: 'Target',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'CLUBS', rank: 14 },
            { suit: 'DIAMONDS', rank: 13 },
            { suit: 'SPADES', rank: 5 },
          ],
        },
      ],
    );
    const [requester, target] = gameState.activePlayers;

    gameState.requestShow(requester.id);

    expect(gameState.pot).toBe(0);
    expect(requester.chips).toBe(900);
    expect(target.chips).toBe(1600);
  });

  test('[GameState.requestShow] 4.46 ผู้ขอ SHOW ชนะด้วยไพ่ที่สูงกว่า → ผู้ขอรับ Pot ทั้งหมด', () => {
    const gameState = createGameStateFixture(
      { pot: 500, currentPlayerIndex: 0, currentStake: 100 },
      [
        {
          id: 'requester',
          name: 'Requester',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'SPADES', rank: 14 },
            { suit: 'HEARTS', rank: 14 },
            { suit: 'DIAMONDS', rank: 14 },
          ],
        },
        {
          id: 'target',
          name: 'Target',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { suit: 'CLUBS', rank: 2 },
            { suit: 'DIAMONDS', rank: 3 },
            { suit: 'SPADES', rank: 4 },
          ],
        },
      ],
    );
    const [requester, target] = gameState.activePlayers;
    gameState.requestShow(requester.id);

    expect(gameState.pot).toBe(0);
    expect(requester.chips).toBe(1500);
    expect(target.chips).toBe(1000);
  });

  test('[GameState.requestShow] 4.59 ผู้ขอ SHOW แพ้ด้วยไพ่ที่ต่ำกว่า (ไม่ใช่แค่เสมอ)', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { rank: 2, suit: 'SPADES' },
            { rank: 3, suit: 'SPADES' },
            { rank: 4, suit: 'SPADES' },
          ],
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          cards: [
            { rank: 14, suit: 'SPADES' },
            { rank: 14, suit: 'HEARTS' },
            { rank: 14, suit: 'DIAMONDS' },
          ],
        },
      ],
    );
    gameState.processAction('playerOne', 'SHOW');
    expect(gameState.activePlayers[0].status).toBe('FOLDED');
  });

  test('[GameState.requestShow] 4.60 Blind ขอ SHOW กับ Seen ได้', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
          cards: [
            { rank: 2, suit: 'SPADES' },
            { rank: 3, suit: 'SPADES' },
            { rank: 4, suit: 'SPADES' },
          ],
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: false,
          cards: [
            { rank: 14, suit: 'SPADES' },
            { rank: 14, suit: 'HEARTS' },
            { rank: 14, suit: 'DIAMONDS' },
          ],
        },
      ],
    );
    gameState.processAction('playerOne', 'SHOW');
    expect(gameState.activePlayers[0].chips).toBe(950);
  });

  test('[GameState.requestShow] 4.61 เงินไม่พอจ่าย SHOW ต้องไม่เปลี่ยนข้อมูล', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 40,
          isBlind: true,
          cards: [
            { rank: 2, suit: 'SPADES' },
            { rank: 3, suit: 'SPADES' },
            { rank: 4, suit: 'SPADES' },
          ],
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: false,
          cards: [
            { rank: 14, suit: 'HEARTS' },
            { rank: 14, suit: 'DIAMONDS' },
            { rank: 14, suit: 'CLUBS' },
          ],
        },
      ],
    );
    expectGameErrorWithCode(
      () => gameState.processAction('playerOne', 'SHOW'),
      'INSUFFICIENT_CHIPS',
    );
    expect(gameState.activePlayers[0].chips).toBe(40);
    expect(gameState.activePlayers[1].chips).toBe(1000);
    expect(gameState.pot).toBe(0);
  });

  test('[GameState.requestShow] 4.62 มีผู้เล่นใน Array มากกว่าสองคน แต่เหลือ ACTIVE สองคน ต้องขอ SHOW ได้', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
          cards: [
            { rank: 2, suit: 'SPADES' },
            { rank: 3, suit: 'SPADES' },
            { rank: 4, suit: 'SPADES' },
          ],
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: false,
          cards: [
            { rank: 14, suit: 'HEARTS' },
            { rank: 14, suit: 'DIAMONDS' },
            { rank: 14, suit: 'CLUBS' },
          ],
        },
        {
          id: 'playerThree',
          name: 'Player Three',
          status: 'FOLDED',
          chips: 1000,
          cards: [
            { rank: 5, suit: 'CLUBS' },
            { rank: 6, suit: 'CLUBS' },
            { rank: 7, suit: 'CLUBS' },
          ],
        },
      ],
    );
    gameState.processAction('playerOne', 'SHOW');
    expect(gameState.activePlayers[0].chips).toBe(950);
    expect(gameState.activePlayers[1].chips).toBe(1050);
    expect(gameState.pot).toBe(0);
    expect(gameState.activePlayers[0].status).toBe('FOLDED');
  });

  test('[GameState.requestShow] 4.63 เรียก requestShow() โดยตรง ไม่ผ่าน processAction()', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
          cards: [
            { rank: 2, suit: 'SPADES' },
            { rank: 3, suit: 'SPADES' },
            { rank: 4, suit: 'SPADES' },
          ],
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: false,
          cards: [
            { rank: 14, suit: 'HEARTS' },
            { rank: 14, suit: 'DIAMONDS' },
            { rank: 14, suit: 'CLUBS' },
          ],
        },
      ],
    );
    gameState.requestShow('playerOne');
    expect(gameState.activePlayers[0].chips).toBe(950);
    expect(gameState.activePlayers[1].chips).toBe(1050);
    expect(gameState.pot).toBe(0);
    expect(gameState.activePlayers[0].status).toBe('FOLDED');
  });
});
