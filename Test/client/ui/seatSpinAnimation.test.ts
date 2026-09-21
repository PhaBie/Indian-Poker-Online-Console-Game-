import { describe, expect, test } from 'bun:test';
import {
  resolveSpinningOpponentSeat,
  resolveSeatPositionsForEntrance,
} from '../../../src/client/ui/screens/game/useSeatSpinAnimation';
import type {
  GamePlayerItem,
  TableSeatPositions,
} from '../../../src/client/ui/screens/game/types';

describe('useSeatSpinAnimation', () => {
  const mePlayer: GamePlayerItem = {
    id: 'id_me',
    name: 'MyUser',
    chips: 1000,
    bet: 50,
    status: 'ACTIVE',
    isBlind: true,
  };

  const opponentLeft: GamePlayerItem = {
    id: 'id_p2',
    name: 'Alice',
    chips: 1000,
    bet: 50,
    status: 'ACTIVE',
    isBlind: true,
  };

  const opponentTop: GamePlayerItem = {
    id: 'id_p3',
    name: 'Bob',
    chips: 1000,
    bet: 50,
    status: 'ACTIVE',
    isBlind: true,
  };

  const sampleSeats: TableSeatPositions<GamePlayerItem> = {
    bottomPlayer: mePlayer,
    leftPlayer: opponentLeft,
    topPlayer: opponentTop,
    rightPlayer: undefined,
  };

  const twoPlayerSeats: TableSeatPositions<GamePlayerItem> = {
    bottomPlayer: mePlayer,
    leftPlayer: undefined,
    topPlayer: opponentTop,
    rightPlayer: undefined,
  };

  test('resolveSpinningOpponentSeat returns undefined for undefined player', () => {
    expect(
      resolveSpinningOpponentSeat(undefined, [], 0, 0, 5000, 4000, 8000),
    ).toBeUndefined();
  });

  test('resolveSpinningOpponentSeat returns seat placeholder before spin start', () => {
    const seat = resolveSpinningOpponentSeat(
      opponentLeft,
      [opponentLeft, opponentTop],
      0,
      0,
      2000,
      4000,
      8000,
    );
    expect(seat?.name).toBe('[ ··· ]');
  });

  test('resolveSpinningOpponentSeat returns spinning candidate during spin phase', () => {
    const seat = resolveSpinningOpponentSeat(
      opponentLeft,
      [opponentLeft, opponentTop],
      0,
      0,
      5000,
      4000,
      8000,
    );
    expect(seat?.name).toContain('🎲');
  });

  test('resolveSpinningOpponentSeat returns original player after spin phase completes', () => {
    const seat = resolveSpinningOpponentSeat(
      opponentLeft,
      [opponentLeft, opponentTop],
      0,
      0,
      8500,
      4000,
      8000,
    );
    expect(seat?.name).toBe('Alice');
  });

  test('resolveSeatPositionsForEntrance preserves bottomPlayer unchanged at all times', () => {
    const early = resolveSeatPositionsForEntrance(sampleSeats, 2000, true);
    expect(early.bottomPlayer?.id).toBe('id_me');

    const spinning = resolveSeatPositionsForEntrance(sampleSeats, 6000, true);
    expect(spinning.bottomPlayer?.id).toBe('id_me');

    const settled = resolveSeatPositionsForEntrance(sampleSeats, 8500, true);
    expect(settled.bottomPlayer?.id).toBe('id_me');
  });

  test('resolveSeatPositionsForEntrance returns seats directly without spinning for 2-player matches', () => {
    const early = resolveSeatPositionsForEntrance(twoPlayerSeats, 2000, true);
    expect(early.topPlayer?.name).toBe('Bob');

    const duringSpinTime = resolveSeatPositionsForEntrance(twoPlayerSeats, 6000, true);
    expect(duringSpinTime.topPlayer?.name).toBe('Bob');

    const later = resolveSeatPositionsForEntrance(twoPlayerSeats, 8500, true);
    expect(later.topPlayer?.name).toBe('Bob');
  });

  test('resolveSeatPositionsForEntrance returns original seats when entrance is inactive', () => {
    const result = resolveSeatPositionsForEntrance(sampleSeats, 5000, false);
    expect(result).toBe(sampleSeats);
  });
});
