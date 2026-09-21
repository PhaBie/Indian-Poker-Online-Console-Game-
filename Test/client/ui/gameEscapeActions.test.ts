import { describe, expect, test } from 'bun:test';
import { getGameEscapeAction } from '../../../src/client/ui/screens/game/gameEscapeActions';

describe('getGameEscapeAction', () => {
  test('cancels bet entry before offering to leave the table', () => {
    expect(getGameEscapeAction(true, 'input_bet', false)).toBe('cancel_bet');
  });

  test('opens the leave confirmation from the action menu', () => {
    expect(getGameEscapeAction(true, 'menu', false)).toBe('open_exit');
  });

  test('does not reopen an already open leave confirmation', () => {
    expect(getGameEscapeAction(true, 'menu', true)).toBeNull();
  });
});
