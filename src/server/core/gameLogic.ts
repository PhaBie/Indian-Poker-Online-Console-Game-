import { Card, HandRank, ServerPlayer } from '../../shared/types';

export function createDeck(): Card[] {
    return [];
}

export function shuffleDeck(deck: Card[], rng?: () => number): Card[] {
    return [];
}

export function dealCards(deck: Card[], playerCount: number, cardsPerPlayer: number): { hands: Card[][], remainingDeck: Card[] } {
    return { hands: [], remainingDeck: [] };
}

export function evaluateHand(cards: Card[]): { rank: HandRank, rankValue: number, kickers: number[] } {
    return { rank: 'HIGH_CARD', rankValue: 0, kickers: [] };
}

export function compareHands(handA: Card[], handB: Card[]): number {
    return 0;
}

export function getWinners(players: { id: string, cards: Card[] }[]): string[] {
    return [];
}

export function calculateSplitPot(pot: number, winnerIds: string[]): Record<string, number> {
    return {};
}
