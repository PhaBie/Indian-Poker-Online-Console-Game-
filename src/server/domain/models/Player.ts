import type { ServerPlayer, PlayerStatus, Card } from '../../../shared/types';

export abstract class BaseUser {
  public id: string;
  public name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  public abstract getRole(): string;
}

export class Player extends BaseUser implements ServerPlayer {
  public chips: number;
  public bet: number;
  public status: PlayerStatus;
  public privateCards: Card[];
  public isBlind: boolean;

  constructor(id: string, name: string) {
    super(id, name);
    this.chips = 1000;
    this.bet = 0;
    this.status = 'WAITING';
    this.privateCards = [];
    this.isBlind = true;
  }

  public getRole(): string {
    return 'PLAYER';
  }

  public receiveCards(_cards: Card[]): void {
    // รอคนเลือก
  }

  public payBet(_amount: number): void {
    // รอคนเลือก
  }

  public fold(): void {
    // รอคนเลือก
  }

  public showCards(): Card[] {
    // รอคนเลือก
    return [];
  }

  public addChips(_amount: number): void {
    // รอคนเลือก
  }

  public resetForNewRound(): void {
    // รอคนเลือก
  }

  public seeCards(): void {
    // รอคนเลือก
  }

  public toJSON(): object {
    // รอคนเลือก
    return {};
  }

  public static fromJSON(_json: unknown): Player {
    // รอคนเลือก
    return new Player('dummy', 'dummy');
  }
}
