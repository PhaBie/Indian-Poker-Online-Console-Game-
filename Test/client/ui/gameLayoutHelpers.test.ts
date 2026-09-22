import { describe, expect, it } from 'bun:test';
import {
  determineSeatPositions,
  getPlayerBadgeInfo,
  getStatusDisplayInfo,
} from '../../../src/client/ui/screens/game/gameLayoutHelpers';

describe('game layout helpers', () => {
  it('places 2, 3, and 4 players in valid seats', () => {
    expect(determineSeatPositions(['A', 'B']).topPlayer).toBe('B');
    expect(determineSeatPositions(['A', 'B', 'C']).rightPlayer).toBe('C');
    expect(determineSeatPositions(['A', 'B', 'C', 'D']).topPlayer).toBe('C');
  });

  it('uses a normal fold marker with no bankruptcy presentation', () => {
    expect(getPlayerBadgeInfo(true, false, false).label).toBe('[FOLD]');
  });

  it('shows the waiting-player and normal turn statuses', () => {
    expect(
      getStatusDisplayInfo({
        isWaitingForNextRound: true,
        isMyTurn: false,
        isPendingSideshowTarget: false,
        isPendingSideshowChallenger: false,
        hasPendingSideshow: false,
      }).text,
    ).toBe('SPECTATING · WAITING FOR NEW GAME');
    expect(
      getStatusDisplayInfo({
        isMyTurn: true,
        isPendingSideshowTarget: false,
        isPendingSideshowChallenger: false,
        hasPendingSideshow: false,
      }).text,
    ).toBe('Your turn!');
  });
});
