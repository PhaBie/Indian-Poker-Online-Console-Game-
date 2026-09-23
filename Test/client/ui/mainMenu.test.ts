import { describe, expect, test } from 'bun:test';
import {
  parseMainMenuChoice,
  determineNextFocus,
  getGameContainerWidth,
  type MainMenuOption,
} from '../../../src/client/ui/screens/MainMenuScreen';
import {
  isTerminalSizeSufficient,
  isTerminalSizeOptimal,
  getTerminalSizeStatus,
} from '../../../src/client/ui/components/ScreenSizeGuard';

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

    test('[ScreenSizeGuard] 11.4 ตรวจสอบขนาดจอ Terminal ในช่วงที่เหมาะสม (120 × 30) → สถานะเป็น OPTIMAL และผ่านเกณฑ์', () => {
      expect(isTerminalSizeSufficient(120, 30)).toBe(true);
      expect(getTerminalSizeStatus(120, 30)).toBe('OPTIMAL');
      expect(isTerminalSizeOptimal(120, 30)).toBe(true);
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

    test('[ScreenSizeGuard] 11.6 ตรวจสอบขนาดจอ Terminal ที่เล็กกว่าขอบเขตขั้นต่ำ (79 × 24 หรือ 80 × 23) → สถานะเป็น TOO_SMALL และไม่ผ่านเกณฑ์', () => {
      expect(isTerminalSizeSufficient(79, 24)).toBe(false);
      expect(getTerminalSizeStatus(79, 24)).toBe('TOO_SMALL');
      expect(isTerminalSizeOptimal(79, 24)).toBe(false);

      expect(isTerminalSizeSufficient(80, 23)).toBe(false);
      expect(getTerminalSizeStatus(80, 23)).toBe('TOO_SMALL');
      expect(isTerminalSizeOptimal(80, 23)).toBe(false);
    });

    test('[ScreenSizeGuard] 11.7 ตรวจสอบขนาดจอ Terminal ที่ใหญ่เกินขอบเขตสูงสุด (221 × 30) → สถานะเป็น TOO_LARGE และไม่ผ่านเกณฑ์ Optimal', () => {
      expect(isTerminalSizeSufficient(221, 30)).toBe(true);
      expect(getTerminalSizeStatus(221, 30)).toBe('TOO_LARGE');
      expect(isTerminalSizeOptimal(221, 30)).toBe(false);
    });
  });
});
