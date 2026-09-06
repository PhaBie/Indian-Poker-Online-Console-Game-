import type { Card, HandRank } from '../../shared/types';

export function createDeck(): Card[] {
    return [];
}

export function shuffleDeck(_deck: Card[], _rng?: () => number): Card[] {
    // รอคนเลือก
    return [];
}

export function dealCards(_deck: Card[], _playerCount: number, _cardsPerPlayer: number): { hands: Card[][], remainingDeck: Card[] } {
    // รอคนเลือก
    return { hands: [], remainingDeck: [] };
}

export function evaluateHand(_cards: Card[]): { rank: HandRank, rankValue: number, kickers: number[] } {
    // รอคนเลือก
    return { rank: 'HIGH_CARD', rankValue: 0, kickers: [] };
}

export function compareHands(_handA: Card[], _handB: Card[]): number {
    // รอคนเลือก
    return 0;
}

export function getWinners(_players: { id: string, cards: Card[] }[]): string[] {
    // รอคนเลือก
    return [];
}

export function calculateSplitPot(_pot: number, _winnerIds: string[]): Record<string, number> {
    // รอคนเลือก
    return {};
}
