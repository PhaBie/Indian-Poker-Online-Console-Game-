import { expect, test, describe } from 'bun:test';
import { createGameStateFixture } from './fixtures/gameState.fixture';

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

  test('[Continuous Flow Test] เริ่มรอบ -> CALL -> RAISE -> CALL -> FOLD -> จ่ายรางวัล', () => {
    const gameState = createGameStateFixture({ bootAmount: 50, potLimit: 10000 }, [
      { id: 'p1', name: 'P1', status: 'WAITING', chips: 1000 },
      { id: 'p2', name: 'P2', status: 'WAITING', chips: 1000 },
      { id: 'p3', name: 'P3', status: 'WAITING', chips: 1000 },
    ]);
    gameState.startGame();
    expect(gameState.pot).toBe(150);
    expect(gameState.activePlayers[0].chips).toBe(950);

    gameState.processAction('p1', 'CALL');
    expect(gameState.pot).toBe(200);
    gameState.nextTurn();

    gameState.processAction('p2', 'RAISE', 100);
    expect(gameState.pot).toBe(300);
    expect(gameState.currentStake).toBe(100);
    gameState.nextTurn();

    gameState.processAction('p3', 'CALL');
    expect(gameState.pot).toBe(400);
    gameState.nextTurn();

    gameState.processAction('p1', 'FOLD');
    gameState.nextTurn();

    gameState.processAction('p3', 'FOLD');
    const winner = gameState.checkLastManStanding();
    expect(winner?.id).toBe('p2');

    gameState.endGame(winner!);
    expect(gameState.activePlayers[1].chips).toBe(1250);

    const totalChips =
      gameState.activePlayers.reduce((sum, p) => sum + p.chips, 0) + gameState.pot;
    expect(totalChips).toBe(3000);
  });

  test('[Error Injection in Flow] คำสั่งผิดแทรกกลางเกม -> State คงเดิม -> คำสั่งถูกทำงานต่อได้', () => {
    const gameState = createGameStateFixture({ bootAmount: 50 }, [
      { id: 'p1', name: 'P1', status: 'WAITING', chips: 1000 },
      { id: 'p2', name: 'P2', status: 'WAITING', chips: 1000 },
    ]);
    gameState.startGame();

    let err;
    try {
      gameState.processAction('p1', 'RAISE', -50);
    } catch (e) {
      err = e;
    }
    expect(err.code).toBe('INVALID_AMOUNT');
    expect(gameState.pot).toBe(100);
    expect(gameState.activePlayers[0].chips).toBe(950);

    gameState.processAction('p1', 'CALL');
    expect(gameState.pot).toBe(150);
  });
});
