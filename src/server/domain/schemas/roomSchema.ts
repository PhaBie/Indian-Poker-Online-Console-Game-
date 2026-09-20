import { z } from 'zod';
import { playerSaveSchema, savedCardSchema } from './playerSchema';

/**
 * โครงสร้างข้อมูลโต๊ะเกมสำหรับบันทึกและกู้คืนสถานะ (Save/Load GameState Schema)
 *
 * ใช้ Zod ในการตรวจสอบความถูกต้องของข้อมูลโต๊ะเกมที่กำลังเล่นค้างอยู่:
 * - ป้องกันข้อมูลผิดพลาด เช่น ค่าติดลบ หรือชนิดข้อมูลไม่ตรง
 * - กำหนดค่าเริ่มต้น (Default value) อัตโนมัติในกรณีที่ข้อมูลบางตัวไม่ได้ถูกระบุ
 */
export const gameStateSaveSchema = z.object({
  // ยอดเงินเดิมพันกองกลาง (Pot) ต้องเป็นจำนวนเต็มไม่ติดลบ (ค่าเริ่มต้น 0)
  pot: z.number().int().nonnegative().default(0),

  // ยอดเงินเดิมพันขั้นต่ำของรอบนั้น (Current Stake)
  currentStake: z.number().int().nonnegative().optional(),

  // ลำดับ Index ของผู้เล่นปัจจุบันที่ถึงตาเล่น (Current Player Index)
  currentPlayerIndex: z.number().int().nonnegative().default(0),

  // รายการไพ่ที่เหลืออยู่ในสำรับ (Deck) ตรวจสอบความถูกต้องตาม savedCardSchema
  deck: z.array(savedCardSchema).default([]),

  // รายชื่อผู้เล่นที่ยังอยู่ในการเล่นรอบนี้ (Active Players)
  activePlayers: z.array(z.unknown()).optional(),

  // ค่าชิปตั้งต้นสำหรับเปิดโต๊ะเกม (Boot Amount)
  bootAmount: z.number().int().nonnegative().optional(),

  // ขีดจำกัดเงินเดิมพันกองกลางสูงสุด (Max Pot Limit) ค่าเริ่มต้น 10,000
  maxPotLimit: z.number().int().positive().default(10000),

  // ลำดับ Index ของตำแหน่งคนแจกไพ่ (Dealer Index)
  dealerIndex: z.number().int().nonnegative().default(0),
});

/**
 * โครงสร้างข้อมูลห้องสำหรับบันทึกและกู้คืนสถานะ (Save/Load Room Schema)
 *
 * ใช้ Zod ตรวจสอบความสมบูรณ์ของโครงสร้างห้อง (Room Data) ตอนโหลดกลับมาจากเซฟ:
 * - รหัสห้อง (roomId) ห้ามว่างเปล่า
 * - สถานะห้อง (phase) ต้องตรงตามเงื่อนไข 'LOBBY' | 'PLAYING' | 'ENDED'
 * - ผู้เล่น (players) ตรวจสอบผ่าน playerSaveSchema อย่างเข้มงวด
 * - โต๊ะเกม (gameState) รองรับทั้งกรณีไม่มีเกม (null) หรือมีเกมเล่นค้างอยู่
 */
export const roomSaveSchema = z.object({
  // รหัสระบุห้อง ต้องเป็นข้อความที่ไม่ใช่ค่าว่าง (Non-empty string)
  roomId: z.string().min(1),

  // สถานะปัจจุบันของห้องเกม โดยค่าเริ่มต้นเมื่อสร้างห้องคือ LOBBY
  phase: z.enum(['LOBBY', 'PLAYING', 'ENDED']).default('LOBBY'),

  // รหัสผู้เล่นที่เป็นหัวหน้าห้อง (Host ID) สามารถเป็น null ได้หากยังไม่มีโฮสต์
  hostId: z.string().nullable().default(null),

  // ค่าชิปตั้งต้นสำหรับเข้าร่วมห้อง (Boot Amount) ต้องเป็นจำนวนเต็มบวก (ค่าเริ่มต้น 50)
  bootAmount: z.number().int().positive().default(50),

  // จำนวนผู้เล่นสูงสุดของห้อง รองรับเฉพาะโต๊ะ 2–4 คน
  maxPlayers: z.number().int().min(2).max(4).default(4),

  // รายชื่อผู้เล่นทุกคนในห้อง ตรวจสอบความถูกต้องผ่าน playerSaveSchema
  players: z.array(playerSaveSchema).default([]),

  // ข้อมูลโต๊ะเกม (จะมีข้อมูลเฉพาะเมื่อ phase เป็น PLAYING)
  gameState: gameStateSaveSchema.nullable().optional(),
});

/**
 * Type Definition ที่สร้างขึ้นอัตโนมัติจาก Zod Schema (Type Inference)
 * เพื่อใช้กำหนดชนิดข้อมูลให้กับตัวแปรใน TypeScript โดยไม่ต้องเขียน Type ซ้ำซ้อน
 */
export type RoomSerializedData = z.infer<typeof roomSaveSchema>;
export type GameStateSerializedData = z.infer<typeof gameStateSaveSchema>;
