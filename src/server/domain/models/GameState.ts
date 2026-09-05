import type { Card, GameActionType } from '../../../shared/types';
import type { Player } from './Player';

export class GameState {
    public pot: number;
    public currentHighestBet: number;
    public currentPlayerIndex: number;
    public deck: Card[];
    public activePlayers: Player[];
    public bootAmount: number;
    public maxPotLimit: number;
    public dealerIndex: number;

    constructor(players: Player[], bootAmount: number = 50, maxPotLimit: number = 10000) {
        this.pot = 0;
        this.currentHighestBet = 0;
        this.currentPlayerIndex = 0;
        this.deck = [];
        this.activePlayers = players;
        this.bootAmount = bootAmount;
        this.maxPotLimit = maxPotLimit;
        this.dealerIndex = 0;
    }

    public startGame(): void {
        // รอคนเลือก
    }

    public nextTurn(): void {
        // รอคนเลือก
    }

    public processAction(_playerId: string, _action: GameActionType, _amount?: number): void {
        // รอคนเลือก
    }

    public evaluateWinner(): void {
        // รอคนเลือก
    }

    public endGame(): void {
        // รอคนเลือก
    }

    public executeSideshow(_challengerId: string, _targetId: string): void {
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

    public handleTie(_winners: Player[]): void {
        // รอคนเลือก
    }

    public rotateDealer(): void {
        // รอคนเลือก
    }

    public rejectSideshow(): void {
        // รอคนเลือก
    }

    public handlePlayerDisconnect(_playerId: string): void {
        // รอคนเลือก
    }

    public autoFoldTimeout(): void {
        // รอคนเลือก
    }
}
