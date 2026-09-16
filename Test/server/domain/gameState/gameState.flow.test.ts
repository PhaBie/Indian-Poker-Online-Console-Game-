import { expect, test, describe } from 'bun:test';
import { createGameStateFixture } from './fixtures/gameState.fixture';
import { expectGameErrorWithCode } from '../helpers/expectGameErrorWithCode';

describe('gameState.flow', () => {
  test('[GameState Flow] 4.30 การเล่นต่อเนื่องหลาย Action โดยไม่ผ่าน Server', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0 }, [
      { id: 'foldingPlayer', name: 'Folding Player', status: 'WAITING', chips: 1000 },
      { id: 'survivor', name: 'Survivor', status: 'WAITING', chips: 1000 },
    ]);
    const [foldingPlayer, survivor] = gameState.activePlayers;

    gameState.startGame();
    expect(gameState.pot).toBe(100);

    gameState.processAction(foldingPlayer.id, 'FOLD');
    expect(foldingPlayer.status).toBe('FOLDED');

    const lastMan = gameState.checkLastManStanding();
    expect(lastMan?.id).toBe(survivor.id);

    gameState.endGame();
    expect(survivor.chips).toBe(1050);
  });

  test('[Continuous Flow Test] 4.70 เริ่มรอบ -> CALL -> RAISE -> CALL -> FOLD -> จ่ายรางวัล', () => {
    const gameState = createGameStateFixture({ bootAmount: 50, maxPotLimit: 10000 }, [
      { id: 'playerOne', name: 'Player One', status: 'WAITING', chips: 1000 },
      { id: 'playerTwo', name: 'Player Two', status: 'WAITING', chips: 1000 },
      { id: 'playerThree', name: 'Player Three', status: 'WAITING', chips: 1000 },
    ]);
    gameState.startGame();
    expect(gameState.pot).toBe(150);
    expect(gameState.activePlayers[0].chips).toBe(950);

    gameState.processAction('playerOne', 'CALL');
    expect(gameState.pot).toBe(200);
    gameState.nextTurn();

    gameState.processAction('playerTwo', 'RAISE', 100);
    expect(gameState.pot).toBe(300);
    expect(gameState.currentStake).toBe(100);
    gameState.nextTurn();

    gameState.processAction('playerThree', 'CALL');
    expect(gameState.pot).toBe(400);
    gameState.nextTurn();

    gameState.processAction('playerOne', 'FOLD');
    gameState.nextTurn();

    gameState.processAction('playerTwo', 'FOLD');
    const winner = gameState.checkLastManStanding();
    expect(winner?.id).toBe('playerThree');

    gameState.endGame();
    expect(gameState.activePlayers[2].chips).toBe(1250);

    const totalChipsInSystem =
      gameState.activePlayers.reduce(
        (accumulatedChips, player) => accumulatedChips + player.chips,
        0,
      ) + gameState.pot;
    expect(totalChipsInSystem).toBe(3000);
  });

  test('[Error Injection in Flow] 4.71 คำสั่งผิดแทรกกลางเกม -> State คงเดิม -> คำสั่งถูกทำงานต่อได้', () => {
    const gameState = createGameStateFixture({ bootAmount: 50 }, [
      { id: 'playerOne', name: 'Player One', status: 'WAITING', chips: 1000 },
      { id: 'playerTwo', name: 'Player Two', status: 'WAITING', chips: 1000 },
    ]);
    gameState.startGame();

    expectGameErrorWithCode(
      () => gameState.processAction('playerOne', 'RAISE', -50),
      'INVALID_AMOUNT',
    );

    expect(gameState.pot).toBe(100);
    expect(gameState.activePlayers[0].chips).toBe(950);

    gameState.processAction('playerOne', 'CALL');
    expect(gameState.pot).toBe(150);
  });
});
