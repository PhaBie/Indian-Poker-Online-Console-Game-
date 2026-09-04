import { Card, GameActionType } from '../../../shared/types';
import { Player } from './Player';

export class GameState {
    public pot: number;
    public currentHighestBet: number;
    public currentPlayerIndex: number;
    public deck: Card[];
    public activePlayers: Player[];
    public maxPotLimit: number;
    public dealerIndex: number;

    constructor(players: Player[], maxPotLimit: number = 10000) {
        this.pot = 0;
        this.currentHighestBet = 0;
        this.currentPlayerIndex = 0;
        this.deck = [];
        this.activePlayers = players;
        this.maxPotLimit = maxPotLimit;
        this.dealerIndex = 0;
    }

    public startGame(): void {
        // รอคนเลือก
    }

    public nextTurn(): void {
        // รอคนเลือก
    }

    public processAction(playerId: string, action: GameActionType, amount?: number): void {
        // รอคนเลือก
    }

    public evaluateWinner(): void {
        // รอคนเลือก
    }

    public endGame(): void {
        // รอคนเลือก
    }

    public executeSideshow(challengerId: string, targetId: string): void {
        // รอคนเลือก
    }

    public canForceShow(): boolean {
        // รอคนเลือก
        return false;
    }

    public checkLastManStanding(): Player | null {
        // รอคนเลือก
        return null;
    }

    public checkPotLimitReached(): boolean {
        // รอคนเลือก
        return false;
    }

    public handleTie(winners: Player[]): void {
        // รอคนเลือก
    }

    public rotateDealer(): void {
        // รอคนเลือก
    }

    public rejectSideshow(): void {
        // รอคนเลือก
    }

    public handlePlayerDisconnect(playerId: string): void {
        // รอคนเลือก
    }

    public autoFoldTimeout(): void {
        // รอคนเลือก
    }
}
