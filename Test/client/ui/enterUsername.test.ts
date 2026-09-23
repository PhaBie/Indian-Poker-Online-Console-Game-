import { describe, expect, test } from 'bun:test';
import {
  sanitizeUsernameInput,
  validateUsernameLength,
  clampUsernameInput,
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
} from '../../../src/client/ui/screens/username/useUsernameInput';

describe('12. ระบบป้อนชื่อผู้เล่น (Username Input UI)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test.each([
      ['Maverick', 'Maverick'],
      ['   Alice   ', 'Alice'],
      ['NAME    Dan   ', 'Dan'],
    ])(
      '[sanitizeUsernameInput] 12.1 ทำความสะอาดชื่อผู้เล่น "%s" → ได้ผลลัพธ์เป็น "%s"',
      (rawUsernameInput, expectedSanitizedNickname) => {
        expect(sanitizeUsernameInput(rawUsernameInput)).toBe(expectedSanitizedNickname);
      },
    );

    test.each([
      ['Maverick', 'Maverick'],
      ['sdsdsddddsdsdsdssdsdsds', 'sdsdsddddsds'],
      ['name sdsdsddddsdsdsdssdsdsds', 'name sdsdsddddsds'],
    ])(
      '[clampUsernameInput] 12.2 ตัดทอนความยาวข้อความเมื่อเกินขีดจำกัด "%s" → ได้ผลลัพธ์เป็น "%s"',
      (rawCandidateInput, expectedClampedOutput) => {
        expect(clampUsernameInput(rawCandidateInput)).toBe(expectedClampedOutput);
      },
    );

    test('[validateUsernameLength] 12.3 ตรวจสอบชื่อผู้เล่นที่มีความยาวถูกต้องตามขอบเขต (3 ถึง 12 ตัวอักษร) → ผ่านการตรวจสอบสำเร็จ', () => {
      const minimumBoundaryOutcome = validateUsernameLength('Ace');
      expect(minimumBoundaryOutcome.isValid).toBe(true);
      expect(minimumBoundaryOutcome.errorMessage).toBeNull();

      const optimalLengthOutcome = validateUsernameLength('LuckyStrike');
      expect(optimalLengthOutcome.isValid).toBe(true);
      expect(optimalLengthOutcome.errorMessage).toBeNull();

      const maximumBoundaryOutcome = validateUsernameLength('TwelveLetter');
      expect(maximumBoundaryOutcome.isValid).toBe(true);
      expect(maximumBoundaryOutcome.errorMessage).toBeNull();
    });
  });

  describe('กรณีข้อผิดพลาดและขอบเขตข้อมูล (Unhappy Paths & Boundaries)', () => {
    test('[validateUsernameLength] 12.4 ตรวจสอบชื่อผู้เล่นว่างเปล่า สั้นเกินไป หรือยาวเกินไป → ไม่ผ่านการตรวจสอบพร้อมข้อความแจ้งเตือนที่ถูกต้อง', () => {
      const emptyNameOutcome = validateUsernameLength('');
      expect(emptyNameOutcome.isValid).toBe(false);
      expect(emptyNameOutcome.errorMessage).toBe('Username cannot be empty');

      const tooShortNameOutcome = validateUsernameLength('ab');
      expect(tooShortNameOutcome.isValid).toBe(false);
      expect(tooShortNameOutcome.errorMessage).toBe(
        `Username must be at least ${MIN_USERNAME_LENGTH} characters`,
      );

      const tooLongNameOutcome = validateUsernameLength('ThirteenChars');
      expect(tooLongNameOutcome.isValid).toBe(false);
      expect(tooLongNameOutcome.errorMessage).toBe(
        `Username must not exceed ${MAX_USERNAME_LENGTH} characters`,
      );
    });
  });
});
