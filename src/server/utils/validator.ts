import { z } from 'zod';
import type { ClientEvent } from '../../shared/types';

/**
 * รายการประเภทการกระทำทั้งหมดของผู้เล่นในเกม
 */
const gameActionTypeSchema = z.enum([
  'BET',
  'CALL',
  'RAISE',
  'FOLD',
  'SHOW',
  'SIDESHOW',
  'SEEN',
  'ACCEPT_SIDESHOW',
  'REJECT_SIDESHOW',
]);

/**
 * Schema สำหรับ Event: CREATE_ROOM
 */
export const createRoomEventSchema = z.object({
  type: z.literal('CREATE_ROOM'),
  payload: z.object({
    playerName: z.string().trim().min(1),
    bootAmount: z.number().int().positive(),
    maxPlayers: z.number().int().positive().optional(),
  }),
});

/**
 * Schema สำหรับ Event: JOIN_ROOM
 */
export const joinRoomEventSchema = z.object({
  type: z.literal('JOIN_ROOM'),
  payload: z.object({
    playerName: z.string().trim().min(1),
    roomId: z.string().trim(),
    reconnectToken: z.string().trim().min(1).optional(),
  }),
});

/**
 * Schema สำหรับ Event: LEAVE_ROOM
 */
export const leaveRoomEventSchema = z.object({
  type: z.literal('LEAVE_ROOM'),
});

/**
 * Schema สำหรับ Event: START_GAME
 */
export const startGameEventSchema = z.object({
  type: z.literal('START_GAME'),
});

/**
 * Schema สำหรับ Event: SAVE_GAME
 */
export const saveGameEventSchema = z.object({
  type: z.literal('SAVE_GAME'),
});

/**
 * Schema สำหรับ Event: LOAD_GAME
 */
export const loadGameEventSchema = z.object({
  type: z.literal('LOAD_GAME'),
  payload: z.object({
    roomId: z.string().trim().min(1),
  }),
});

/**
 * Schema สำหรับ Event: SEND_CHAT
 */
export const sendChatEventSchema = z.object({
  type: z.literal('SEND_CHAT'),
  payload: z.object({
    message: z.string(),
  }),
});

/**
 * Schema สำหรับ Event: PLAYER_ACTION
 */
export const playerActionEventSchema = z.object({
  type: z.literal('PLAYER_ACTION'),
  payload: z.object({
    action: gameActionTypeSchema,
    amount: z.number().int().nonnegative().optional(),
  }),
});

/**
 * Schema สำหรับ Event: TOGGLE_READY
 */
export const toggleReadyEventSchema = z.object({
  type: z.literal('TOGGLE_READY'),
});

export const resetLobbyEventSchema = z.object({
  type: z.literal('RESET_LOBBY'),
});

export const getRoomsEventSchema = z.object({
  type: z.literal('GET_ROOMS'),
});

/**
 * รวม Schema ของ ClientEvent ทั้งหมดโดยใช้ type เป็นตัวจำแนก (Discriminated Union)
 */
export const clientEventSchema = z.discriminatedUnion('type', [
  createRoomEventSchema,
  joinRoomEventSchema,
  getRoomsEventSchema,
  leaveRoomEventSchema,
  startGameEventSchema,
  toggleReadyEventSchema,
  resetLobbyEventSchema,
  saveGameEventSchema,
  loadGameEventSchema,
  sendChatEventSchema,
  playerActionEventSchema,
]);

/**
 * คลาสสำหรับตรวจสอบและคัดกรองข้อมูลฝั่ง Server
 */
export class Validator {
  /**
   * ตรวจสอบความถูกต้องของข้อมูล ClientEvent ที่ได้รับจาก WebSocket
   * รองรับทั้ง JSON Object ดิบ, Buffer/Uint8Array และ JSON String
   * คืนค่า ClientEvent หากข้อมูลถูกต้อง หรือคืนค่า null หากข้อมูลไม่ถูกต้อง
   */
  public validateClientEvent(event: unknown): ClientEvent | null {
    if (event === null || event === undefined) {
      return null;
    }

    let parsedEvent = event;

    if (typeof event === 'string') {
      try {
        parsedEvent = JSON.parse(event);
      } catch {
        return null;
      }
    } else if (
      (typeof Buffer !== 'undefined' && Buffer.isBuffer(event)) ||
      event instanceof Uint8Array
    ) {
      try {
        parsedEvent = JSON.parse(event.toString());
      } catch {
        return null;
      }
    }

    const parseResult = clientEventSchema.safeParse(parsedEvent);
    if (!parseResult.success) {
      return null;
    }

    return parseResult.data as ClientEvent;
  }

  /**
   * ทำความสะอาดข้อความสตริง
   * - ตัดช่องว่างส่วนเกินที่หัวและท้ายข้อความ (trim)
   * - ลบแท็ก HTML เพื่อป้องกัน XSS
   * - ลบ Control Characters และ ANSI Escape Codes ป้องกันการแสดงผลผิดเพี้ยนบน Console
   */
  public sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/<[^>]*>/g, '')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim();
  }
}

export default Validator;
