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

  test('hides every action for a bankrupt player even if the server still points at them', () => {
    expect(
      getGameplayActions({
        players: [{ ...players[0], chips: 0 }, players[1]],
        myPlayerId: 'me',
        currentTurnPlayerId: 'me',
        currentStake: 50,
        pendingSideshow: null,
      }),
    ).toEqual([]);
  });

  test('shows only fold when a seen player cannot afford the call or show cost', () => {
    expect(
      getGameplayActions({
        players: [
          { ...players[0], chips: 50, isBlind: false },
          { ...players[1], chips: 50, isBlind: false },
        ],
        myPlayerId: 'me',
        currentTurnPlayerId: 'me',
        currentStake: 50,
        pendingSideshow: null,
      }),
    ).toEqual([{ label: 'FOLD', value: 'FOLD' }]);
  });
});
