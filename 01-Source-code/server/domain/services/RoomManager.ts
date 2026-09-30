import { Room } from '../models/Room';
import type { Player } from '../models/Player';
import { GameError } from '../errors/GameError';
// class RoomManager จริงๆจะทำแค่ตัวแปรแต่ AI แนะนำให้ใช้ class เวลาเรียกใช้จะได้ไม่มีปัญหาเรื่องการเรียกใช้ตัวแปรผิดที่
export class RoomManager {
  private checkRoomId: Map<string, Room> = new Map();
  //อันนี้เป็นฟังก์ชันสำหรับสร้างห้องใหม่จะตรวจสอบว่าห้องมันมี ID เดียวกันมีอยู่แล้วไหม ถ้ามีจะโยน error ถ้าไม่มีจะสร้างห้องใหม่
  // และเพิ่มผู้เล่นที่เป็นเจ้าของห้องเข้าไปในห้องนั้นและก็newroom.join(host) จะเป็นการเพิ่มผู้เล่นเจ้าของห้องเข้าไปในห้องนั้น
  /**
   * 🔴 IMPURE FUNCTION (Method)
   * เหตุผล: มีการปรับเปลี่ยนค่า (Mutate) ของ State ภายในคลาส (`this.checkRoomId.set()`) และเปลี่ยนสถานะห้อง (`newRoom.join()`)
   */
  public createRoom(roomId: string, host: Player, maxPlayers?: number): Room {
    if (this.checkRoomId.has(roomId)) {
      throw new GameError(`Room with ID ${roomId} already exists.`);
    }
    const newRoom = new Room(roomId, 50, maxPlayers);
    this.checkRoomId.set(roomId, newRoom);
    newRoom.join(host);
    return newRoom;
  }
  //อันนี้เป็นฟังก์ชันสำหรับดึงห้องออกมาจาก Map โดยใช้ roomId เป็น key ถ้าไม่มีห้องที่มี roomId นั้นจะ return undefined
  /**
   * 🔴 IMPURE FUNCTION (Method)
   * เหตุผล: ผลลัพธ์ที่ได้ขึ้นอยู่กับ State ภายในตัวแปรคลาส (`this.checkRoomId`) ไม่ได้เกิดจากแค่ค่าพารามิเตอร์ Input เพียงอย่างเดียว
   */
  public getRoom(roomId: string): Room | undefined {
    return this.checkRoomId.get(roomId);
  }
  //อันนี้เป็นฟังก์ชันสำหรับลบห้องออกจาก Map โดยใช้ roomId เป็น key
  /**
   * 🔴 IMPURE FUNCTION (Method)
   * เหตุผล: มีการทำลาย/แก้ไขข้อมูล State ภายในของคลาส (`this.checkRoomId.delete()`)
   */
  public deleteRoom(roomId: string): void {
    this.checkRoomId.delete(roomId);
  }
  //อันนี้เป็นฟังก์ชันสำหรับดึงห้องทั้งหมดออกมาจาก Map และใช้ for(valuesคือห้องที่ active อยู่)return เป็น array ของRoom
  /**
   * 🔴 IMPURE FUNCTION (Method)
   * เหตุผล: การคืนค่ามาจากการดึง State ปัจจุบัน (`this.checkRoomId.values()`) ซึ่งเปลี่ยนแปลงได้ตลอดเวลา ไม่ใช่ค่าคงที่ตาม Input
   */
  public getAllRooms(): Room[] {
    const result: Room[] = [];
    for (const room of this.checkRoomId.values()) {
      result.push(room);
    }
    return result;
  }
}
