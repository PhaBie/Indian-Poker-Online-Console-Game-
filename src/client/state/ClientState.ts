import type { ServerEvent, Card, RoomSummaryDTO } from '../../shared/types';
import fs from 'fs';
import path from 'path';

export interface ClientStateSnapshot {
  myPlayerId: string | null;
  currentRoomId: string | null;
  latestGameState: Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>['payload'] | null;
  latestGameResult: Extract<ServerEvent, { type: 'GAME_RESULT' }>['payload'] | null;
  lastError: string | null;
  myCards: Card[];
  availableRooms: RoomSummaryDTO[];
  roomClosed: boolean;
  reconnectToken: string | null;
  savedPlayerName: string | null;
  savedServerUrl: string | null;
}

export class ClientState {
  public myPlayerId: string | null;
  public currentRoomId: string | null;
  public latestGameState:
    Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>['payload'] | null;
  public latestGameResult:
    Extract<ServerEvent, { type: 'GAME_RESULT' }>['payload'] | null;
  public lastError: string | null;
  public availableRooms: RoomSummaryDTO[];
  public roomClosed: boolean;
  private listeners: Set<() => void>;
  private cachedSnapshot: ClientStateSnapshot;

  constructor() {
    this.myPlayerId = null;
    this.currentRoomId = null;
    this.latestGameState = null;
    this.latestGameResult = null;
    this.lastError = null;
    this.availableRooms = [];
    this.roomClosed = false;
    this.listeners = new Set();
    this.loadSession();
    this.cachedSnapshot = this.createSnapshot();
  }

  public reconnectToken: string | null = null;
  public savedPlayerName: string | null = null;
  public savedServerUrl: string | null = null;

  private getSessionFilePath(): string {
    const profile = process.env.SESSION_PROFILE || 'default';
    return path.join(process.cwd(), 'data', 'client', `session_${profile}.json`);
  }

  private saveSession(): void {
    if (!this.reconnectToken || !this.currentRoomId) return;
    try {
      const dirPath = path.join(process.cwd(), 'data', 'client');
      fs.mkdirSync(dirPath, { recursive: true });
      const filePath = this.getSessionFilePath();
      fs.writeFileSync(
        filePath,
        JSON.stringify({
          reconnectToken: this.reconnectToken,
          roomId: this.currentRoomId,
          playerName: this.savedPlayerName,
          serverUrl: this.savedServerUrl,
        }),
      );
    } catch {}
  }

  private loadSession(): void {
    try {
      const filePath = this.getSessionFilePath();
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.reconnectToken = data.reconnectToken;
        this.currentRoomId = data.roomId;
        this.savedPlayerName = data.playerName;
        this.savedServerUrl = data.serverUrl;
      }
    } catch {}
  }

  public clearSession(): void {
    this.reconnectToken = null;
    this.currentRoomId = null;
    this.savedPlayerName = null;
    this.savedServerUrl = null;
    try {
      const filePath = this.getSessionFilePath();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {}
  }

  private createSnapshot(): ClientStateSnapshot {
    return {
      myPlayerId: this.myPlayerId,
      currentRoomId: this.currentRoomId,
      latestGameState: this.latestGameState,
      latestGameResult: this.latestGameResult,
      lastError: this.lastError,
      myCards: this.getMyCards(),
      availableRooms: this.availableRooms,
      roomClosed: this.roomClosed,
      reconnectToken: this.reconnectToken,
      savedPlayerName: this.savedPlayerName,
      savedServerUrl: this.savedServerUrl,
    };
  }

  public getSnapshot(): ClientStateSnapshot {
    return this.cachedSnapshot;
  }

  public updateState(event: ServerEvent): void {
    switch (event.type) {
      case 'SESSION_CREATED': {
        this.myPlayerId = event.payload.playerId;
        this.reconnectToken = event.payload.reconnectToken;
        break;
      }
      case 'ROOM_CREATED': {
        this.currentRoomId = event.payload.roomId;
        this.saveSession();
        break;
      }
      case 'ROOM_LIST': {
        this.availableRooms = event.payload.rooms;
        this.roomClosed = false;
        // ROOM_LIST is a fresh lobby snapshot. Any previous join/create error
        // belongs to the older request and must not remain on the lobby screen.
        this.lastError = null;
        break;
      }
      case 'ROOM_CLOSED': {
        this.currentRoomId = null;
        this.latestGameState = null;
        this.latestGameResult = null;
        this.lastError = null;
        this.roomClosed = true;
        this.clearSession();
        break;
      }
      case 'GAME_STATE_UPDATE': {
        this.latestGameState = event.payload;
        if (this.currentRoomId !== event.payload.roomId) {
          this.currentRoomId = event.payload.roomId;
          this.saveSession();
        }
        this.lastError = null;
        break;
      }
      case 'GAME_RESULT': {
        this.latestGameResult = event.payload;
        break;
      }
      case 'GAME_SAVED':
      case 'GAME_LOADED': {
        this.currentRoomId = event.payload.roomId;
        break;
      }
      case 'ERROR': {
        this.lastError = event.message;
        // If we get an error like INVALID_TOKEN or ROOM_NOT_FOUND, our session is invalid.
        if (event.code === 'INVALID_TOKEN' || event.code === 'ROOM_NOT_FOUND') {
          this.clearSession();
        }
        break;
      }
      default: {
        break;
      }
    }
    this.notifyListeners();
  }

  public clearState(): void {
    this.myPlayerId = null;
    this.currentRoomId = null;
    this.latestGameState = null;
    this.latestGameResult = null;
    this.lastError = null;
    this.availableRooms = [];
    this.roomClosed = false;
    this.notifyListeners();
  }

  public setSessionInfo(playerName: string, serverUrl: string): void {
    this.savedPlayerName = playerName;
    this.savedServerUrl = serverUrl;
    this.saveSession();
  }

  public setPlayerId(playerId: string): void {
    this.myPlayerId = playerId;
    this.notifyListeners();
  }

  public clearError(): void {
    this.lastError = null;
    this.notifyListeners();
  }

  public getMyCards(): Card[] {
    return this.latestGameState?.myCards ?? [];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.cachedSnapshot = this.createSnapshot();
    for (const listener of this.listeners) {
      listener();
    }
  }
}
