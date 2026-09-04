import { Room } from "./Room";
import { Player } from "./Player";

export class RoomManager {
    public createRoom(roomId: string, host: Player): Room {
        // รอคนเลือก
        return new Room(roomId);
    }

    public getRoom(roomId: string): Room | undefined {
        // รอคนเลือก
        return undefined;
    }

    public deleteRoom(roomId: string): void {
        // รอคนเลือก
    }

    public getAllRooms(): Room[] {
        // รอคนเลือก
        return [];
    }
}
