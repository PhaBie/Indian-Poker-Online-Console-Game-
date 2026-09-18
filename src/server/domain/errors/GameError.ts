/**
 * คลาสข้อผิดพลาดหลักของระบบเกม (Base Domain Error)
 *
 * ทำหน้าที่เป็นคลาสแม่ (Base Class) สำหรับ Custom Error ทั้งหมดใน Domain Layer:
 * - สืบทอดมาจากคลาส Error มาตรฐานของ JavaScript
 * - เพิ่มฟิลด์ `code` สำหรับใช้เป็น Error Code ระบุประเภทข้อผิดพลาดได้อย่างชัดเจน
 * - ช่วยให้ฝั่ง Network / WebSocket Handler และ Client สามารถจับข้อผิดพลาดและนำไปแสดงผลได้อย่างถูกต้อง
 */
export class GameError extends Error {
  public code: string;

  constructor(message: string, code: string = 'GAME_ERROR') {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}

/**
 * ข้อผิดพลาดเมื่อค้นหารหัสห้องที่ต้องการไม่พบในระบบ
 * รหัสข้อผิดพลาด (Code): 'ROOM_NOT_FOUND'
 */
export class RoomNotFoundError extends GameError {
  constructor(roomId: string) {
    super(`Room with ID ${roomId} not found`, 'ROOM_NOT_FOUND');
  }
}

/**
 * ข้อผิดพลาดเมื่อผู้เล่นส่งการกระทำ (Action) ที่ผิดกฎหรือไม่สามารถทำได้ในสถานะปัจจุบันของเกม
 * รหัสข้อผิดพลาด (Code): 'INVALID_ACTION'
 */
export class InvalidActionError extends GameError {
  constructor(action: string) {
    super(`Action ${action} is invalid in current state`, 'INVALID_ACTION');
  }
}

/**
 * ข้อผิดพลาดเมื่อผู้เล่นมีจำนวนชิปไม่เพียงพอสำหรับการลงเดิมพันหรือเริ่มเกม
 * รหัสข้อผิดพลาด (Code): 'INSUFFICIENT_CHIPS'
 */
export class InsufficientChipsError extends GameError {
  constructor(playerName: string) {
    super(`Player ${playerName} has insufficient chips`, 'INSUFFICIENT_CHIPS');
  }
}

/**
 * ข้อผิดพลาดเมื่อมีผู้เล่นพยายามเข้าร่วมห้องที่มีผู้เล่นครบจำนวนสูงสุดแล้ว (จำกัด 4 คน)
 * รหัสข้อผิดพลาด (Code): 'ROOM_FULL'
 */
export class RoomFullError extends GameError {
  constructor(roomId: string) {
    super(`Room ${roomId} is already full`, 'ROOM_FULL');
  }
}

/**
 * ข้อผิดพลาดเมื่อผู้เล่นพยายามส่งคำสั่งเล่นในขณะที่ยังไม่ถึงตา (Turn) ของตนเอง
 * รหัสข้อผิดพลาด (Code): 'WRONG_TURN'
 */
export class WrongTurnError extends GameError {
  constructor(playerId: string) {
    super(`It is not player ${playerId}'s turn`, 'WRONG_TURN');
  }
}

/**
 * ข้อผิดพลาดเมื่อผู้เล่นที่ไม่ใช่หัวหน้าห้อง (Host) พยายามสั่งเริ่มเกม
 * รหัสข้อผิดพลาด (Code): 'NOT_HOST'
 */
export class NotHostError extends GameError {
  constructor(playerId: string) {
    super(`Player ${playerId} is not the host`, 'NOT_HOST');
  }
}

/**
 * ข้อผิดพลาดเมื่อ Token สำหรับการเชื่อมต่อกลับ (Reconnect Token) ไม่ถูกต้องหรือไม่พบในระบบ
 * รหัสข้อผิดพลาด (Code): 'INVALID_TOKEN'
 */
export class InvalidTokenError extends GameError {
  constructor() {
    super(`Invalid or missing reconnect token`, 'INVALID_TOKEN');
  }
}

/**
 * ข้อผิดพลาดเมื่อผู้เล่นพยายามกระทำคำสั่งในขณะที่สถานะของผู้เล่นไม่อนุญาตให้ทำ
 * เช่น ผู้เล่นไม่ได้อยู่ในสถานะ ACTIVE แต่พยายามสั่งเปิดดูไพ่
 * รหัสข้อผิดพลาด (Code): 'INVALID_PLAYER_STATE'
 */
export class PlayerStateError extends GameError {
  constructor(playerId: string, state: string) {
    super(
      `Player ${playerId} cannot perform this action in state: ${state}`,
      'INVALID_PLAYER_STATE',
    );
  }
}
