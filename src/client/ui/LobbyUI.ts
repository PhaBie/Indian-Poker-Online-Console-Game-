import { ClientEvent } from '../../shared/types';

export interface RoomInfo {
    roomId: string;
    playerCount: number;
    phase: string;
}

export class LobbyUI {
    public render(rooms: RoomInfo[]): string {
        // รอคนเลือก
        return "";
    }

    public handleInput(input: string): ClientEvent | null {
        // รอคนเลือก
        return null;
    }
}
