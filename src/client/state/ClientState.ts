import type { ServerEvent, Card, RoomSummaryDTO } from '../../shared/types';

export interface ClientStateSnapshot {
  myPlayerId: string | null;
  currentRoomId: string | null;
  latestGameState: Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>['payload'] | null;
  latestGameResult: Extract<ServerEvent, { type: 'GAME_RESULT' }>['payload'] | null;
  lastError: string | null;
  myCards: Card[];
  availableRooms: RoomSummaryDTO[];
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
  private listeners: Set<() => void>;
  private cachedSnapshot: ClientStateSnapshot;

  constructor() {
    this.myPlayerId = null;
    this.currentRoomId = null;
    this.latestGameState = null;
    this.latestGameResult = null;
    this.lastError = null;
    this.availableRooms = [];
    this.listeners = new Set();
    this.cachedSnapshot = this.createSnapshot();
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
    };
  }

  public getSnapshot(): ClientStateSnapshot {
    return this.cachedSnapshot;
  }

  public updateState(event: ServerEvent): void {
    switch (event.type) {
      case 'SESSION_CREATED': {
        this.myPlayerId = event.payload.playerId;
        break;
      }
      case 'ROOM_CREATED': {
        this.currentRoomId = event.payload.roomId;
        break;
      }
      case 'ROOM_LIST': {
        this.availableRooms = event.payload.rooms;
        break;
      }
      case 'GAME_STATE_UPDATE': {
        this.latestGameState = event.payload;
        this.currentRoomId = event.payload.roomId;
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
    this.notifyListeners();
  }

  public setPlayerId(playerId: string): void {
    this.myPlayerId = playerId;
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
