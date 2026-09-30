import { describe, expect, test } from 'bun:test';
import { getVisibleRoomWindow } from '../../../01-Source-code/client/ui/screens/roomBrowser/RoomBrowserTable';
import {
  formatGridCell,
  ROOM_BROWSER_CONTENT_WIDTH,
  buildGridBorder,
} from '../../../01-Source-code/client/ui/screens/roomBrowser/RoomBrowserTableHeader';
import { resolveRoomStatus } from '../../../01-Source-code/client/ui/screens/roomBrowser/RoomBrowserRow';
import type { RoomSummaryDTO } from '../../../01-Source-code/shared/types';

describe('17. ระบบค้นหาและแสดงรายการห้อง (Room Browser UI)', () => {
  describe('การจัดวางเซลล์และเส้นขอบตาราง (Cell Layout & Borders)', () => {
    test('[formatGridCell] 17.1 จัดข้อความชื่อภาษาไทย Unicode และอิโมจิลงตาราง → ความกว้างการแสดงผลตรงตามคอลัมน์', () => {
      const multiByteUnicodeNames = ['ผู้เล่น', '玩家玩家玩家玩家', 'Alice🪙', '👨‍👩‍👧‍👦'];
      for (const candidateDisplayName of multiByteUnicodeNames) {
        expect(Bun.stringWidth(formatGridCell(candidateDisplayName, 15))).toBe(15);
        expect(Bun.stringWidth(formatGridCell(candidateDisplayName, 11, 'center'))).toBe(
          11,
        );
      }
    });

    test('[getVisibleRoomWindow] 17.2 เลื่อนหน้าต่างรายการห้อง (Pagination) → รักษาตำแหน่งห้องที่เลือกให้อยู่ในหน้าต่างแสดงผลเสมอ', () => {
      expect(getVisibleRoomWindow(20, 0, 5)).toEqual({ start: 0, end: 5 });
      expect(getVisibleRoomWindow(20, 10, 5)).toEqual({ start: 8, end: 13 });
      expect(getVisibleRoomWindow(20, 19, 5)).toEqual({ start: 15, end: 20 });
      expect(getVisibleRoomWindow(0, 0, 5)).toEqual({ start: 0, end: 0 });
      expect(getVisibleRoomWindow(2, 1, 5)).toEqual({ start: 0, end: 2 });
    });

    test('[buildGridBorder] 17.3 สร้างเส้นขอบตารางรายการห้อง → ความยาวเส้นขอบตรงตาม ROOM_BROWSER_CONTENT_WIDTH อย่างแม่นยำ', () => {
      const topBorderLine = buildGridBorder('┌', '┬', '┐');
      const middleBorderLine = buildGridBorder('├', '┼', '┤');
      const bottomBorderLine = buildGridBorder('└', '┴', '┘');

      expect(Bun.stringWidth(topBorderLine)).toBe(ROOM_BROWSER_CONTENT_WIDTH);
      expect(Bun.stringWidth(middleBorderLine)).toBe(ROOM_BROWSER_CONTENT_WIDTH);
      expect(Bun.stringWidth(bottomBorderLine)).toBe(ROOM_BROWSER_CONTENT_WIDTH);
    });
  });

  describe('ขอบเขตความจุและสถานะห้อง (Capacity Limits & Status)', () => {
    test('[resolveRoomStatus] 17.4 ห้องยังมีที่ว่างสำหรับเล่น → แสดงป้ายสถานะเป็น ● PLAYING ตามเฟสการเล่น', () => {
      const availableSeatRoomSample: RoomSummaryDTO = {
        roomId: 'room_open_001',
        hostName: 'HostPlayer',
        playerCount: 2,
        waitingCount: 1,
        maxPlayers: 4,
        phase: 'PLAYING',
        bootAmount: 50,
      };
      expect(resolveRoomStatus(availableSeatRoomSample).statusLabel).toBe('● PLAYING');
    });

    test('[resolveRoomStatus] 17.5 จำนวนผู้เล่นรวมผู้ชมรอเล่นเต็มจำนวนสูงสุด (4 คน) → แสดงป้ายสถานะเป็น ● FULL', () => {
      const fullyOccupiedRoomSample: RoomSummaryDTO = {
        roomId: 'room_full_001',
        hostName: 'HostPlayer',
        playerCount: 2,
        waitingCount: 2,
        maxPlayers: 4,
        phase: 'PLAYING',
        bootAmount: 50,
      };
      expect(resolveRoomStatus(fullyOccupiedRoomSample).statusLabel).toBe('● FULL');
    });
  });
});
