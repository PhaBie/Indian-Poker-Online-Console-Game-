import WebSocket from 'ws';
import type { ClientEvent, ServerEvent } from '../../shared/types';

// Interface บอกรูปร่างของ transport object ที่รับเข้ามา
export interface Transport {
  onOpen: (() => void) | null;
  send?: (data: string) => void; // method สำหรับส่งข้อมูลจริงๆ ผ่าน WebSocket
  close?: () => void;
}

export interface ConnectionFailure {
  code: 'CONNECTION_FAILED';
  message: string;
}

export class SocketClient {
  public isConnected: boolean;
  public lastReceivedEvent: ServerEvent | null;
  public onError?: (error: ConnectionFailure) => void;
  private transport: Transport | null;
  private wsInstance: WebSocket | null;

  constructor() {
    this.isConnected = false;
    this.lastReceivedEvent = null;
    this.transport = null;
    this.wsInstance = null;
  }

  public connect(url: string, transport?: Transport): void {
    if (transport) {
      this.transport = transport;
      transport.onOpen = () => {
        this.isConnected = true;
      };
      return;
    }

    const ws = new WebSocket(url);
    this.wsInstance = ws;

    ws.on('open', () => {
      this.isConnected = true;
    });

    ws.on('message', (data) => {
      try {
        const event: ServerEvent = JSON.parse(data.toString());
        this.onReceive(event);
      } catch (error) {
        if (process.env.DEBUG === '1') {
          console.error('[SocketClient] Invalid ServerEvent payload:', error);
        }
      }
    });

    ws.on('close', () => {
      this.isConnected = false;
    });

    ws.on('error', (_error) => {
      this.isConnected = false;
      if (process.env.DEBUG === '1') {
        console.error('[SocketClient] WebSocket connection failed');
      }
      this.onError?.({
        code: 'CONNECTION_FAILED',
        message: 'Unable to reach the game server.',
      });
    });

    this.transport = {
      onOpen: null,
      send: (data: string) => {
        ws.send(data);
      },
      close: () => {
        ws.close();
      },
    };
  }

  public send(event: ClientEvent): void {
    if (!this.isConnected) {
      throw new Error('Client is not connected');
    }
    // serialize Object → JSON String แล้วส่งผ่าน transport
    const jsonString = JSON.stringify(event);
    this.transport?.send?.(jsonString);
  }

  public onReceive(event: ServerEvent): void {
    this.lastReceivedEvent = event;
  }

  public disconnect(): void {
    this.isConnected = false;
    this.transport?.close?.();
    this.wsInstance?.close();
    this.transport = null;
    this.wsInstance = null;
  }
}
