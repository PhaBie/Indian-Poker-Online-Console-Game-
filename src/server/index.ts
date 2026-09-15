import { WebSocketServer, WebSocket } from 'ws';
import * as ngrok from '@ngrok/ngrok';

import { RoomManager } from './domain/models/RoomManager';
import { StorageManager } from './infrastructure/StorageManager';

export class PokerServer {
  public roomManager: RoomManager;
  public storageManager: StorageManager;
  public isRunning: boolean;
  public wss: WebSocketServer | null;
  public ngrokUrl: string | null;

  constructor() {
    this.roomManager = new RoomManager();
    this.storageManager = new StorageManager();
    this.isRunning = false;
    this.wss = null;
    this.ngrokUrl = null;
  }

  // เปิด Server รับค่า port เข้ามา
  public start(port: number): void {
    this.wss = new WebSocketServer({ port });
    this.isRunning = true;
    console.log(`[Server] Server started on port ${port}`);

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIp = req.socket.remoteAddress;
      console.log(`[Server] 🟢 มีผู้เล่นเชื่อมต่อเข้ามาแล้ว! (IP: ${clientIp})`);

      ws.on('message', (rawData) => {
        try {
          const event = JSON.parse(rawData.toString());
          console.log(`[Server] 📩 ผู้เล่น [${clientIp}] ส่งคำสั่ง:`, event);
        } catch {
          console.log(`[Server] 📩 ได้รับข้อความดิบ:`, rawData.toString());
        }
      });

      ws.on('close', () => {
        console.log(`[Server] 🔴 ผู้เล่นตัดการเชื่อมต่อแล้ว (IP: ${clientIp})`);
      });
    });
  }

 // NOTE สำหรับทีมถัดไป:
  // - URL ที่ได้จากตรงนี้จะยาว ไม่ใช่ 6 หลักแบบใน mock UI (screen 3b) → ต้องคุยกันว่าจะแก้ label UI
  //   หรือจะทำ mapping layer (code -> url) เพิ่มทีหลัง
  // - client ต้องรองรับ parse ทั้ง "ip:port" (screen 3a) และ "ws://host:port" (screen 3b)

  // เปิด Server พร้อมเปิด Ngrok Tunnel สำหรับให้เพื่อนต่างเครื่องเข้ามาเล่นได้
  public async startWithNgrok(port: number): Promise<void> {
    this.start(port);

    const authtoken = process.env.NGROK_AUTHTOKEN;
    if (!authtoken) {
      console.error('[Ngrok] ❌ ไม่พบ NGROK_AUTHTOKEN กรุณาตั้งค่า Environment Variable ก่อนใช้งาน');
      console.error('[Ngrok] 👉 วิธีตั้งค่า: ตั้ง NGROK_AUTHTOKEN=<your_token> แล้วรันใหม่');
      return;
    }

    try {
      console.log('[Ngrok] 🔄 กำลังเปิด Tunnel...');

      const listener = await ngrok.forward({
        addr: port,
        authtoken,
        proto: 'tcp',
      });

      const rawUrl = listener.url() ?? '';
      // แปลง tcp:// → ws:// เพื่อให้ Client นำไปต่อ WebSocket ได้เลย
      this.ngrokUrl = rawUrl.replace('tcp://', 'ws://');

      console.log('');
      console.log('='.repeat(55));
      console.log('[Ngrok] ✅ Tunnel เปิดสำเร็จ!');
      console.log(`[Ngrok] 🌐 URL สำหรับเพื่อน: ${this.ngrokUrl}`);
      console.log('[Ngrok] 📋 วิธีใช้: bun run src/client/index.ts <URL>');
      console.log('='.repeat(55));
      console.log('');
    } catch (error) {
      console.error('[Ngrok] ❌ เปิด Tunnel ไม่สำเร็จ:', error);
    }
  }

  public stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.isRunning = false;
    this.ngrokUrl = null;
  }
}

if (process.argv[1]?.includes('server')) {
  const server = new PokerServer();
  const isNgrok = process.argv.includes('--ngrok');

  if (isNgrok) {
    server.startWithNgrok(8080).catch(console.error);
  } else {
    server.start(8080);
  }
}