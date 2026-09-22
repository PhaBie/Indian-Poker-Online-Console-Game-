import { expect, test } from 'bun:test';
import { GameState } from '../../../../src/server/domain/models/GameState';
import { Player } from '../../../../src/server/domain/models/Player';

test('a player who reaches zero chips is folded and skipped without pausing the deal', () => {
  const first = new Player('first', 'First');
  const second = new Player('second', 'Second');
  const third = new Player('third', 'Third');
  first.chips = 100;
  second.chips = 150;
  third.chips = 150;
  const game = new GameState([first, second, third], 50);
  game.startGame();

  const isGameOver = game.processAction(first.id, 'CALL');

  expect(first.chips).toBe(0);
  expect(first.status).toBe('FOLDED');
  expect(isGameOver).toBe(false);
  game.nextTurn();
  expect(game.activePlayers[game.currentPlayerIndex].id).toBe(second.id);
  expect(game.checkLastManStanding()).toBeNull();
});
