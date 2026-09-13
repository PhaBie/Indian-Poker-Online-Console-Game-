import type { ClientEvent, ServerEvent } from '../../shared/types';

// Interface บอกรูปร่างของ transport object ที่รับเข้ามา
interface Transport {
  onOpen: (() => void) | null;
  send?: (data: string) => void; // method สำหรับส่งข้อมูลจริงๆ ผ่าน WebSocket
}

export class SocketClient {
  public isConnected: boolean;
  public lastReceivedEvent: ServerEvent | null;
  private _transport: Transport | null; // เก็บ transport ไว้ใช้ใน send()

  constructor() {
    this.isConnected = false;
    this.lastReceivedEvent = null;
    this._transport = null;
  }

  public connect(_url: string, _transport?: Transport): void {
    if (_transport) {
      this._transport = _transport; // เก็บ transport ไว้ใช้ทีหลัง
      _transport.onOpen = () => {
        this.isConnected = true;
      };
    }
  }

  public send(_event: ClientEvent): void {
    if (!this.isConnected) {
      throw new Error('Client is not connected');
    }
    // serialize Object → JSON String แล้วส่งผ่าน transport
    const jsonString = JSON.stringify(_event);
    this._transport?.send?.(jsonString);
  }

  public onReceive(_event: ServerEvent): void {
    this.lastReceivedEvent = _event;
  }

  public disconnect(): void {
    this.isConnected = false;
    this._transport = null; // ปล่อย transport เมื่อตัดการเชื่อมต่อ
  }
}