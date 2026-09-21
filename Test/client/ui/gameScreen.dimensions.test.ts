import { describe, expect, test } from 'bun:test';
import {
  GAMEPLAY_HEIGHT,
  GAMEPLAY_WIDTH,
  getRoundResultPresentation,
} from '../../../src/client/ui/screens/GameScreen';
import { CARD_HEIGHT, CARD_WIDTH } from '../../../src/client/ui/screens/game/CardView';

describe('GameScreen dimensions', () => {
  test('keeps the enlarged table at the locked minimum viewport size', () => {
    expect(GAMEPLAY_WIDTH).toBe(150);
    expect(GAMEPLAY_HEIGHT).toBe(45);
  });

  test('uses larger card faces inside the enlarged table', () => {
    expect(CARD_WIDTH).toBe(7);
    expect(CARD_HEIGHT).toBe(3);
  });

  test('hides actions and clears the active turn while the round-result popup is visible', () => {
    expect(getRoundResultPresentation(true, 'player_1')).toEqual({
      currentTurnPlayerId: null,
      shouldShowActions: false,
    });
  });
});
