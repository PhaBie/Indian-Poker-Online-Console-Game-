import type { Room } from '../domain/models/Room';

export class StorageManager {
  public basePath: string;

  constructor(basePath: string = './data') {
    this.basePath = basePath;
  }

  public saveRoomState(_room: Room): void {
    // รอคนเลือก
  }

  public loadRoomState(_roomId: string): Room | null {
    // รอคนเลือก
    return null;
  }

  public checkSaveExists(_roomId: string): boolean {
    // รอคนเลือก
    return false;
  }

  public deleteSavedRoom(_roomId: string): void {
    // รอคนเลือก
  }

  public getAllSavedRoomIds(): string[] {
    // รอคนเลือก
    return [];
  }
}
