import type { Player } from './Player';
import type { RoomPhase, PublicPlayerDTO } from '../../../shared/types';
import type { GameState } from './GameState';

export class Room {
    public roomId: string;
    public phase: RoomPhase;
    public hostId: string | null;
    public players: Map<string, Player>;
    public bootAmount: number;
    public gameState: GameState | null;
    private readonly MAX_PLAYERS = 4;

    constructor(roomId: string, bootAmount: number = 50) {
        this.roomId = roomId;
        this.phase = 'LOBBY';
        this.hostId = null;
        this.players = new Map();
        this.bootAmount = bootAmount;
        this.gameState = null;
    }

    public join(_player: Player): void {
        // รอคนเลือก
    }

    public reconnect(_playerId: string): void {
        // รอคนเลือก
    }

    public leave(_playerId: string): void {
        // รอคนเลือก
    }

    public startGame(_requestingPlayerId: string): void {
        // รอคนเลือก
    }

    public endGame(): void {
        // รอคนเลือก
    }

    public resetToLobby(): void {
        // รอคนเลือก
    }
    
    public getPlayer(_playerId: string): Player | undefined {
        // รอคนเลือก
        return undefined;
    }
    
    public getPlayerCount(): number {
        // รอคนเลือก
        return 0;
    }

    public getPublicState(): PublicPlayerDTO[] {
        // รอคนเลือก
        return [];
    }

    public toJSON(): object {
        // รอคนเลือก
        return {};
    }

    public static fromJSON(_json: unknown): Room {
        // รอคนเลือก
        return new Room("dummy");
    }
}
