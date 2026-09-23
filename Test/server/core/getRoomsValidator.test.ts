import { describe, expect, test } from 'bun:test';
import { Validator } from '../../../src/server/utils/validator';

describe('6. การตรวจสอบ Event ของระบบ (Validator)', () => {
  const validator = new Validator();

  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test('[Validator.validateClientEvent] 6.1 ส่ง Event Object GET_ROOMS ที่ถูกต้อง → ผ่านการตรวจสอบและคืนค่า Event', () => {
      const validEvent = { type: 'GET_ROOMS' };
      const result = validator.validateClientEvent(validEvent);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('GET_ROOMS');
    });

    test('[Validator.validateClientEvent] 6.2 ส่ง JSON string ของ Event GET_ROOMS ที่ถูกต้อง → ผ่านการตรวจสอบและแปลงเป็น Event ได้สำเร็จ', () => {
      const jsonString = JSON.stringify({ type: 'GET_ROOMS' });
      const result = validator.validateClientEvent(jsonString);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('GET_ROOMS');
    });
  });

  describe('กรณีข้อผิดพลาด (Unhappy Paths)', () => {
    test('[Validator.validateClientEvent] 6.3 ส่ง Event GET_ROOMS ที่มีฟิลด์ส่วนเกินที่ระดับ Event ภายนอก (Strict Mode) → ปฏิเสธและคืนค่า null', () => {
      const invalidEvent = { type: 'GET_ROOMS', extra: 123 };
      const result = validator.validateClientEvent(invalidEvent);
      expect(result).toBeNull();
    });

    test('[Validator.validateClientEvent] 6.4 ส่ง Event ที่มีฟิลด์ส่วนเกินซ่อนอยู่ภายใน payload (Strict Mode) → ปฏิเสธและคืนค่า null', () => {
      const invalidEvent = {
        type: 'JOIN_ROOM',
        payload: {
          playerName: 'Tester',
          roomId: 'room123',
          unexpectedField: true,
        },
      };
      const result = validator.validateClientEvent(invalidEvent);
      expect(result).toBeNull();
    });
  });
});
