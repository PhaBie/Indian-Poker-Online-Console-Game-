import type { ServerEvent, Card } from '../../shared/types';

export class ClientState {
    public myPlayerId: string | null;
    public currentRoomId: string | null;
    public latestGameState: Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>['payload'] | null;
    public lastError: string | null;

    constructor() {
        this.myPlayerId = null;
        this.currentRoomId = null;
        this.latestGameState = null;
        this.lastError = null;
    }

    public updateState(_event: ServerEvent): void {
        // รอคนเลือก
    }

    public clearState(): void {
        // รอคนเลือก
    }

    public setPlayerId(_playerId: string): void {
        // รอคนเลือก
    }

    public getMyCards(): Card[] {
        // รอคนเลือก
        return [];
    }
}
