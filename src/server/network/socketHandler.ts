import { WebSocket } from 'ws';
import { ClientEvent } from '../../shared/types';

export function handleClientMessage(wsClient: WebSocket, message: ClientEvent): void {
    // รอคนเลือก
}

export function broadcastGameStateUpdate(roomId: string): void {
    // รอคนเลือก
}
