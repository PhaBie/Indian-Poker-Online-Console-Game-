import { Room } from "./Room";
import type { Player } from "./Player";

export class RoomManager {
    public createRoom(roomId: string, _host: Player): Room {
        // รอคนเลือก
        return new Room(roomId);
    }

    public getRoom(_roomId: string): Room | undefined {
        // รอคนเลือก
        return undefined;
    }

    public deleteRoom(_roomId: string): void {
        // รอคนเลือก
    }

    public getAllRooms(): Room[] {
        // รอคนเลือก
        return [];
    }
}
