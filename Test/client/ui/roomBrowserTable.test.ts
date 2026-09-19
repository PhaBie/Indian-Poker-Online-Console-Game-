import { describe, expect, test } from 'bun:test';
import { getVisibleRoomWindow } from '../../../src/client/ui/screens/roomBrowser/RoomBrowserTable';

describe('Room browser viewport', () => {
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
