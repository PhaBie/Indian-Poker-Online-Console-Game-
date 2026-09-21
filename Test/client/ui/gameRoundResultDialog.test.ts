import { describe, expect, test } from 'bun:test';
import {
  getWinningHandLabel,
  sortPlayersForResult,
} from '../../../src/client/ui/screens/game/GameRoundResultDialog';

describe('Game round-result presentation', () => {
  test('labels an uncontested pot as won by fold', () => {
    expect(
      getWinningHandLabel({
        winnerIds: ['winner'],
        winningHand: 'HIGH_CARD',
        payouts: { winner: 100 },
        exposedCards: {},
      }),
    ).toBe('WON BY FOLD');
  });

  test('places winners first, then ranks the remaining players by ending stack', () => {
    const players = [
      { id: 'third', name: 'Third', chips: 850, bet: 50 },
      { id: 'winner', name: 'Winner', chips: 1_150, bet: 50 },
      { id: 'second', name: 'Second', chips: 1_000, bet: 100 },
    ];
    const result = {
      winnerIds: ['winner'],
      winningHand: 'HIGH_CARD' as const,
      payouts: { winner: 150 },
      exposedCards: {},
    };

    expect(
      sortPlayersForResult(players, result, {
        third: 900,
        winner: 1_000,
        second: 1_100,
      }).map((player) => player.id),
    ).toEqual(['winner', 'second', 'third']);
  });
});
