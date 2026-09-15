import { WebSocketServer, type WebSocket } from 'ws';
import { RoomManager } from './domain/models/RoomManager';
import { StorageManager } from './infrastructure/StorageManager';
import type { ClientEvent, ServerEvent } from '../shared/types';

export class PokerServer {
  public roomManager: RoomManager;
  public storageManager: StorageManager;
  public isRunning: boolean;
  public wss: WebSocketServer | null;

  constructor() {
    this.roomManager = new RoomManager();
    this.storageManager = new StorageManager();
    this.isRunning = false;
    this.wss = null;
  }

  public start(port: number): void {
    if (this.isRunning) return;

    this.wss = new WebSocketServer({ port });
    this.isRunning = true;
    console.log(`[Server] WebSocket Server กำลังทำงานที่ Port ${port}`);

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[Server] มี Client เชื่อมต่อเข้ามาสำเร็จ!');

      // ส่ง Event ยืนยันไปยัง Client ทันทีที่เชื่อมต่อติด
      const sessionEvent: ServerEvent = {
        type: 'SESSION_CREATED',
        payload: {
          playerId: `player_${Date.now()}`,
          reconnectToken: `token_${Date.now()}`,
        },
      };
      ws.send(JSON.stringify(sessionEvent));

      ws.on('message', (data) => {
        try {
          const clientEvent: ClientEvent = JSON.parse(data.toString());
          console.log(`[Server] ได้รับ Event จาก Client: ${clientEvent.type}`);
        } catch {
          console.log(`[Server] ได้รับข้อความ: ${data.toString()}`);
        }
      });

      ws.on('close', () => {
        console.log('[Server] Client ตัดการเชื่อมต่อ');
      });

      ws.on('error', (error) => {
        console.error('[Server] ข้อผิดพลาด Client:', error);
      });
    });

    this.wss.on('error', (error) => {
      console.error('[Server] ข้อผิดพลาด Server:', error);
    });
  }

  public stop(): void {
    if (!this.isRunning) return;

    if (this.wss) {
      for (const client of this.wss.clients) {
        client.close();
      }
      this.wss.close();
      this.wss = null;
    }
    this.isRunning = false;
    console.log('[Server] ปิดการทำงานเรียบร้อย');
  }
}

if (process.argv[1]?.includes('server') && !process.argv[1]?.includes('test')) {
  const port = Number(process.env.PORT) || 8080;
  const server = new PokerServer();
  server.start(port);
  console.log(`[Server] พร้อมรับการเชื่อมต่อ WS: ws://localhost:${port}`);
  console.log(`[Server] หากต้องการทดสอบผ่าน NGROK ให้รัน: ngrok http ${port}`);
}