import { Room } from '../domain/models/Room';
import {
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  readdirSync,
  mkdirSync,
} from 'fs';
import { join } from 'path';

export class StorageManager {
  public basePath: string;

  constructor(basePath: string = './data') {
    this.basePath = basePath;
    // ตรวจสอบและสร้างโฟลเดอร์สำหรับเก็บข้อมูลหากยังไม่มี (ป้องกัน Error โฟลเดอร์ไม่พบ)
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

  /**
   * สร้าง Path สำหรับไฟล์ของแต่ละห้อง (รูปแบบ: basePath/roomId.json)
   */
  private getFilePath(roomId: string): string {
    return join(this.basePath, `${roomId}.json`);
  }

  public saveRoomState(room: Room): void {
    const filePath = this.getFilePath(room.roomId);
    // แปลงข้อมูล Object ของ Room เป็น JSON String
    const data = JSON.stringify(room.toJSON());
    // เขียนข้อมูลลงไฟล์แบบ Synchronous (ประสิทธิภาพดีสำหรับไฟล์ขนาดเล็ก)
    writeFileSync(filePath, data, 'utf-8');
  }

  public loadRoomState(roomId: string): Room | null {
    const filePath = this.getFilePath(roomId);

    // ถ้าไม่มีไฟล์เซฟ ให้คืนค่า null กลับไป
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      // อ่านข้อมูลจากไฟล์
      const data = readFileSync(filePath, 'utf-8');
      const json = JSON.parse(data);
      // กู้คืนข้อมูล (Deserialize) กลับเป็น Room Object
      return Room.fromJSON(json);
    } catch (error) {
      console.error(`Failed to load room state for ${roomId}:`, error);
      return null;
    }
  }

  public checkSaveExists(roomId: string): boolean {
    return existsSync(this.getFilePath(roomId));
  }

  public deleteSavedRoom(roomId: string): void {
    const filePath = this.getFilePath(roomId);
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  }

  public getAllSavedRoomIds(): string[] {
    if (!existsSync(this.basePath)) {
      return [];
    }

    // อ่านรายชื่อไฟล์ในโฟลเดอร์ทั้งหมด
    const files = readdirSync(this.basePath);
    // กรองเอาเฉพาะไฟล์ .json และตัดนามสกุลออกเพื่อให้ได้แค่ roomId
    return files
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace('.json', ''));
  }
}
