import type { GamePlayerItem, TableSeatPositions } from './types';

export const SEAT_SPIN_INTERVAL_MS = 120;
export const DEFAULT_SPIN_START_MS = 5200;
export const DEFAULT_SPIN_END_MS = 9200;

export function resolveSpinningOpponentSeat(
  originalPlayer: GamePlayerItem | undefined,
  opponents: readonly GamePlayerItem[],
  spinIndex: number,
  slotOffset: number,
  elapsedMs: number,
  spinStartMs: number,
  spinEndMs: number,
): GamePlayerItem | undefined {
  if (!originalPlayer) {
    return undefined;
  }

  if (elapsedMs < spinStartMs) {
    return {
      ...originalPlayer,
      name: '[ ··· ]',
    };
  }

  if (elapsedMs < spinEndMs && opponents.length > 0) {
    const candidateIndex = (spinIndex + slotOffset) % opponents.length;
    const candidate = opponents[candidateIndex] ?? originalPlayer;
    return {
      ...originalPlayer,
      name: candidate.name,
    };
  }

  return originalPlayer;
}

function collectOpponents(
  seats: TableSeatPositions<GamePlayerItem>,
): readonly GamePlayerItem[] {
  const opponents: GamePlayerItem[] = [];
  if (seats.leftPlayer) {
    opponents.push(seats.leftPlayer);
  }
  if (seats.topPlayer) {
    opponents.push(seats.topPlayer);
  }
  if (seats.rightPlayer) {
    opponents.push(seats.rightPlayer);
  }
  return opponents;
}

export function resolveSeatPositionsForEntrance(
  seats: TableSeatPositions<GamePlayerItem>,
  elapsedMs: number,
  isEntranceActive: boolean,
  spinStartMs: number = DEFAULT_SPIN_START_MS,
  spinEndMs: number = DEFAULT_SPIN_END_MS,
): TableSeatPositions<GamePlayerItem> {
  if (!isEntranceActive) {
    return seats;
  }

  const opponents = collectOpponents(seats);
  if (opponents.length <= 1 || spinStartMs >= spinEndMs) {
    return seats;
  }

  const spinIndex = Math.floor(
    Math.max(0, elapsedMs - spinStartMs) / SEAT_SPIN_INTERVAL_MS,
  );

  return {
    bottomPlayer: seats.bottomPlayer,
    leftPlayer: resolveSpinningOpponentSeat(
      seats.leftPlayer,
      opponents,
      spinIndex,
      0,
      elapsedMs,
      spinStartMs,
      spinEndMs,
    ),
    topPlayer: resolveSpinningOpponentSeat(
      seats.topPlayer,
      opponents,
      spinIndex,
      1,
      elapsedMs,
      spinStartMs,
      spinEndMs,
    ),
    rightPlayer: resolveSpinningOpponentSeat(
      seats.rightPlayer,
      opponents,
      spinIndex,
      2,
      elapsedMs,
      spinStartMs,
      spinEndMs,
    ),
  };
}
