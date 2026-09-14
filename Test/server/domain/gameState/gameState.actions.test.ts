import { expect, test, describe } from 'bun:test';
import {
  GameError,
  WrongTurnError,
  PlayerStateError,
  InvalidActionError,
} from '../../../../src/server/domain/errors/GameError';
import type { GameActionType } from '../../../../src/shared/types';
import { createGameStateFixture } from './fixtures/gameState.fixture';

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
        { id: `activePlayer1`, name: `Player 1`, status: `ACTIVE`, chips: 1000 },
        { id: `activePlayer2`, name: `Player 2`, status: `ACTIVE`, chips: 1000 },
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

    let caughtError: GameError | undefined;
    try {
      gameState.processAction('unknownPlayerId', 'FOLD');
    } catch (e) {
      caughtError = e as GameError;
    }
    expect(caughtError).toBeInstanceOf(GameError);
    expect(caughtError?.code).toBe('PLAYER_NOT_FOUND');

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
    { desc: 'สตริง', amount: '100' as unknown as number },
    { desc: 'เกิน Safe Integer', amount: Number.MAX_SAFE_INTEGER + 1 },
  ];
  invalidActionAmounts.forEach(({ desc, amount }, idx) => {
    test(`[GameState.processAction] 4.${36 + idx} การเดิมพันยอดเงินผิดรูปแบบ (${desc}) → โยน GameError(INVALID_AMOUNT) และข้อมูลคงเดิม`, () => {
      const gameState = createGameStateFixture(
        { currentPlayerIndex: 0, pot: 500, currentStake: 50 },
        [
          {
            id: 'activePlayer1',
            name: 'Active Player 1',
            status: 'ACTIVE',
            chips: 1000,
          },
          {
            id: 'activePlayer2',
            name: 'Active Player 2',
            status: 'ACTIVE',
            chips: 1000,
          },
        ],
      );
      const [activePlayer1, activePlayer2] = gameState.activePlayers;

      let caughtError: GameError | undefined;
      try {
        gameState.processAction(activePlayer1.id, 'RAISE', amount);
      } catch (e) {
        caughtError = e as GameError;
      }
      expect(caughtError).toBeInstanceOf(GameError);
      expect(caughtError?.code).toBe('INVALID_AMOUNT');

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
  });

  test('[GameState.processAction] CALL เงินไม่พอ (Blind) -> โยน GameError และเงินไม่เปลี่ยน', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        { id: 'p1', name: 'P1', status: 'ACTIVE', chips: 40, isBlind: true },
        { id: 'p2', name: 'P2', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const p1 = gameState.activePlayers[0];
    let err;
    try {
      gameState.processAction(p1.id, 'CALL');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(GameError);
    expect(err.code).toBe('INSUFFICIENT_CHIPS');
    expect(p1.chips).toBe(40);
  });

  test('[GameState.processAction] CALL เงินไม่พอ (Seen) -> โยน GameError และเงินไม่เปลี่ยน', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        { id: 'p1', name: 'P1', status: 'ACTIVE', chips: 90, isBlind: false },
        { id: 'p2', name: 'P2', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const p1 = gameState.activePlayers[0];
    let err;
    try {
      gameState.processAction(p1.id, 'CALL');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(GameError);
    expect(err.code).toBe('INSUFFICIENT_CHIPS');
    expect(p1.chips).toBe(90);
  });

  test('[GameState.processAction] CALL จ่ายเท่าชิปที่เหลือพอดี (All-in แบบพอดี) -> สำเร็จ', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        { id: 'p1', name: 'P1', status: 'ACTIVE', chips: 50, isBlind: true },
        { id: 'p2', name: 'P2', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const p1 = gameState.activePlayers[0];
    gameState.processAction(p1.id, 'CALL');
    expect(p1.chips).toBe(0);
  });

  test('[GameState.processAction] RAISE ขอบเขตที่รับได้และรับไม่ได้ (Boundary)', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
      [
        { id: 'p1', name: 'P1', status: 'ACTIVE', chips: 1000, isBlind: true },
        { id: 'p2', name: 'P2', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const p1 = gameState.activePlayers[0];

    // เกินจำนวนเต็ม (Infinity)
    let err1;
    try {
      gameState.processAction(p1.id, 'RAISE', Infinity);
    } catch (e) {
      err1 = e;
    }
    expect(err1.code).toBe('INVALID_AMOUNT');

    // ติดลบ Infinity
    let err2;
    try {
      gameState.processAction(p1.id, 'RAISE', -Infinity);
    } catch (e) {
      err2 = e;
    }
    expect(err2.code).toBe('INVALID_AMOUNT');

    // ไม่ส่ง Amount
    let err3;
    try {
      gameState.processAction(p1.id, 'RAISE');
    } catch (e) {
      err3 = e;
    }
    expect(err3.code).toBe('INVALID_AMOUNT');

    // เกิน MAX_SAFE_INTEGER
    let err4;
    try {
      gameState.processAction(p1.id, 'RAISE', Number.MAX_SAFE_INTEGER + 1);
    } catch (e) {
      err4 = e;
    }
    expect(err4.code).toBe('INVALID_AMOUNT');

    expect(p1.chips).toBe(1000);
  });

  test('[GameState.processAction] ผู้เล่น WAITING หรือ DISCONNECTED ขอทำ Action ไม่ได้', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0 }, [
      { id: 'p1', name: 'P1', status: 'WAITING', chips: 1000 },
      { id: 'p2', name: 'P2', status: 'DISCONNECTED', chips: 1000 },
      { id: 'p3', name: 'P3', status: 'ACTIVE', chips: 1000 },
    ]);
    let err1;
    try {
      gameState.processAction('p1', 'CALL');
    } catch (e) {
      err1 = e;
    }
    expect(err1).toBeInstanceOf(PlayerStateError);

    let err2;
    try {
      gameState.processAction('p2', 'CALL');
    } catch (e) {
      err2 = e;
    }
    expect(err2).toBeInstanceOf(PlayerStateError);

    expect(gameState.activePlayers[0].chips).toBe(1000);
  });

  test('[GameState.processAction] SEEN ซ้ำไม่เสียเงิน และแทงรอบถัดไปคิดแบบ Seen', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        { id: 'p1', name: 'P1', status: 'ACTIVE', chips: 1000, isBlind: true },
        { id: 'p2', name: 'P2', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const p1 = gameState.activePlayers[0];

    gameState.processAction(p1.id, 'SEEN');
    expect(p1.isBlind).toBe(false);
    expect(p1.chips).toBe(1000);

    gameState.processAction(p1.id, 'SEEN');
    expect(p1.chips).toBe(1000); // เงินต้องไม่ลดลง

    gameState.processAction(p1.id, 'CALL');
    expect(p1.chips).toBe(900); // 1000 - (50*2) = 900
  });
});
