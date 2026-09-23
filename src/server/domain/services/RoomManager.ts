import { Room } from '../models/Room';
import type { Player } from '../models/Player';
import { GameError } from '../errors/GameError';
// class RoomManager จริงๆจะทำแค่ตัวแปรแต่ AI แนะนำให้ใช้ class เวลาเรียกใช้จะได้ไม่มีปัญหาเรื่องการเรียกใช้ตัวแปรผิดที่
export class RoomManager {
  private checkRoomId: Map<string, Room> = new Map();
  //อันนี้เป็นฟังก์ชันสำหรับสร้างห้องใหม่จะตรวจสอบว่าห้องมันมี ID เดียวกันมีอยู่แล้วไหม ถ้ามีจะโยน error ถ้าไม่มีจะสร้างห้องใหม่
  // และเพิ่มผู้เล่นที่เป็นเจ้าของห้องเข้าไปในห้องนั้นและก็newroom.join(host) จะเป็นการเพิ่มผู้เล่นเจ้าของห้องเข้าไปในห้องนั้น
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
  public getRoom(roomId: string): Room | undefined {
    return this.checkRoomId.get(roomId);
  }
  //อันนี้เป็นฟังก์ชันสำหรับลบห้องออกจาก Map โดยใช้ roomId เป็น key
  public deleteRoom(roomId: string): void {
    this.checkRoomId.delete(roomId);
  }
  //อันนี้เป็นฟังก์ชันสำหรับดึงห้องทั้งหมดออกมาจาก Map และใช้ for(valuesคือห้องที่ active อยู่)return เป็น array ของRoom
  public getAllRooms(): Room[] {
    const result: Room[] = [];
    for (const room of this.checkRoomId.values()) {
      result.push(room);
    }
    return result;
  }
}
