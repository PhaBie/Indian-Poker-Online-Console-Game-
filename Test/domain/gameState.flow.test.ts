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
});
