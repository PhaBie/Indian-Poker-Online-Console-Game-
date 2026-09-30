import { describe, expect, test } from 'bun:test';
import {
  parseMainMenuChoice,
  determineNextFocus,
  type MainMenuOption,
} from '../../../01-Source-code/client/ui/screens/mainMenu/MainMenuScreen';
import { getGameContainerWidth } from '../../../01-Source-code/client/ui/shared/layout/gameContainerLayout';
import {
  isTerminalSizeSufficient,
  isTerminalSizeOptimal,
  getTerminalSizeStatus,
} from '../../../01-Source-code/client/ui/shared/components/ScreenSizeGuard';

describe('11. ระบบเมนูหลัก (Main Menu UI)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test.each<[string, MainMenuOption]>([
      ['1', 'CREATE_ROOM'],
      ['2', 'JOIN_ROOM'],
      ['3', 'EXIT'],
      ['  1  ', 'CREATE_ROOM'],
    ])(
      '[parseMainMenuChoice] 11.1 ป้อนตัวเลือกเมนูที่ถูกต้อง "%s" → ได้ตัวเลือกการทำงานเป็น %s',
      (rawMenuChoiceInput, expectedMenuOption) => {
        expect(parseMainMenuChoice(rawMenuChoiceInput)).toBe(expectedMenuOption);
      },
    );

    test('[determineNextFocus] 11.2 เลื่อนโฟกัสไปข้างหน้าและย้อนกลับ → ดัชนีโฟกัสเพิ่มขึ้น/ลดลงและวนกลับอย่างถูกต้อง', () => {
      expect(determineNextFocus(0, 'NEXT')).toBe(1);
      expect(determineNextFocus(1, 'NEXT')).toBe(2);
      expect(determineNextFocus(2, 'NEXT')).toBe(0);

      expect(determineNextFocus(0, 'PREVIOUS')).toBe(2);
      expect(determineNextFocus(2, 'PREVIOUS')).toBe(1);
      expect(determineNextFocus(1, 'PREVIOUS')).toBe(0);
    });

    test.each([
      [80, 66],
      [160, 70],
      [200, 88],
      [220, 92],
    ])(
      '[getGameContainerWidth] 11.3 คำนวณความกว้างคอนเทนเนอร์สำหรับจอขนาด %d คอลัมน์ → ได้ขนาด %d',
      (terminalColumns, expectedContainerWidth) => {
        expect(getGameContainerWidth(terminalColumns)).toBe(expectedContainerWidth);
      },
    );

    test('[ScreenSizeGuard] 11.4 ตรวจสอบขนาดจอที่พร้อมเล่นเกม (150 × 41) → สถานะเป็น OPTIMAL และผ่านเกณฑ์', () => {
      expect(isTerminalSizeSufficient(150, 41)).toBe(true);
      expect(getTerminalSizeStatus(150, 41)).toBe('OPTIMAL');
      expect(isTerminalSizeOptimal(150, 41)).toBe(true);
      expect(getTerminalSizeStatus(320, 90)).toBe('OPTIMAL');
    });
  });

  describe('กรณีข้อผิดพลาดและขอบเขตข้อมูล (Unhappy Paths & Boundaries)', () => {
    test('[parseMainMenuChoice] 11.5 ป้อนค่าตัวเลือกนอกขอบเขต ตัวอักษร หรือค่าว่างเปล่า → คืนค่า null ทั้งหมด', () => {
      expect(parseMainMenuChoice('0')).toBeNull();
      expect(parseMainMenuChoice('4')).toBeNull();
      expect(parseMainMenuChoice('create')).toBeNull();
      expect(parseMainMenuChoice('')).toBeNull();
      expect(parseMainMenuChoice('   ')).toBeNull();
    });

    test('[ScreenSizeGuard] 11.6 ตรวจสอบขนาดจอ Terminal ที่เล็กกว่าขอบเขตขั้นต่ำ (149 × 41 หรือ 150 × 40) → สถานะเป็น TOO_SMALL และไม่ผ่านเกณฑ์', () => {
      expect(isTerminalSizeSufficient(149, 41)).toBe(false);
      expect(getTerminalSizeStatus(149, 41)).toBe('TOO_SMALL');
      expect(isTerminalSizeOptimal(149, 41)).toBe(false);

      expect(isTerminalSizeSufficient(150, 40)).toBe(false);
      expect(getTerminalSizeStatus(150, 40)).toBe('TOO_SMALL');
      expect(isTerminalSizeOptimal(150, 40)).toBe(false);
    });

    test('[ScreenSizeGuard] 11.7 ตรวจสอบขนาดจอ Terminal ที่ใหญ่เกินขอบเขตสูงสุด (1001 × 41) → สถานะเป็น TOO_LARGE และไม่ผ่านเกณฑ์ Optimal', () => {
      expect(isTerminalSizeSufficient(1001, 41)).toBe(true);
      expect(getTerminalSizeStatus(1001, 41)).toBe('TOO_LARGE');
      expect(isTerminalSizeOptimal(1001, 41)).toBe(false);
    });
  });
});
