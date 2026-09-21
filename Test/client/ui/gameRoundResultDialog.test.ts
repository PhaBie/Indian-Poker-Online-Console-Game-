import { describe, expect, test } from 'bun:test';
import {
  getRoundParticipants,
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

  test('excludes waiting spectators from the round summary', () => {
    expect(
      getRoundParticipants([
        { id: 'winner', name: 'Winner', chips: 550, bet: 250, status: 'ACTIVE' },
        { id: 'loser', name: 'Loser', chips: 50, bet: 250, status: 'FOLDED' },
        { id: 'waiting', name: 'Waiting', chips: 300, bet: 0, status: 'WAITING' },
      ]).map((player) => player.id),
    ).toEqual(['winner', 'loser']);
  });
});
