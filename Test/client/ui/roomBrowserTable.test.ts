import { describe, expect, test } from 'bun:test';
import { getVisibleRoomWindow } from '../../../src/client/ui/screens/roomBrowser/RoomBrowserTable';
import { formatGridCell } from '../../../src/client/ui/screens/roomBrowser/RoomBrowserTableHeader';

describe('Room browser viewport', () => {
  test('Unicode names and emoji keep cells aligned by terminal width', () => {
    for (const name of ['ผู้เล่น', '玩家玩家玩家玩家', 'Alice🪙', '👨‍👩‍👧‍👦']) {
      expect(Bun.stringWidth(formatGridCell(name, 15))).toBe(15);
      expect(Bun.stringWidth(formatGridCell(name, 11, 'center'))).toBe(11);
    }
  });
  test('keeps the selected room inside the visible window', () => {
    expect(getVisibleRoomWindow(20, 0, 5)).toEqual({ start: 0, end: 5 });
    expect(getVisibleRoomWindow(20, 10, 5)).toEqual({ start: 8, end: 13 });
    expect(getVisibleRoomWindow(20, 19, 5)).toEqual({ start: 15, end: 20 });
  });

  test('does not create an invalid range for empty or small room lists', () => {
    expect(getVisibleRoomWindow(0, 0, 5)).toEqual({ start: 0, end: 0 });
    expect(getVisibleRoomWindow(2, 1, 5)).toEqual({ start: 0, end: 2 });
  });
});
