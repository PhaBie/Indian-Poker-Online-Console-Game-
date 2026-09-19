import { describe, expect, test } from 'bun:test';
import { isPlayerPresentInRoom } from '../../../src/client/ui/hooks/useAppNavigation';

describe('Room navigation state sync', () => {
  test('does not reopen room screens after the current player has left', () => {
    expect(isPlayerPresentInRoom([{ id: 'other-player' }], 'current-player')).toBe(false);
    expect(isPlayerPresentInRoom([], 'current-player')).toBe(false);
    expect(isPlayerPresentInRoom(undefined, null)).toBe(false);
  });

  test('allows room phase updates while the current player is still in the room', () => {
    expect(isPlayerPresentInRoom([{ id: 'current-player' }], 'current-player')).toBe(true);
  });
});
