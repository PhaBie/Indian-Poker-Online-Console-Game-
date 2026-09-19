import { WebSocketServer, type WebSocket } from 'ws';
import { RoomManager } from './domain/models/RoomManager';
import { StorageManager } from './infrastructure/StorageManager';
import { Validator } from './utils/validator';
import {
  handleClientMessage,
  handleClientDisconnect,
  type SocketSession,
  type NetworkContext,
} from './network/socketHandler';

export class PokerServer {
  public roomManager: RoomManager;
  public storageManager: StorageManager;
  public isRunning: boolean;
  public wss: WebSocketServer | null;
  public validator: Validator;
  private tokenMap: Map<string, string>; // token -> playerId
  public connectedClients: Map<WebSocket, SocketSession>;

  constructor() {
    this.roomManager = new RoomManager();
    this.storageManager = new StorageManager();
    this.validator = new Validator();
    this.tokenMap = new Map();
    this.connectedClients = new Map();
    this.isRunning = false;
    this.wss = null;
  }

  private get networkContext(): NetworkContext {
    return {
      roomManager: this.roomManager,
      sessionStore: {
        createSession: (playerId: string) => {
          const token = `token_${playerId}_${Date.now()}`;
          this.tokenMap.set(token, playerId);
          return token;
        },
        getPlayerId: (token: string) => this.tokenMap.get(token) || null,
      },
      connectedClients: this.connectedClients,
    };
  }

  public start(port: number): void {
    if (this.isRunning) return;

    this.wss = new WebSocketServer({ port });
    this.isRunning = true;
    console.log(`[Server] WebSocket Server กำลังทำงานที่ Port ${port}`);

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[Server] มี Client เชื่อมต่อเข้ามาสำเร็จ!');
      this.connectedClients.set(ws, { playerId: '', roomId: null });

      ws.on('message', (data) => {
        const clientEvent = this.validator.validateClientEvent(data);
        if (!clientEvent) {
          console.warn('[Server] ได้รับข้อมูลที่ไม่ถูกต้องตาม Schema');
          return;
        }
        console.log(`[Server] ได้รับ Event จาก Client: ${clientEvent.type}`);
        handleClientMessage(ws, clientEvent, this.networkContext);
      });

      ws.on('close', () => {
        console.log('[Server] Client ตัดการเชื่อมต่อ');
        handleClientDisconnect(ws, this.networkContext);
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
