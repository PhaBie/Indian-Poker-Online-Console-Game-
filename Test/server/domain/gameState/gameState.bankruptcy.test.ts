import { expect, test } from 'bun:test';
import { GameState } from '../../../../src/server/domain/models/GameState';
import { Player } from '../../../../src/server/domain/models/Player';

test('a player who spends their final chip is removed from turns', () => {
  const first = new Player('first', 'First');
  const second = new Player('second', 'Second');
  first.chips = 100;
  second.chips = 100;
  const game = new GameState([first, second], 50);
  game.startGame();

  const isGameOver = game.processAction(first.id, 'CALL');

  expect(first.chips).toBe(0);
  expect(first.status).toBe('FOLDED');
  expect(game.isRoundEnding).toBe(true);
  expect(isGameOver).toBe(true);
});

test('a player who spends their final chip on the boot is marked for settlement', () => {
  const first = new Player('first', 'First');
  const second = new Player('second', 'Second');
  first.chips = 50;
  second.chips = 100;
  const game = new GameState([first, second], 50);

  game.startGame();

  expect(first.chips).toBe(0);
  expect(first.status).toBe('FOLDED');
  expect(game.isRoundEnding).toBe(true);
});
