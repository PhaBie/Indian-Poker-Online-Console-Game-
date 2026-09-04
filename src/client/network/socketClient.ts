import { ClientEvent, ServerEvent } from '../../shared/types';

export class SocketClient {
    public isConnected: boolean;
    public lastReceivedEvent: ServerEvent | null;

    constructor() {
        this.isConnected = false;
        this.lastReceivedEvent = null;
    }

    public connect(url: string): void {
        // รอคนเลือก
    }

    public send(event: ClientEvent): void {
        // รอคนเลือก
    }

    public onReceive(event: ServerEvent): void {
        // รอคนเลือก
    }

    public disconnect(): void {
        // รอคนเลือก
    }
}
