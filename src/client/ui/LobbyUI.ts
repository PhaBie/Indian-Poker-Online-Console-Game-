import type { ClientEvent } from '../../shared/types';

export interface RoomInfo {
    roomId: string;
    playerCount: number;
    phase: string;
}

export class LobbyUI {
    public render(_rooms: RoomInfo[]): string {
        // รอคนเลือก
        return "";
    }

    public handleInput(_input: string): ClientEvent | null {
        // รอคนเลือก
        return null;
    }
}
