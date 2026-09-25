import { expect, test, describe } from 'bun:test';
import { createGameStateFixture } from './fixtures/gameState.fixture';
import { expectGameErrorWithCode } from '../helpers/expectGameErrorWithCode';

describe('4. การจัดการกระบวนการตามเดิมพัน CALL (GameState Call Operations)', () => {
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
});
