import { expect } from 'bun:test';
import { GameError } from '../../../../src/server/domain/errors/GameError';

/**
 * ฟังก์ชันช่วยเหลือ (Helper) สำหรับดักจับและตรวจสอบ Error ที่คาดหวังใน Game Logic
 *
 * สาเหตุที่ต้องใช้ฟังก์ชันนี้:
 * ปกติ \`expect(() => ...).toThrow()\` ของลอจิกเทสต์ มักจะเช็คแค่คลาสของ Error
 * แต่ในระบบนี้ GameError คลาสเดียวกัน จะมี Error Code แตกต่างกันไปตามสาเหตุ
 * ฟังก์ชันนี้จึงช่วยตรวจสอบทั้ง "ประเภทคลาส" และ "รหัสข้อผิดพลาด" ให้ถูกต้องในคราวเดียว
 *
 * @param fn - ฟังก์ชันหรือการทำงานที่คาดว่าจะเกิด Error
 * @param expectedCode - รหัส GameError Code ที่คาดหวัง (เช่น 'INVALID_AMOUNT')
 */
export const expectGameErrorWithCode = (fn: () => void, expectedCode: string) => {
  let thrownError: unknown;

  // 1. ลองรันฟังก์ชันและจับ Error ที่โยนออกมา
  try {
    fn();
  } catch (error) {
    thrownError = error;
  }

  // 2. ตรวจสอบว่ามี Error เกิดขึ้นจริง และเป็นประเภท GameError
  expect(thrownError).toBeInstanceOf(GameError);

  // 3. ตรวจสอบว่ารหัส Code ตรงกับที่คาดหวังไว้หรือไม่
  expect((thrownError as GameError).code).toBe(expectedCode);
};
