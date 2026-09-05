import { Card, HandRank, ServerPlayer } from '../../shared/types';

export function createDeck(): Card[] {
    // รอคนเลือก
    return [];
}

export function shuffleDeck(deck: Card[], rng?: () => number): Card[] {
    // รอคนเลือก
    return [];
}

export function dealCards(deck: Card[], playerCount: number, cardsPerPlayer: number): { hands: Card[][], remainingDeck: Card[] } {
    // รอคนเลือก
    return { hands: [], remainingDeck: [] };
}

export function evaluateHand(cards: Card[]): { rank: HandRank, rankValue: number, kickers: number[] } {
    // รอคนเลือก
    return { rank: 'HIGH_CARD', rankValue: 0, kickers: [] };
}

export function compareHands(handA: Card[], handB: Card[]): number {
    // รอคนเลือก
    return 0;
}

export function getWinners(players: { id: string, cards: Card[] }[]): string[] {
    // รอคนเลือก
    return [];
}

export function calculateSplitPot(pot: number, winnerIds: string[]): Record<string, number> {
    // รอคนเลือก
    return {};
}
