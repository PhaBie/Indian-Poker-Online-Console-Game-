import { describe, expect, test } from 'bun:test';
import { getVisibleRoomWindow } from '../../../src/client/ui/screens/roomBrowser/RoomBrowserTable';
import {
  formatGridCell,
  COLUMN_WIDTHS,
  ROOM_BROWSER_CONTENT_WIDTH,
  buildGridBorder,
} from '../../../src/client/ui/screens/roomBrowser/RoomBrowserTableHeader';
import { resolveRoomStatus } from '../../../src/client/ui/screens/roomBrowser/RoomBrowserRow';
import type { RoomSummaryDTO } from '../../../src/shared/types';

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

  test('table widths and grid borders match exactly 73 columns', () => {
    expect(COLUMN_WIDTHS.waiting).toBe(9);
    expect(ROOM_BROWSER_CONTENT_WIDTH).toBe(73);

    const topBorder = buildGridBorder('┌', '┬', '┐');
    const midBorder = buildGridBorder('├', '┼', '┤');
    const botBorder = buildGridBorder('└', '┴', '┘');

    expect(Bun.stringWidth(topBorder)).toBe(73);
    expect(Bun.stringWidth(midBorder)).toBe(73);
    expect(Bun.stringWidth(botBorder)).toBe(73);
  });

  test('resolveRoomStatus returns FULL when active and waiting players reach max capacity', () => {
    const fullRoomSample: RoomSummaryDTO = {
      roomId: '123456',
      hostName: 'HostUser',
      playerCount: 2,
      waitingCount: 2,
      maxPlayers: 4,
      phase: 'PLAYING',
      bootAmount: 50,
    };
    expect(resolveRoomStatus(fullRoomSample).statusLabel).toBe('● FULL');

    const openRoomSample: RoomSummaryDTO = {
      roomId: '123456',
      hostName: 'HostUser',
      playerCount: 2,
      waitingCount: 1,
      maxPlayers: 4,
      phase: 'PLAYING',
      bootAmount: 50,
    };
    expect(resolveRoomStatus(openRoomSample).statusLabel).toBe('● PLAYING');
  });
});
