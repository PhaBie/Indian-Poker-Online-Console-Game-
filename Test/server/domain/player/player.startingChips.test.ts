import { expect, test } from 'bun:test';
import { GAME_CONSTANTS } from '../../../../src/shared/constants';
import { Player } from '../../../../src/server/domain/models/Player';

test('new players receive the smaller configured starting stack', () => {
  expect(new Player('player-1', 'Player 1').chips).toBe(
    GAME_CONSTANTS.DEFAULT_STARTING_CHIPS,
  );
  expect(GAME_CONSTANTS.DEFAULT_STARTING_CHIPS).toBe(1000);
});
