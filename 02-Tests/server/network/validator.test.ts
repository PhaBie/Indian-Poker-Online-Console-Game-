import { describe, expect, test } from 'bun:test';
import { Validator } from '../../../01-Source-code/server/network/validator';
import type { ClientEvent } from '../../../01-Source-code/shared/types';

describe('6. การตรวจสอบ Event ของระบบ (Validator)', () => {
  const validator = new Validator();

  type NoPayloadClientEvent = Extract<
    ClientEvent,
    {
      type:
        | 'GET_ROOMS'
        | 'LEAVE_ROOM'
        | 'START_GAME'
        | 'NEXT_GAME'
        | 'END_GAME'
        | 'TOGGLE_READY'
        | 'RESET_LOBBY'
        | 'SAVE_GAME';
    }
  >;

  type PayloadClientEvent = Extract<
    ClientEvent,
    {
      type: 'CREATE_ROOM' | 'JOIN_ROOM' | 'LOAD_GAME' | 'SEND_CHAT' | 'PLAYER_ACTION';
    }
  >;

  const validNoPayloadEvents: [NoPayloadClientEvent['type'], NoPayloadClientEvent][] = [
    ['GET_ROOMS', { type: 'GET_ROOMS' }],
    ['LEAVE_ROOM', { type: 'LEAVE_ROOM' }],
    ['START_GAME', { type: 'START_GAME' }],
    ['NEXT_GAME', { type: 'NEXT_GAME' }],
    ['END_GAME', { type: 'END_GAME' }],
    ['TOGGLE_READY', { type: 'TOGGLE_READY' }],
    ['RESET_LOBBY', { type: 'RESET_LOBBY' }],
    ['SAVE_GAME', { type: 'SAVE_GAME' }],
  ];

  const validPayloadEvents: [PayloadClientEvent['type'], PayloadClientEvent][] = [
    [
      'CREATE_ROOM',
      { type: 'CREATE_ROOM', payload: { playerName: 'Alice', bootAmount: 50 } },
    ],
    [
      'JOIN_ROOM',
      { type: 'JOIN_ROOM', payload: { playerName: 'Bob', roomId: 'room-1' } },
    ],
    ['LOAD_GAME', { type: 'LOAD_GAME', payload: { roomId: 'room-1' } }],
    ['SEND_CHAT', { type: 'SEND_CHAT', payload: { message: 'Hello' } }],
    ['PLAYER_ACTION', { type: 'PLAYER_ACTION', payload: { action: 'CALL' } }],
  ];

  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test.each(validNoPayloadEvents)(
      '[Validator.validateClientEvent] 6.1.%# ส่ง Event ไม่มี Payload ที่ถูกต้อง (%s) → ผ่านการตรวจสอบและคืนค่า Event',
      (_eventType, validEvent) => {
        const result = validator.validateClientEvent(validEvent);
        expect(result).toEqual(validEvent);
      },
    );

    test.each(validPayloadEvents)(
      '[Validator.validateClientEvent] 6.2.%# ส่ง Event มี Payload ที่ถูกต้อง (%s) → ผ่านการตรวจสอบและคืนค่า Event',
      (_eventType, validEvent) => {
        const result = validator.validateClientEvent(validEvent);
        expect(result).toEqual(validEvent);
      },
    );

    test('[Validator.validateClientEvent] 6.3 ส่ง JSON string ของ Event ที่ถูกต้อง → ผ่านการตรวจสอบและแปลงเป็น Event ได้สำเร็จ', () => {
      const expectedEvent = { type: 'GET_ROOMS' as const };
      const jsonString = JSON.stringify(expectedEvent);
      const result = validator.validateClientEvent(jsonString);
      expect(result).toEqual(expectedEvent);
    });
  });

  describe('กรณีข้อผิดพลาด (Unhappy Paths)', () => {
    test.each(validNoPayloadEvents)(
      '[Validator.validateClientEvent] 6.4.%# ส่ง Event ไม่มี Payload ที่มีฟิลด์ส่วนเกินที่ระดับ Event ภายนอก (%s) → ปฏิเสธและคืนค่า null',
      (_eventType, validEvent) => {
        const invalidEvent = { ...validEvent, unexpectedField: true };
        const result = validator.validateClientEvent(invalidEvent);
        expect(result).toBeNull();
      },
    );

    test.each(validPayloadEvents)(
      '[Validator.validateClientEvent] 6.5.%# ส่ง Event มี Payload ที่มีฟิลด์ส่วนเกินที่ระดับ Event ภายนอก (%s) → ปฏิเสธและคืนค่า null',
      (_eventType, validEvent) => {
        const invalidEvent = { ...validEvent, unexpectedField: true };
        const result = validator.validateClientEvent(invalidEvent);
        expect(result).toBeNull();
      },
    );

    test.each(validPayloadEvents)(
      '[Validator.validateClientEvent] 6.6.%# ส่ง Event มี Payload ที่มีฟิลด์ส่วนเกินภายใน Payload (%s) → ปฏิเสธและคืนค่า null',
      (_eventType, validEvent) => {
        const invalidEvent = {
          ...validEvent,
          payload: { ...validEvent.payload, unexpectedNestedField: true },
        };
        const result = validator.validateClientEvent(invalidEvent);
        expect(result).toBeNull();
      },
    );

    test.each([
      ['ข้อมูลเป็น null', null],
      ['ข้อมูลเป็น undefined', undefined],
      ['JSON String รูปแบบไม่ถูกต้อง', '{ invalidJson: }'],
      ['Event Type ที่ไม่มีในระบบ', { type: 'UNKNOWN_EVENT' }],
    ])(
      '[Validator.validateClientEvent] 6.7.%# ส่งข้อมูลไม่ถูกต้อง (%s) → ปฏิเสธและคืนค่า null',
      (_description, invalidInput) => {
        const result = validator.validateClientEvent(invalidInput);
        expect(result).toBeNull();
      },
    );
  });
});
