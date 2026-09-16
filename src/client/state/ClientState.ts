import type { ServerEvent, Card } from '../../shared/types';

export class ClientState {
  public myPlayerId: string | null;
  public currentRoomId: string | null;
  public latestGameState:
    Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>['payload'] | null;
  public lastError: string | null;

  constructor() {
    this.myPlayerId = null;
    this.currentRoomId = null;
    this.latestGameState = null;
    this.lastError = null;
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
      case 'GAME_STATE_UPDATE': {
        this.latestGameState = event.payload;
        this.currentRoomId = event.payload.roomId;
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
  }

  public clearState(): void {
    this.myPlayerId = null;
    this.currentRoomId = null;
    this.latestGameState = null;
    this.lastError = null;
  }

  public setPlayerId(playerId: string): void {
    this.myPlayerId = playerId;
  }

  public getMyCards(): Card[] {
    return this.latestGameState?.myCards ?? [];
  }
}
