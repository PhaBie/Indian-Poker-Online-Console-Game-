import { describe, expect, test } from 'bun:test';
import {
  getSideshowPresentationKey,
  getVisibleSideshowResult,
} from '../../../src/client/ui/screens/game/sideshowPresentation';
import type { GameStatePayload } from '../../../src/client/ui/screens/game/types';

const result: NonNullable<GameStatePayload['sideshowResult']> = {
  challengerId: 'thanathon',
  targetId: 'abcde',
  winnerId: 'thanathon',
  loserId: 'abcde',
  cards: {
    thanathon: [
      { rank: 14, suit: 'SPADES' },
      { rank: 13, suit: 'SPADES' },
      { rank: 12, suit: 'SPADES' },
    ],
    abcde: [
      { rank: 2, suit: 'CLUBS' },
      { rank: 3, suit: 'CLUBS' },
      { rank: 4, suit: 'CLUBS' },
    ],
  },
};

describe('Sideshow presentation', () => {
  test('does not keep the completed duel on the table after its local presentation ends', () => {
    const presentationKey = getSideshowPresentationKey(result);

    expect(getVisibleSideshowResult(result, null)).toEqual(result);
    expect(getVisibleSideshowResult(result, presentationKey)).toBeNull();
  });
});
