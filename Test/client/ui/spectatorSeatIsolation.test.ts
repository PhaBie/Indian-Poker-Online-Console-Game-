import { describe, expect, test } from 'bun:test';
import {
  getOrderedPlayersByPerspective,
  determineSeatPositions,
} from '../../../src/client/ui/screens/game/gameLayoutHelpers';

interface MockPlayerItem {
  readonly id: string;
  readonly name: string;
  readonly status: string;
}

function createMockPlayers(
  count: number,
  waitingIds: readonly string[] = [],
): MockPlayerItem[] {
  const names = ['Alice', 'Bob', 'Carol', 'Dave'];
  return Array.from({ length: count }, (_, index) => ({
    id: `player_${index + 1}`,
    name: names[index] ?? `Player${index + 1}`,
    status: waitingIds.includes(`player_${index + 1}`) ? 'WAITING' : 'ACTIVE',
  }));
}

describe('spectator seat isolation', () => {
  test('active table players exclude WAITING spectators from seat positions', () => {
    const allPlayers = createMockPlayers(3, ['player_3']);
    const activeTablePlayers = allPlayers.filter((player) => player.status !== 'WAITING');

    expect(activeTablePlayers).toHaveLength(2);

    const orderedPlayers = getOrderedPlayersByPerspective(activeTablePlayers, 'player_1');
    const seatPositions = determineSeatPositions(orderedPlayers);

    expect(seatPositions.bottomPlayer?.id).toBe('player_1');
    expect(seatPositions.topPlayer?.id).toBe('player_2');
    expect(seatPositions.leftPlayer).toBeUndefined();
    expect(seatPositions.rightPlayer).toBeUndefined();
  });

  test('spectator joining mid-game does not occupy a seat on the table', () => {
    const allPlayers = createMockPlayers(4, ['player_4']);
    const activeTablePlayers = allPlayers.filter((player) => player.status !== 'WAITING');

    expect(activeTablePlayers).toHaveLength(3);

    const orderedPlayers = getOrderedPlayersByPerspective(activeTablePlayers, 'player_1');
    const seatPositions = determineSeatPositions(orderedPlayers);

    expect(seatPositions.bottomPlayer?.id).toBe('player_1');
    expect(seatPositions.leftPlayer?.id).toBe('player_2');
    expect(seatPositions.rightPlayer?.id).toBe('player_3');
    expect(seatPositions.topPlayer).toBeUndefined();
  });

  test('spectator perspective does not place them at bottom seat when they are filtered out', () => {
    const allPlayers = createMockPlayers(3, ['player_3']);
    const activeTablePlayers = allPlayers.filter((player) => player.status !== 'WAITING');
    const orderedPlayers = getOrderedPlayersByPerspective(activeTablePlayers, 'player_3');

    expect(orderedPlayers[0].id).toBe('player_1');

    const seatPositions = determineSeatPositions(orderedPlayers);
    expect(seatPositions.bottomPlayer?.id).toBe('player_1');
    expect(seatPositions.topPlayer?.id).toBe('player_2');
  });

  test('all players ACTIVE means full table seating for 4 players', () => {
    const allPlayers = createMockPlayers(4);
    const activeTablePlayers = allPlayers.filter((player) => player.status !== 'WAITING');

    expect(activeTablePlayers).toHaveLength(4);

    const orderedPlayers = getOrderedPlayersByPerspective(activeTablePlayers, 'player_1');
    const seatPositions = determineSeatPositions(orderedPlayers);

    expect(seatPositions.bottomPlayer?.id).toBe('player_1');
    expect(seatPositions.leftPlayer?.id).toBe('player_2');
    expect(seatPositions.topPlayer?.id).toBe('player_3');
    expect(seatPositions.rightPlayer?.id).toBe('player_4');
  });

  test('fallback uses all players when all are WAITING', () => {
    const allPlayers = createMockPlayers(2, ['player_1', 'player_2']);
    const nonWaitingPlayers = allPlayers.filter((player) => player.status !== 'WAITING');
    const activeTablePlayers =
      nonWaitingPlayers.length > 0 ? nonWaitingPlayers : allPlayers;

    expect(activeTablePlayers).toHaveLength(2);
    expect(activeTablePlayers[0].id).toBe('player_1');
  });
});
