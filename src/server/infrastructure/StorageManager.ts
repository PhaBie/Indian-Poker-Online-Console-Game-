import { Room } from '../domain/models/Room';

export class StorageManager {
    public saveRoomState(room: Room): void {
        // รอคนเลือก
    }

    public loadRoomState(roomId: string): Room | null {
        // รอคนเลือก
        return null;
    }

    public checkSaveExists(roomId: string): boolean {
        // รอคนเลือก
        return false;
    }

    public deleteSavedRoom(roomId: string): void {
        // รอคนเลือก
    }

    public getAllSavedRoomIds(): string[] {
        // รอคนเลือก
        return [];
    }
}
