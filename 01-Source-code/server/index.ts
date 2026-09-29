import { WebSocketServer, type WebSocket } from 'ws';
import { createServer, type Server, type IncomingMessage } from 'http';
import type { Socket } from 'net';
import { RoomManager } from './domain/services/RoomManager';
import { Validator } from './network/validator';
import { acceptsConnection, getLanBindAddress } from './network/accessPolicy';
import { isPrivateIPv4, type NetworkMode } from '../shared/networkMode';
import {
  handleClientMessage,
  handleClientDisconnect,
  type SocketSession,
  type NetworkContext,
} from './network/socketHandler';

export class PokerServer {
  public roomManager: RoomManager;
  public isRunning: boolean;
  public wss: WebSocketServer | null;
  public httpServer: Server | null;
  public validator: Validator;
  private tokenMap: Map<string, string>; // token -> playerId
  public connectedClients: Map<WebSocket, SocketSession>;

  constructor(public readonly networkMode: NetworkMode = 'LAN') {
    this.roomManager = new RoomManager();
    this.validator = new Validator();
    this.tokenMap = new Map();
    this.connectedClients = new Map();
    this.isRunning = false;
    this.wss = null;
    this.httpServer = null;
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

  public start(
    port: number,
    host = this.networkMode === 'LAN' ? getLanBindAddress() : '127.0.0.1',
  ): void {
    if (this.isRunning) return;
    if (
      !isPrivateIPv4(host) ||
      (this.networkMode === 'INTERNET' && host !== '127.0.0.1')
    ) {
      throw new Error(
        'Bind LAN to a local IPv4 address; Online must use loopback behind its tunnel.',
      );
    }

    this.httpServer = createServer();
    this.wss = new WebSocketServer({ noServer: true });

    this.httpServer.on(
      'upgrade',
      (request: IncomingMessage, socket: Socket, head: Buffer) => {
        if (!acceptsConnection(request, this.networkMode)) {
          socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
          socket.destroy();
          return;
        }
        this.wss!.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          this.wss!.emit('connection', ws, request);
        });
      },
    );

    this.httpServer.listen(port, host, () => {
      this.wss!.emit('listening');
    });

    // Provide address() to maintain compatibility with tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.wss.address = () => this.httpServer?.address() as any;

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
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }
    this.isRunning = false;
    console.log('[Server] ปิดการทำงานเรียบร้อย');
  }
}

if (import.meta.main) {
  const port = Number(process.env.PORT) || 8080;
  const server = new PokerServer();
  const host = process.env.LAN_HOST || getLanBindAddress();
  server.start(port, host);
  console.log(`[LAN] ws://${host}:${port} (local network only)`);
}
