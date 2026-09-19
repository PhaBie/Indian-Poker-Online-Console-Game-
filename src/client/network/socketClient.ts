import WebSocket from 'ws';
import type { ClientEvent, ServerEvent } from '../../shared/types';

// Interface บอกรูปร่างของ transport object ที่รับเข้ามา
export interface Transport {
  onOpen: (() => void) | null;
  send?: (data: string) => void; // method สำหรับส่งข้อมูลจริงๆ ผ่าน WebSocket
  close?: () => void;
}

export class SocketClient {
  public isConnected: boolean;
  public lastReceivedEvent: ServerEvent | null;
  private transport: Transport | null; // เก็บ transport ไว้ใช้ใน send()
  private wsInstance: WebSocket | null;

  constructor() {
    this.isConnected = false;
    this.lastReceivedEvent = null;
    this.transport = null;
    this.wsInstance = null;
  }

  public connect(url: string, transport?: Transport): void {
    if (transport) {
      this.transport = transport; // เก็บ transport ไว้ใช้ใน send()
      transport.onOpen = () => {
        this.isConnected = true;
      };
      return;
    }

    // กรณีรันใช้งานจริง (ไม่มี transport ส่งเข้ามา) ให้ต่อ WebSocket ของจริง
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
        console.error(
          '[SocketClient] ข้อมูลที่ได้รับไม่ใช่รูปแบบ ServerEvent ที่ถูกต้อง:',
          error,
        );
      }
    });

    ws.on('close', () => {
      this.isConnected = false;
    });

    ws.on('error', () => {
      this.isConnected = false;
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
