import type { ClientEvent, ServerEvent } from '../../shared/types';

export class SocketClient {
  public isConnected: boolean;
  public lastReceivedEvent: ServerEvent | null;

  constructor() {
    this.isConnected = false;
    this.lastReceivedEvent = null;
  }

  public connect(_url: string, _transport?: unknown): void {
    // รอคนเลือก
  }

  public send(_event: ClientEvent): void {
    // รอคนเลือก
  }

  public onReceive(_event: ServerEvent): void {
    // รอคนเลือก
  }

  public disconnect(): void {
    // รอคนเลือก
  }
}
