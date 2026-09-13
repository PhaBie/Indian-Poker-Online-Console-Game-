import type { ClientEvent, ServerEvent } from '../../shared/types';

// Interface บอกรูปร่างของ transport object ที่รับเข้ามา
interface Transport {
  onOpen: (() => void) | null;
  send?: (data: string) => void; // method สำหรับส่งข้อมูลจริงๆ ผ่าน WebSocket
}

export class SocketClient {
  public isConnected: boolean;
  public lastReceivedEvent: ServerEvent | null;
  private transport: Transport | null; // เก็บ transport ไว้ใช้ใน send()

  constructor() {
    this.isConnected = false;
    this.lastReceivedEvent = null;
    this.transport = null;
  }

  public connect(_url: string, transport?: Transport): void {
    if (transport) {
      this.transport = transport; // เก็บ transport ไว้ใช้ใน send()
      transport.onOpen = () => {
        this.isConnected = true;
      };
    }
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
    this.transport = null; // ปล่อย transport เมื่อตัดการเชื่อมต่อ
  }
}
