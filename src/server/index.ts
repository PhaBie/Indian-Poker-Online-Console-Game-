import { RoomManager } from './domain/models/RoomManager';
import { StorageManager } from './infrastructure/StorageManager';

export class PokerServer {
  public roomManager: RoomManager;
  public storageManager: StorageManager;
  public isRunning: boolean;

  constructor() {
    this.roomManager = new RoomManager();
    this.storageManager = new StorageManager();
    this.isRunning = false;
  }

  public start(_port: number): void {}

  public stop(): void {}
}

const server = new PokerServer();
server.start(8080);
