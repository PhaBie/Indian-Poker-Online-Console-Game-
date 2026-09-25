import { z } from 'zod';

// ระบุค่าที่อนุญาตให้ตรงกับชนิด Rank ของโปรเจกต์
const savedRankSchema = z.union([
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
  z.literal(10),
  z.literal(11),
  z.literal(12),
  z.literal(13),
  z.literal(14),
]);

// กำหนดรูปแบบไพ่แต่ละใบสำหรับข้อมูลที่โหลดกลับมา
export const savedCardSchema = z.object({
  // ดอกไพ่ต้องเป็นหนึ่งในสี่ค่านี้เท่านั้น
  suit: z.enum(['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS']),

  // แต้มต้องเป็นจำนวนเต็มตั้งแต่ 2 ถึง 14 โดย 14 แทน A
  rank: savedRankSchema,
});

// ข้อมูลสำหรับสร้าง Player กลับจากไฟล์บันทึก
// ทุกฟิลด์จำเป็นต้องมี เพราะไม่ได้กำหนด optional หรือ default
// z.object จะตัดฟิลด์ส่วนเกินออกจากข้อมูลผลลัพธ์
export const playerSaveSchema = z.object({
  // ID ต้องเป็นข้อความที่ไม่ว่าง
  id: z.string().min(1),

  // ชื่อต้องเป็นข้อความ ตาม Contract ปัจจุบันยังยอมรับข้อความว่าง
  name: z.string(),

  // ชิปและเดิมพันต้องเป็นจำนวนเต็มไม่ติดลบ
  // safe จำกัดค่าให้อยู่ในช่วงจำนวนเต็มที่ JavaScript เก็บได้อย่างแม่นยำ
  chips: z.number().int().nonnegative().safe(),
  bet: z.number().int().nonnegative().safe(),

  // สถานะต้องตรงกับสถานะผู้เล่นที่ระบบกำหนด
  status: z.enum(['WAITING', 'ACTIVE', 'FOLDED', 'DISCONNECTED']),

  // ตรวจรูปแบบไพ่ทุกใบ แต่ไม่บังคับจำนวน 3 ใบหรือห้ามไพ่ซ้ำในส่วนนี้
  privateCards: z.array(savedCardSchema),

  // ต้องเป็น Boolean จริง ไม่รับข้อความ "true" หรือ "false"
  isBlind: z.boolean(),
});
