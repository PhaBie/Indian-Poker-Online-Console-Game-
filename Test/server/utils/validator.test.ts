import { expect, test, describe } from 'bun:test';
import { Validator } from '../../../src/server/utils/validator';

describe('5. ระบบตรวจสอบและคัดกรองข้อมูล (Validator)', () => {
  const validator = new Validator();

  describe('Validator.validateClientEvent - Happy Paths', () => {
    test('[Validator.validateClientEvent] 5.5 CREATE_ROOM ข้อมูลถูกต้องครบถ้วนและตัดช่องว่างชื่อผู้เล่น → คืนค่า ClientEvent ถูกต้อง', () => {
      const payload = {
        type: 'CREATE_ROOM',
        payload: {
          playerName: '  Thanathon  ',
          bootAmount: 100,
        },
      };

      const result = validator.validateClientEvent(payload);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('CREATE_ROOM');
      if (result && result.type === 'CREATE_ROOM') {
        expect(result.payload.playerName).toBe('Thanathon');
        expect(result.payload.bootAmount).toBe(100);
      }
    });

    test('[Validator.validateClientEvent] 5.6 JOIN_ROOM ข้อมูลถูกต้องทั้งแบบมีและไม่มี reconnectToken → คืนค่า ClientEvent ถูกต้อง', () => {
      const eventWithoutToken = {
        type: 'JOIN_ROOM',
        payload: {
          playerName: 'PlayerTwo',
          roomId: 'ROOM_001',
        },
      };
      const eventWithToken = {
        type: 'JOIN_ROOM',
        payload: {
          playerName: 'PlayerTwo',
          roomId: 'ROOM_001',
          reconnectToken: 'reconnect_token_123',
        },
      };

      const resultWithoutToken = validator.validateClientEvent(eventWithoutToken);
      const resultWithToken = validator.validateClientEvent(eventWithToken);

      expect(resultWithoutToken).not.toBeNull();
      expect(resultWithoutToken?.type).toBe('JOIN_ROOM');
      expect(resultWithToken).not.toBeNull();
      expect(resultWithToken?.type).toBe('JOIN_ROOM');
      if (resultWithToken && resultWithToken.type === 'JOIN_ROOM') {
        expect(resultWithToken.payload.reconnectToken).toBe('reconnect_token_123');
      }
    });

    test('[Validator.validateClientEvent] 5.7 LEAVE_ROOM ข้อมูลถูกต้อง → คืนค่า ClientEvent ถูกต้อง', () => {
      const event = { type: 'LEAVE_ROOM' };

      const result = validator.validateClientEvent(event);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('LEAVE_ROOM');
    });

    test('[Validator.validateClientEvent] 5.8 START_GAME ข้อมูลถูกต้อง → คืนค่า ClientEvent ถูกต้อง', () => {
      const event = { type: 'START_GAME' };

      const result = validator.validateClientEvent(event);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('START_GAME');
    });

    test('[Validator.validateClientEvent] 5.9 SAVE_GAME ข้อมูลถูกต้อง → คืนค่า ClientEvent ถูกต้อง', () => {
      const event = { type: 'SAVE_GAME' };

      const result = validator.validateClientEvent(event);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('SAVE_GAME');
    });

    test('[Validator.validateClientEvent] 5.10 LOAD_GAME ข้อมูล roomId ถูกต้อง → คืนค่า ClientEvent ถูกต้อง', () => {
      const event = {
        type: 'LOAD_GAME',
        payload: { roomId: 'ROOM_999' },
      };

      const result = validator.validateClientEvent(event);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('LOAD_GAME');
      if (result && result.type === 'LOAD_GAME') {
        expect(result.payload.roomId).toBe('ROOM_999');
      }
    });

    test('[Validator.validateClientEvent] 5.11 SEND_CHAT ข้อความแชทถูกต้อง → คืนค่า ClientEvent ถูกต้อง', () => {
      const event = {
        type: 'SEND_CHAT',
        payload: { message: 'Good luck everyone!' },
      };

      const result = validator.validateClientEvent(event);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('SEND_CHAT');
      if (result && result.type === 'SEND_CHAT') {
        expect(result.payload.message).toBe('Good luck everyone!');
      }
    });

    test('[Validator.validateClientEvent] 5.12 PLAYER_ACTION ครอบคลุมการกระทำทุกประเภท → คืนค่า ClientEvent ถูกต้อง', () => {
      const actionsWithAmount = [
        { action: 'BET', amount: 50 },
        { action: 'RAISE', amount: 100 },
      ] as const;

      const actionsWithoutAmount = [
        { action: 'CALL' },
        { action: 'FOLD' },
        { action: 'SHOW' },
        { action: 'SIDESHOW' },
        { action: 'SEEN' },
      ] as const;

      for (const item of actionsWithAmount) {
        const result = validator.validateClientEvent({
          type: 'PLAYER_ACTION',
          payload: item,
        });
        expect(result).not.toBeNull();
        expect(result?.type).toBe('PLAYER_ACTION');
      }

      for (const item of actionsWithoutAmount) {
        const result = validator.validateClientEvent({
          type: 'PLAYER_ACTION',
          payload: item,
        });
        expect(result).not.toBeNull();
        expect(result?.type).toBe('PLAYER_ACTION');
      }
    });

    test('[Validator.validateClientEvent] 5.13 รองรับ Input ในรูปแบบ JSON String → แปลงและคืนค่า ClientEvent ถูกต้อง', () => {
      const jsonString = JSON.stringify({
        type: 'CREATE_ROOM',
        payload: { playerName: 'JsonPlayer', bootAmount: 200 },
      });

      const result = validator.validateClientEvent(jsonString);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('CREATE_ROOM');
      if (result && result.type === 'CREATE_ROOM') {
        expect(result.payload.playerName).toBe('JsonPlayer');
        expect(result.payload.bootAmount).toBe(200);
      }
    });

    test('[Validator.validateClientEvent] 5.14 รองรับ Input ในรูปแบบ Buffer → แปลงและคืนค่า ClientEvent ถูกต้อง', () => {
      const bufferData = Buffer.from(
        JSON.stringify({
          type: 'START_GAME',
        }),
      );

      const result = validator.validateClientEvent(bufferData);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('START_GAME');
    });

    test('[Validator.validateClientEvent] 5.15 รองรับ Input ในรูปแบบ Uint8Array → แปลงและคืนค่า ClientEvent ถูกต้อง', () => {
      const encoder = new TextEncoder();
      const uint8ArrayData = encoder.encode(
        JSON.stringify({
          type: 'LEAVE_ROOM',
        }),
      );

      const result = validator.validateClientEvent(uint8ArrayData);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('LEAVE_ROOM');
    });
  });

  describe('Validator.validateClientEvent - Unhappy Paths & Edge Cases', () => {
    test('[Validator.validateClientEvent] 5.16 รับค่า null หรือ undefined → คืนค่า null', () => {
      expect(validator.validateClientEvent(null)).toBeNull();
      expect(validator.validateClientEvent(undefined)).toBeNull();
    });

    test('[Validator.validateClientEvent] 5.17 รับค่าที่ไม่ใช่ออบเจกต์หรือสตริงที่แปลงได้ → คืนค่า null', () => {
      expect(validator.validateClientEvent(12345)).toBeNull();
      expect(validator.validateClientEvent(true)).toBeNull();
      expect(validator.validateClientEvent(false)).toBeNull();
      expect(validator.validateClientEvent([])).toBeNull();
    });

    test('[Validator.validateClientEvent] 5.18 รับ JSON String ที่รูปแบบผิดไวยากรณ์ → คืนค่า null', () => {
      const malformedJson = '{"type": "CREATE_ROOM", "payload": ';

      expect(validator.validateClientEvent(malformedJson)).toBeNull();
    });

    test('[Validator.validateClientEvent] 5.19 รับ Event ที่ไม่มี type หรือ type ไม่รองรับในระบบ → คืนค่า null', () => {
      expect(validator.validateClientEvent({})).toBeNull();
      expect(
        validator.validateClientEvent({ type: 'UNSUPPORTED_EVENT_TYPE' }),
      ).toBeNull();
      expect(validator.validateClientEvent({ type: 123 })).toBeNull();
    });

    test('[Validator.validateClientEvent] 5.20 CREATE_ROOM ชื่อผู้เล่นเป็นค่าว่างหรือมีแต่ช่องว่าง → คืนค่า null', () => {
      const emptyNameEvent = {
        type: 'CREATE_ROOM',
        payload: { playerName: '', bootAmount: 50 },
      };
      const whitespaceNameEvent = {
        type: 'CREATE_ROOM',
        payload: { playerName: '     ', bootAmount: 50 },
      };

      expect(validator.validateClientEvent(emptyNameEvent)).toBeNull();
      expect(validator.validateClientEvent(whitespaceNameEvent)).toBeNull();
    });

    test('[Validator.validateClientEvent] 5.21 CREATE_ROOM ขาดฟิลด์ bootAmount หรือ bootAmount น้อยกว่าหรือเท่ากับศูนย์ → คืนค่า null', () => {
      const missingBootAmount = {
        type: 'CREATE_ROOM',
        payload: { playerName: 'Player' },
      };
      const zeroBootAmount = {
        type: 'CREATE_ROOM',
        payload: { playerName: 'Player', bootAmount: 0 },
      };
      const negativeBootAmount = {
        type: 'CREATE_ROOM',
        payload: { playerName: 'Player', bootAmount: -50 },
      };

      expect(validator.validateClientEvent(missingBootAmount)).toBeNull();
      expect(validator.validateClientEvent(zeroBootAmount)).toBeNull();
      expect(validator.validateClientEvent(negativeBootAmount)).toBeNull();
    });

    test('[Validator.validateClientEvent] 5.22 CREATE_ROOM bootAmount เป็นทศนิยมหรือสตริง → คืนค่า null', () => {
      const floatBootAmount = {
        type: 'CREATE_ROOM',
        payload: { playerName: 'Player', bootAmount: 50.75 },
      };
      const stringBootAmount = {
        type: 'CREATE_ROOM',
        payload: { playerName: 'Player', bootAmount: '100' },
      };

      expect(validator.validateClientEvent(floatBootAmount)).toBeNull();
      expect(validator.validateClientEvent(stringBootAmount)).toBeNull();
    });

    test('[Validator.validateClientEvent] 5.23 CREATE_ROOM bootAmount เกินขอบเขตจำนวนเต็มปลอดภัย → คืนค่า null', () => {
      const overflowBootAmount = {
        type: 'CREATE_ROOM',
        payload: { playerName: 'Player', bootAmount: 1e30 },
      };

      expect(validator.validateClientEvent(overflowBootAmount)).toBeNull();
    });

    test('[Validator.validateClientEvent] 5.24 JOIN_ROOM ขาด playerName หรือ roomId หรือเป็นค่าว่าง → คืนค่า null', () => {
      const missingPlayerName = {
        type: 'JOIN_ROOM',
        payload: { roomId: 'ROOM_001' },
      };
      const emptyPlayerName = {
        type: 'JOIN_ROOM',
        payload: { playerName: '   ', roomId: 'ROOM_001' },
      };
      const missingRoomId = {
        type: 'JOIN_ROOM',
        payload: { playerName: 'Player' },
      };
      const emptyRoomId = {
        type: 'JOIN_ROOM',
        payload: { playerName: 'Player', roomId: '   ' },
      };

      expect(validator.validateClientEvent(missingPlayerName)).toBeNull();
      expect(validator.validateClientEvent(emptyPlayerName)).toBeNull();
      expect(validator.validateClientEvent(missingRoomId)).toBeNull();
      expect(validator.validateClientEvent(emptyRoomId)).toBeNull();
    });

    test('[Validator.validateClientEvent] 5.25 LOAD_GAME ขาด roomId หรือ roomId เป็นค่าว่าง → คืนค่า null', () => {
      const missingRoomId = {
        type: 'LOAD_GAME',
        payload: {},
      };
      const emptyRoomId = {
        type: 'LOAD_GAME',
        payload: { roomId: '   ' },
      };

      expect(validator.validateClientEvent(missingRoomId)).toBeNull();
      expect(validator.validateClientEvent(emptyRoomId)).toBeNull();
    });

    test('[Validator.validateClientEvent] 5.26 PLAYER_ACTION การกระทำไม่อยู่ในรายการที่กำหนด → คืนค่า null', () => {
      const invalidAction = {
        type: 'PLAYER_ACTION',
        payload: { action: 'UNKNOWN_ACTION' },
      };

      expect(validator.validateClientEvent(invalidAction)).toBeNull();
    });

    test('[Validator.validateClientEvent] 5.27 PLAYER_ACTION กำหนดยอดเงินติดลบหรือเป็นทศนิยม → คืนค่า null', () => {
      const negativeAmount = {
        type: 'PLAYER_ACTION',
        payload: { action: 'BET', amount: -100 },
      };
      const decimalAmount = {
        type: 'PLAYER_ACTION',
        payload: { action: 'RAISE', amount: 100.5 },
      };

      expect(validator.validateClientEvent(negativeAmount)).toBeNull();
      expect(validator.validateClientEvent(decimalAmount)).toBeNull();
    });
  });

  describe('Validator.sanitizeInput - Happy Paths', () => {
    test('[Validator.sanitizeInput] 5.28 ข้อความปกติ → คืนค่าข้อความเดิมที่ตัดช่องว่างหัวท้าย', () => {
      expect(validator.sanitizeInput('Hello World')).toBe('Hello World');
      expect(validator.sanitizeInput('   Hello World   ')).toBe('Hello World');
    });

    test('[Validator.sanitizeInput] 5.29 ข้อความที่มีแท็ก HTML ทั่วไป → ลบแท็ก HTML ออกทั้งหมด', () => {
      expect(validator.sanitizeInput('<b>Bold Text</b>')).toBe('Bold Text');
      expect(validator.sanitizeInput('<p>Paragraph with <i>italic</i></p>')).toBe(
        'Paragraph with italic',
      );
    });

    test('[Validator.sanitizeInput] 5.30 ข้อความที่มีแท็ก script หรือ attributes อันตราย → กรองแท็กออกเหลือเฉพาะข้อความ', () => {
      expect(validator.sanitizeInput('<script>alert("hack")</script>Safe Text')).toBe(
        'alert("hack")Safe Text',
      );
      expect(
        validator.sanitizeInput('<div style="color:red;" onclick="evil()">Content</div>'),
      ).toBe('Content');
    });

    test('[Validator.sanitizeInput] 5.31 ข้อความที่มีแท็กเดี่ยวแบบ Self-closing → ลบแท็กออกทั้งหมด', () => {
      expect(
        validator.sanitizeInput('Before <img src="x" onerror="evil()" /> After'),
      ).toBe('Before  After');
      expect(validator.sanitizeInput('<br/>Line')).toBe('Line');
    });
  });

  describe('Validator.sanitizeInput - Unhappy Paths & Edge Cases', () => {
    test('[Validator.sanitizeInput] 5.32 รับค่าที่ไม่ใช่สตริง → คืนค่าสตริงว่าง', () => {
      expect(validator.sanitizeInput(null as unknown as string)).toBe('');
      expect(validator.sanitizeInput(undefined as unknown as string)).toBe('');
      expect(validator.sanitizeInput(12345 as unknown as string)).toBe('');
      expect(validator.sanitizeInput({} as unknown as string)).toBe('');
      expect(validator.sanitizeInput([] as unknown as string)).toBe('');
    });

    test('[Validator.sanitizeInput] 5.33 รับสตริงว่างหรือมีแต่ช่องว่าง → คืนค่าสตริงว่าง', () => {
      expect(validator.sanitizeInput('')).toBe('');
      expect(validator.sanitizeInput('     ')).toBe('');
    });

    test('[Validator.sanitizeInput] 5.34 รับสตริงที่มีเฉพาะแท็ก HTML → คืนค่าสตริงว่าง', () => {
      expect(validator.sanitizeInput('<div><span></span></div>')).toBe('');
      expect(validator.sanitizeInput('<br><hr>')).toBe('');
    });

    test('[Validator.sanitizeInput] 5.35 ข้อความที่มี Control Characters → ลบอักขระควบคุมออก', () => {
      const rawWithControlChars = 'Text\x00With\x07Control\x1FChars\x7F';

      expect(validator.sanitizeInput(rawWithControlChars)).toBe('TextWithControlChars');
    });
  });
});
