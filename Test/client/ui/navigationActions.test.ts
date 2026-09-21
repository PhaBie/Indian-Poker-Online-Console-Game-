import { describe, expect, test } from 'bun:test';
import {
  resolveLeaveRoomScreen,
  resolveRoomClosedScreen,
} from '../../../src/client/ui/hooks/navigationActions';

describe('Room navigation flow', () => {
  test('created room returns to main menu when leaving waiting room', () => {
    expect(resolveLeaveRoomScreen('create')).toBe('mainMenu');
  });

  test('lobby room returns to room lobby when leaving waiting room', () => {
    expect(resolveLeaveRoomScreen('join')).toBe('tableLounge');
    expect(resolveLeaveRoomScreen(null)).toBe('tableLounge');
  });

  test('host-created room returns to main menu when the server closes it', () => {
    expect(resolveRoomClosedScreen('create')).toBe('mainMenu');
    expect(resolveRoomClosedScreen('join')).toBe('tableLounge');
  });
});
