import { expect, test, describe } from 'bun:test';
import {
  WrongTurnError,
  PlayerStateError,
  InvalidActionError,
} from '../../../../src/server/domain/errors/GameError';
import type { GameActionType } from '../../../../src/shared/types';
import { createGameStateFixture } from './fixtures/gameState.fixture';
import { expectGameErrorWithCode } from '../player/helpers/expectGameErrorWithCode';

describe('gameState.actions', () => {
  test('[GameState.processAction] 4.4 ผู้เล่น Blind ขอ CALL → หักชิปเท่า currentStake 50 เข้า Pot 150 และ currentStake คงเดิมที่ 50', () => {
    const gameState = createGameStateFixture({
      currentPlayerIndex: 0,
      currentStake: 50,
      pot: 100,
    });
    const [blindPlayer] = gameState.activePlayers;

    gameState.processAction(blindPlayer.id, 'CALL');

    expect(gameState.pot).toBe(150);
    expect(gameState.currentStake).toBe(50);
    expect(blindPlayer.chips).toBe(950);
    expect(blindPlayer.bet).toBe(50);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.processAction] 4.5 ผู้เล่น Blind ขอ RAISE ด้วย 100 → หักชิป 100 เข้า Pot 200 และ currentStake เปลี่ยนเป็น 100', () => {
    const gameState = createGameStateFixture({
      currentPlayerIndex: 0,
      currentStake: 50,
      pot: 100,
    });
    const [blindPlayer] = gameState.activePlayers;

    gameState.processAction(blindPlayer.id, 'RAISE', 100);

    expect(gameState.pot).toBe(200);
    expect(gameState.currentStake).toBe(100);
    expect(blindPlayer.chips).toBe(900);
    expect(blindPlayer.bet).toBe(100);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.processAction] 4.6 ผู้เล่น Seen ขอ CALL → หักชิป 100 เข้า Pot 200 และ currentStake คงเดิมที่ 50', () => {
    const gameState = createGameStateFixture({
      currentPlayerIndex: 0,
      currentStake: 50,
      pot: 100,
    });
    const [seenPlayer] = gameState.activePlayers;
    seenPlayer.isBlind = false;

    gameState.processAction(seenPlayer.id, 'CALL');

    expect(gameState.pot).toBe(200);
    expect(gameState.currentStake).toBe(50);
    expect(seenPlayer.chips).toBe(900);
    expect(seenPlayer.bet).toBe(100);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.processAction] 4.7 ผู้เล่น Seen ขอ RAISE ด้วย 200 → หักชิป 200 เข้า Pot 300 และ currentStake เปลี่ยนเป็น 100', () => {
    const gameState = createGameStateFixture({
      currentPlayerIndex: 0,
      currentStake: 50,
      pot: 100,
    });
    const [seenPlayer] = gameState.activePlayers;
    seenPlayer.isBlind = false;

    gameState.processAction(seenPlayer.id, 'RAISE', 200);

    expect(gameState.pot).toBe(300);
    expect(gameState.currentStake).toBe(100);
    expect(seenPlayer.chips).toBe(800);
    expect(seenPlayer.bet).toBe(200);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.processAction] 4.8 วนเทิร์นกลับมาที่ผู้เล่นเดิมแล้วขอ CALL → หักชิปเต็ม 100 เข้า Pot 350 โดยไม่หักลบยอดเดิม', () => {
    const gameState = createGameStateFixture({
      currentPlayerIndex: 0,
      currentStake: 50,
      pot: 100,
    });
    const [firstPlayer, secondPlayer] = gameState.activePlayers;

    gameState.processAction(firstPlayer.id, 'CALL');
    gameState.nextTurn();
    gameState.processAction(secondPlayer.id, 'RAISE', 100);
    gameState.nextTurn();

    gameState.processAction(firstPlayer.id, 'CALL');

    expect(gameState.pot).toBe(350);
    expect(gameState.currentStake).toBe(100);
    expect(firstPlayer.chips).toBe(850);
    expect(firstPlayer.bet).toBe(150);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.processAction] 4.23 การทำ FOLD → เปลี่ยนสถานะเป็น FOLDED ไม่คืนชิป', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0, pot: 200 }, [
      { id: 'foldingPlayer', name: 'Folding Player', status: 'ACTIVE', chips: 900 },
      { id: 'otherPlayer', name: 'Other Player', status: 'ACTIVE', chips: 900 },
    ]);
    const [foldingPlayer] = gameState.activePlayers;
    foldingPlayer.bet = 100;

    gameState.processAction(foldingPlayer.id, 'FOLD');

    expect(foldingPlayer.status).toBe('FOLDED');
    expect(foldingPlayer.chips).toBe(900);
    expect(gameState.pot).toBe(200);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.processAction] 4.24 การทำ SEEN → เปลี่ยนเป็น isBlind=false ไม่เสียเงินเพิ่ม', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0, pot: 200 }, [
      { id: 'seeingPlayer', name: 'Seeing Player', status: 'ACTIVE', chips: 900 },
      { id: 'otherPlayer', name: 'Other Player', status: 'ACTIVE', chips: 900 },
    ]);
    const [seeingPlayer] = gameState.activePlayers;
    seeingPlayer.isBlind = true;

    gameState.processAction(seeingPlayer.id, 'SEEN');

    expect(seeingPlayer.isBlind).toBe(false);
    expect(seeingPlayer.chips).toBe(900);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.processAction] 4.31 สั่งเล่น CALL นอกเทิร์นตนเอง → โยน WrongTurnError และ pot, currentPlayerIndex และ bet ของผู้ขอไม่เปลี่ยน', () => {
    const gameState = createGameStateFixture(
      {
        currentPlayerIndex: 1,
        pot: 500,
        currentStake: 50,
      },
      [
        {
          id: 'wrongTurnPlayer',
          name: 'Wrong Turn Player',
          status: 'ACTIVE',
          chips: 1000,
        },
        { id: 'currentPlayer', name: 'Current Player', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const [wrongTurnPlayer] = gameState.activePlayers;

    expect(() => {
      gameState.processAction(wrongTurnPlayer.id, 'CALL');
    }).toThrow(WrongTurnError);

    expect(gameState.pot).toBe(500);
    expect(gameState.currentPlayerIndex).toBe(1);
    expect(wrongTurnPlayer.bet).toBe(0);
  });

  test('[GameState.processAction] 4.32 ผู้เล่นที่มีสถานะ FOLDED ขอ CALL → โยน PlayerStateError', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, pot: 500, currentStake: 50 },
      [
        { id: 'foldedPlayer', name: 'Folded Player', status: 'FOLDED', chips: 1000 },
        { id: 'activePlayer', name: 'Active Player', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const [foldedPlayer] = gameState.activePlayers;

    expect(() => {
      gameState.processAction(foldedPlayer.id, 'CALL');
    }).toThrow(PlayerStateError);

    expect(gameState.pot).toBe(500);
  });

  test('[GameState.processAction] 4.34 แอคชันไม่รู้จัก → โยน Error และเงินไม่เปลี่ยน', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, pot: 500, currentStake: 50 },
      [
        { id: 'activePlayer1', name: 'Player 1', status: 'ACTIVE', chips: 1000 },
        { id: 'activePlayer2', name: 'Player 2', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const [activePlayers] = gameState.activePlayers;

    expect(() => {
      gameState.processAction(
        activePlayers.id,
        'JUMP_AROUND' as unknown as GameActionType,
      );
    }).toThrow(InvalidActionError);

    expect(gameState.pot).toBe(500);
    expect(gameState.currentStake).toBe(50);
    expect(gameState.currentPlayerIndex).toBe(0);
    expect(activePlayers.chips).toBe(1000);
    expect(activePlayers.bet).toBe(0);
    expect(activePlayers.status).toBe('ACTIVE');
  });

  test('[GameState.processAction] 4.35 ผู้เล่นที่ไม่อยู่ในห้องขอทำรายการ → โยน GameError(PLAYER_NOT_FOUND) และเงินไม่เปลี่ยน', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, pot: 500, currentStake: 50 },
      [
        { id: 'activePlayer1', name: 'Active Player 1', status: 'ACTIVE', chips: 1000 },
        { id: 'activePlayer2', name: 'Active Player 2', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const [activePlayer1, activePlayer2] = gameState.activePlayers;

    expectGameErrorWithCode(
      () => gameState.processAction('unknownPlayerId', 'FOLD'),
      'PLAYER_NOT_FOUND',
    );

    expect(gameState.pot).toBe(500);
    expect(gameState.currentStake).toBe(50);
    expect(gameState.currentPlayerIndex).toBe(0);
    expect(activePlayer1.chips).toBe(1000);
    expect(activePlayer1.bet).toBe(0);
    expect(activePlayer1.status).toBe('ACTIVE');
    expect(activePlayer2.chips).toBe(1000);
    expect(activePlayer2.bet).toBe(0);
    expect(activePlayer2.status).toBe('ACTIVE');
  });

  const invalidActionAmounts = [
    { desc: 'ค่าติดลบ', amount: -50 },
    { desc: 'ศูนย์', amount: 0 },
    { desc: 'ทศนิยม', amount: 10.5 },
    { desc: 'NaN', amount: NaN },
    { desc: 'Infinity', amount: Infinity },
    { desc: '-Infinity', amount: -Infinity },
    { desc: 'ไม่มีการส่งค่า Amount ให้ RAISE', amount: undefined },
    { desc: 'สตริง', amount: '100' as unknown as number },
    { desc: 'เกิน Safe Integer', amount: Number.MAX_SAFE_INTEGER + 1 },
  ];
  invalidActionAmounts.forEach(({ desc, amount }, idx) => {
    test(`[GameState.processAction] 4.${36 + idx} การเดิมพันยอดเงินผิดรูปแบบ (${desc}) → โยน GameError(INVALID_AMOUNT) และข้อมูลคงเดิม`, () => {
      const gameState = createGameStateFixture(
        { currentPlayerIndex: 0, pot: 500, currentStake: 50 },
        [
          { id: 'activePlayer1', name: 'Active Player 1', status: 'ACTIVE', chips: 1000 },
          { id: 'activePlayer2', name: 'Active Player 2', status: 'ACTIVE', chips: 1000 },
        ],
      );
      const [activePlayer1] = gameState.activePlayers;

      expectGameErrorWithCode(
        () => gameState.processAction(activePlayer1.id, 'RAISE', amount),
        'INVALID_AMOUNT',
      );
      expect(gameState.pot).toBe(500);
      expect(activePlayer1.chips).toBe(1000);
    });
  });

  test('[GameState.processAction] 4.45 CALL เงินไม่พอ (Blind) -> โยน GameError และเงินไม่เปลี่ยน', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 40,
          isBlind: true,
        },
        { id: 'playerTwo', name: 'Player Two', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const playerOne = gameState.activePlayers[0];

    expectGameErrorWithCode(
      () => gameState.processAction(playerOne.id, 'CALL'),
      'INSUFFICIENT_CHIPS',
    );
    expect(playerOne.chips).toBe(40);
  });

  test('[GameState.processAction] 4.46 CALL เงินไม่พอ (Seen) -> โยน GameError และเงินไม่เปลี่ยน', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 90,
          isBlind: false,
        },
        { id: 'playerTwo', name: 'Player Two', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const playerOne = gameState.activePlayers[0];

    expectGameErrorWithCode(
      () => gameState.processAction(playerOne.id, 'CALL'),
      'INSUFFICIENT_CHIPS',
    );
    expect(playerOne.chips).toBe(90);
  });

  test('[GameState.processAction] 4.47 CALL จ่ายเท่าชิปที่เหลือพอดี (All-in แบบพอดี) -> สำเร็จ', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 50,
          isBlind: true,
        },
        { id: 'playerTwo', name: 'Player Two', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const playerOne = gameState.activePlayers[0];
    gameState.processAction(playerOne.id, 'CALL');
    expect(playerOne.chips).toBe(0);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.processAction] 4.48 ผู้เล่น WAITING หรือ DISCONNECTED ขอทำ Action ไม่ได้', () => {
    // สถานการณ์ที่ 1: ผู้เล่นสถานะ WAITING อยู่ในเทิร์นของตนเอง
    const game1 = createGameStateFixture({ currentPlayerIndex: 0 }, [
      { id: 'playerOne', name: 'Player One', status: 'WAITING', chips: 1000 },
      { id: 'playerTwo', name: 'Player Two', status: 'ACTIVE', chips: 1000 },
    ]);
    expectGameErrorWithCode(
      () => game1.processAction('playerOne', 'BET', 100),
      'INVALID_ACTION',
    );

    // สถานการณ์ที่ 2: ผู้เล่นสถานะ DISCONNECTED อยู่ในเทิร์นของตนเอง
    const game2 = createGameStateFixture({ currentPlayerIndex: 0 }, [
      { id: 'playerOne', name: 'Player One', status: 'DISCONNECTED', chips: 1000 },
      { id: 'playerTwo', name: 'Player Two', status: 'ACTIVE', chips: 1000 },
    ]);
    expectGameErrorWithCode(
      () => game2.processAction('playerOne', 'BET', 100),
      'INVALID_ACTION',
    );
  });

  test('[GameState.processAction] 4.49 SEEN ซ้ำไม่เสียเงิน และแทงรอบถัดไปคิดแบบ Seen', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
        { id: 'playerTwo', name: 'Player Two', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const playerOne = gameState.activePlayers[0];

    gameState.processAction(playerOne.id, 'SEEN');
    expect(playerOne.isBlind).toBe(false);
    expect(playerOne.chips).toBe(1000);

    gameState.processAction(playerOne.id, 'SEEN');
    expect(playerOne.chips).toBe(1000);

    gameState.processAction(playerOne.id, 'CALL');
    expect(playerOne.chips).toBe(900);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.processAction] 4.50 Seen จ่ายเดิมพันแล้วหารสองเป็นทศนิยม -> โยน INVALID_AMOUNT', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: false,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
      ],
    );
    const playerOne = gameState.activePlayers[0];

    expectGameErrorWithCode(
      () => gameState.processAction(playerOne.id, 'RAISE', 105),
      'INVALID_AMOUNT',
    );
    expect(playerOne.chips).toBe(1000);
  });

  test('[GameState.processAction] 4.51 BET ด้วยยอดต่ำกว่า S (Blind) -> โยน INVALID_AMOUNT', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
      ],
    );
    expectGameErrorWithCode(
      () => gameState.processAction('playerOne', 'BET', 49),
      'INVALID_AMOUNT',
    );
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.pot).toBe(100);
    expect(gameState.currentStake).toBe(50);
  });

  test('[GameState.processAction] 4.51.1 BET ด้วยยอดสูงกว่า 2S (Blind) -> โยน INVALID_AMOUNT', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
      ],
    );
    expectGameErrorWithCode(
      () => gameState.processAction('playerOne', 'BET', 101),
      'INVALID_AMOUNT',
    );
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.pot).toBe(100);
    expect(gameState.currentStake).toBe(50);
  });

  test('[GameState.processAction] 4.51.2 BET ด้วยยอดรับได้ S ถึง 2S (Blind) -> ผ่าน', () => {
    // Stake (S) = 50 ดังนั้นขอบเขตที่รับได้สำหรับ Blind BET คือ [50, 100]
    const gameState1 = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
      ],
    );
    gameState1.processAction('playerOne', 'BET', 50);
    expect(gameState1.activePlayers[0].chips).toBe(950);
    expect(gameState1.pot).toBe(150);
    expect(gameState1.currentStake).toBe(50);

    const gameState2 = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
      ],
    );
    gameState2.processAction('playerOne', 'BET', 100);
    expect(gameState2.activePlayers[0].chips).toBe(900);
    expect(gameState2.pot).toBe(200);
    expect(gameState2.currentStake).toBe(100);
  });

  test('[GameState.processAction] 4.52 BET ด้วยยอดต่ำกว่า 2S (Seen) -> โยน INVALID_AMOUNT', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: false,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
      ],
    );
    expectGameErrorWithCode(
      () => gameState.processAction('playerOne', 'BET', 98),
      'INVALID_AMOUNT',
    );
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.pot).toBe(100);
    expect(gameState.currentStake).toBe(50);
  });

  test('[GameState.processAction] 4.52.1 BET ด้วยยอดสูงกว่า 4S (Seen) -> โยน INVALID_AMOUNT', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: false,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
      ],
    );
    expectGameErrorWithCode(
      () => gameState.processAction('playerOne', 'BET', 202),
      'INVALID_AMOUNT',
    );
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.pot).toBe(100);
    expect(gameState.currentStake).toBe(50);
  });

  test('[GameState.processAction] 4.52.2 BET ด้วยยอดคี่ทศนิยม (Seen) -> โยน INVALID_AMOUNT', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: false,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
      ],
    );
    expectGameErrorWithCode(
      () => gameState.processAction('playerOne', 'BET', 105),
      'INVALID_AMOUNT',
    );
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.pot).toBe(100);
    expect(gameState.currentStake).toBe(50);
  });

  test('[GameState.processAction] 4.52.3 BET ด้วยยอดรับได้ 2S ถึง 4S (Seen) -> ผ่าน', () => {
    // Stake (S) = 50 ดังนั้นขอบเขตที่รับได้สำหรับ Seen BET คือ [100, 200]
    const gameState1 = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: false,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
      ],
    );
    gameState1.processAction('playerOne', 'BET', 100);
    expect(gameState1.activePlayers[0].chips).toBe(900);
    expect(gameState1.pot).toBe(200);
    expect(gameState1.currentStake).toBe(50);

    const gameState2 = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: false,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
      ],
    );
    gameState2.processAction('playerOne', 'BET', 200);
    expect(gameState2.activePlayers[0].chips).toBe(800);
    expect(gameState2.pot).toBe(300);
    expect(gameState2.currentStake).toBe(100);
  });

  test('[GameState.processAction] 4.53 Overflow ตรวจสอบว่ารวม Pot แล้วต้องไม่เกิน MAX_SAFE_INTEGER', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50, pot: Number.MAX_SAFE_INTEGER - 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 100,
          isBlind: true,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 100,
          isBlind: true,
        },
      ],
    );
    const playerOne = gameState.activePlayers[0];

    // Pot ใกล้เต็มขีดจำกัด การบวกเพิ่ม 100 จะทำให้ล้น MAX_SAFE_INTEGER
    expectGameErrorWithCode(
      () => gameState.processAction(playerOne.id, 'RAISE', 100),
      'INVALID_AMOUNT',
    );
    expect(playerOne.chips).toBe(100);
    expect(gameState.pot).toBe(Number.MAX_SAFE_INTEGER - 50);
    expect(gameState.currentStake).toBe(50);
    expect(gameState.activePlayers[1].status).toBe('ACTIVE');
  });

  test('[GameState.processAction] 4.75 RAISE ของ Blind', () => {
    // Stake (S) = 50 ดังนั้นขอบเขตที่รับได้สำหรับ Blind RAISE คือ (50, 100]
    const getFix = () =>
      createGameStateFixture({ currentPlayerIndex: 0, currentStake: 50, pot: 100 }, [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
      ]);
    expectGameErrorWithCode(
      () => getFix().processAction('playerOne', 'RAISE', 50),
      'INVALID_AMOUNT',
    );
    expectGameErrorWithCode(
      () => getFix().processAction('playerOne', 'RAISE', 101),
      'INVALID_AMOUNT',
    );
    const g51 = getFix();
    g51.processAction('playerOne', 'RAISE', 51);
    expect(g51.currentStake).toBe(51);
    const g100 = getFix();
    g100.processAction('playerOne', 'RAISE', 100);
    expect(g100.currentStake).toBe(100);
  });

  test('[GameState.processAction] 4.76 RAISE ของ Seen', () => {
    // Stake (S) = 50 ดังนั้นขอบเขตที่รับได้สำหรับ Seen RAISE คือ (100, 200] และต้องเป็นเลขคู่
    const getFix = () =>
      createGameStateFixture({ currentPlayerIndex: 0, currentStake: 50, pot: 100 }, [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: false,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
      ]);
    expectGameErrorWithCode(
      () => getFix().processAction('playerOne', 'RAISE', 100),
      'INVALID_AMOUNT',
    );
    expectGameErrorWithCode(
      () => getFix().processAction('playerOne', 'RAISE', 202),
      'INVALID_AMOUNT',
    );
    const g102 = getFix();
    g102.processAction('playerOne', 'RAISE', 102);
    expect(g102.currentStake).toBe(51);
    const g200 = getFix();
    g200.processAction('playerOne', 'RAISE', 200);
    expect(g200.currentStake).toBe(100);
  });
});
