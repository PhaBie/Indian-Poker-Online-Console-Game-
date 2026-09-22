import { expect, test, describe } from 'bun:test';
import { expectGameErrorWithCode } from '../helpers/expectGameErrorWithCode';
import {
  WrongTurnError,
  InvalidActionError,
} from '../../../../src/server/domain/errors/GameError';
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

  test.skip('[GameState.executeSideshow] 4.10 [พักไว้หลังเดโม] → ผู้แพ้เปลี่ยนสถานะเป็น FOLDED', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0 }, [
      {
        id: 'loser',
        name: 'Loser',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { suit: 'SPADES', rank: 2 },
          { suit: 'HEARTS', rank: 3 },
          { suit: 'DIAMONDS', rank: 4 },
        ],
      },
      {
        id: 'winner',
        name: 'Winner',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { suit: 'SPADES', rank: 14 },
          { suit: 'HEARTS', rank: 14 },
          { suit: 'DIAMONDS', rank: 14 },
        ],
      },
    ]);
    const [loser, winner] = gameState.activePlayers;

    gameState.executeSideshow(loser.id, winner.id);

    expect(loser.status).toBe('FOLDED');
    expect(winner.status).toBe('ACTIVE');
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
