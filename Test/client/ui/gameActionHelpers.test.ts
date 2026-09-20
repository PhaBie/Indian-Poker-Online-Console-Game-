import { describe, expect, test } from 'bun:test';
import { getGameplayActions } from '../../../src/client/ui/screens/game/gameActionHelpers';

const players = [
  { id: 'me', name: 'Me', chips: 950, bet: 50, status: 'ACTIVE' as const, isBlind: true },
  {
    id: 'opponent',
    name: 'Opponent',
    chips: 950,
    bet: 50,
    status: 'ACTIVE' as const,
    isBlind: true,
  },
];

describe('getGameplayActions', () => {
  test('shows only actions that are legal for a blind player at a two-player table', () => {
    expect(
      getGameplayActions({
        players,
        myPlayerId: 'me',
        currentTurnPlayerId: 'me',
        currentStake: 50,
        pendingSideshow: null,
      }),
    ).toEqual([
      { label: 'CALL', value: 'CALL', hint: '$50' },
      { label: 'BET', value: 'BET', hint: '$50–$100' },
      { label: 'SEE', value: 'SEEN' },
      { label: 'FOLD', value: 'FOLD' },
      { label: 'SHOW', value: 'SHOW' },
    ]);
  });

  test('hides the menu when waiting for another player', () => {
    expect(
      getGameplayActions({
        players,
        myPlayerId: 'me',
        currentTurnPlayerId: 'opponent',
        currentStake: 50,
        pendingSideshow: null,
      }),
    ).toEqual([]);
  });
});
