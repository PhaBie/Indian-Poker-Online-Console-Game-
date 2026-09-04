import { Player } from './Player';
import { RoomPhase, PublicPlayerDTO } from '../../../shared/types';

export class Room {
    public roomId: string;
    public phase: RoomPhase;
    public hostId: string | null;
    public players: Map<string, Player>;
    private readonly MAX_PLAYERS = 4;

    constructor(roomId: string) {
        this.roomId = roomId;
        this.phase = 'LOBBY';
        this.hostId = null;
        this.players = new Map();
    }

    public join(player: Player): void {
        // รอคนเลือก
    }

    public leave(playerId: string): void {
        // รอคนเลือก
    }

    public startGame(requestingPlayerId: string): void {
        // รอคนเลือก
    }

    public endGame(): void {
        // รอคนเลือก
    }

    public resetToLobby(): void {
        // รอคนเลือก
    }
    
    public getPlayer(playerId: string): Player | undefined {
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

    public static fromJSON(json: any): Room {
        // รอคนเลือก
        return new Room("dummy");
    }
}
