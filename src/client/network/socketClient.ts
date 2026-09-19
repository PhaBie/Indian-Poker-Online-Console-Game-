import WebSocket from 'ws';
import type { ClientEvent, ServerEvent } from '../../shared/types';

export interface Transport {
  onOpen: (() => void) | null;
  send?: (data: string) => void;
  close?: () => void;
}

export class SocketClient {
  public isConnected: boolean;
  public lastReceivedEvent: ServerEvent | null;
  public onConnectionChange: ((connected: boolean) => void) | null;
  private transport: Transport | null;
  private wsInstance: WebSocket | null;
  private connectionEpoch: number;

  constructor() {
    this.isConnected = false;
    this.lastReceivedEvent = null;
    this.onConnectionChange = null;
    this.transport = null;
    this.wsInstance = null;
    this.connectionEpoch = 0;
  }

  public connect(url: string, transport?: Transport): void {
    this.disconnect();
    const currentEpoch = ++this.connectionEpoch;

    if (transport) {
      this.transport = transport;
      transport.onOpen = () => {
        if (this.connectionEpoch !== currentEpoch) return;
        this.setConnected(true);
      };
      return;
    }

    try {
      const ws = new WebSocket(url);
      this.wsInstance = ws;

      ws.on('open', () => {
        if (this.connectionEpoch !== currentEpoch) return;
        this.setConnected(true);
      });

      ws.on('message', (data) => {
        if (this.connectionEpoch !== currentEpoch) return;
        try {
          const event: ServerEvent = JSON.parse(data.toString());
          this.onReceive(event);
        } catch {
          // Ignore invalid payloads
        }
      });

      ws.on('close', () => {
        if (this.connectionEpoch !== currentEpoch) return;
        this.setConnected(false);
      });

      ws.on('error', () => {
        if (this.connectionEpoch !== currentEpoch) return;
        this.setConnected(false);
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
    } catch {
      this.setConnected(false);
    }
  }

  public connectWithTimeout(url: string, timeoutMs: number = 3000): Promise<boolean> {
    return new Promise((resolve) => {
      let isResolved = false;
      const timeoutTimer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.disconnect();
          resolve(false);
        }
      }, timeoutMs);

      this.connect(url);
      if (this.isConnected) {
        isResolved = true;
        clearTimeout(timeoutTimer);
        resolve(true);
        return;
      }

      const previousConnectionChange = this.onConnectionChange;
      this.onConnectionChange = (connected) => {
        previousConnectionChange?.(connected);
        if (connected && !isResolved) {
          isResolved = true;
          clearTimeout(timeoutTimer);
          resolve(true);
        }
      };
    });
  }

  private setConnected(connected: boolean): void {
    if (this.isConnected !== connected) {
      this.isConnected = connected;
      this.onConnectionChange?.(connected);
    }
  }

  public send(event: ClientEvent): void {
    if (!this.isConnected) {
      throw new Error('Client is not connected');
    }
    const jsonString = JSON.stringify(event);
    this.transport?.send?.(jsonString);
  }

  public onReceive(event: ServerEvent): void {
    this.lastReceivedEvent = event;
  }

  public disconnect(): void {
    this.connectionEpoch++;
    this.setConnected(false);
    this.transport?.close?.();
    if (this.wsInstance) {
      this.wsInstance.removeAllListeners?.();
      this.wsInstance.close();
    }
    this.transport = null;
    this.wsInstance = null;
  }
}
