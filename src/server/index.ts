import { WebSocketServer, WebSocket } from 'ws';

import { RoomManager } from './domain/models/RoomManager';
import { StorageManager } from './infrastructure/StorageManager';

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

  // เปิด Server รับค่า port เข้ามา
  public start(port: number): void {
    this.wss = new WebSocketServer({ port });
    this.isRunning = true;
    console.log(`[Server] Server started on port ${port}`);

    this.wss.on('connection', (_ws: WebSocket, req) => {
      console.log(`[Server] มีผู้เล่นเชื่อมต่อเข้ามาแล้ว! (IP: ${req.socket.remoteAddress})`);
    });
  }

  public stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null
    }
    this.isRunning = false
  }
}

if (process.argv[1]?.includes('server')) {
  const server = new PokerServer();
  server.start(8080);
}

//Run : bun test Test/server/index.test.ts