import { WebSocketServer, WebSocket } from 'ws';

import { RoomManager } from './domain/models/RoomManager';
import { StorageManager } from './infrastructure/StorageManager';

export class PokerServer {
  public roomManager: RoomManager;
  public storageManager: StorageManager;
  public isRunning: boolean;

  // เตรียมตัวแปร wss ไว้สำหรับเก็บตัว WebSocket Server
  public wss?: WebSocketServer;

  constructor() {
    this.roomManager = new RoomManager();
    this.storageManager = new StorageManager();
    this.isRunning = false;
  }

  // เปิด Server รับค่า port เข้ามา
  public start(port: number): void {
    this.wss = new WebSocketServer({ port });
    console.log(`Web server running on port ${port}`);
    this.isRunning = true;

    // ดักจับ Event เมื่อ Client ส่งข้อความมาหา Server
    this.wss.on('connection', (ws: WebSocket) => {
      // ดักจับ Event เมื่อ Client ส่งข้อความมาหา Server
      ws.on('message', (message: Buffer) => {
        // แปลง JSON String ให้กลับเป็น Object ก่อน
        const data = JSON.parse(message.toString());

        console.log(
          `📩 ได้รับคำสั่ง: ${data.type} จากผู้เล่น: ${data.payload.playerName}`,
        );

        // เช็คว่า Client ส่งคำสั่งอะไรมา
        if (data.type === 'JOIN_ROOM') {
          // สร้าง Object ตอบกลับให้คนที่เพิ่งจอย
          const response = {
            type: 'ROOM_JOINED',
            message: `✅ ยินดีต้อนรับคุณ ${data.payload.playerName} เข้าสู่วงไพ่!`,
          };

          // แปลงเป็น JSON String แล้วส่งกลับไป
          ws.send(JSON.stringify(response));

          // กระจายข่าวให้คนอื่นที่อยู่ใน Server รู้ว่ามีคนเข้ามาใหม่
          const broadcastMessage = JSON.stringify({
            type: 'PLAYER_JOINED',
            message: `👋 ผู้เล่น ${data.payload.playerName} ได้เข้าร่วมวงไพ่แล้ว!`,
          });

          this.wss?.clients.forEach((client) => {
            // ส่งข้อความหาทุกคนยกเว้นคนที่เพิ่งจอย
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(broadcastMessage);
            }
          });
        }
      });
    });
  }

  public stop(): void {
    if (this.wss) {
      this.wss.close();
    }
    this.isRunning = false;
  }
}

const server = new PokerServer();
server.start(8080);
