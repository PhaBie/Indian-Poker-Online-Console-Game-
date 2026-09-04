import { Card, HandRank, ServerPlayer } from '../../shared/types';

export function createDeck(): Card[] {
    // รอคนเลือก
    return [];
}

export function shuffleDeck(deck: Card[]): Card[] {
    // รอคนเลือก
    return [];
}

export function dealCards(deck: Card[], playerCount: number, cardsPerPlayer: number): { hands: Card[][], remainingDeck: Card[] } {
    // รอคนเลือก
    return { hands: [], remainingDeck: [] };
}

export function evaluateHand(cards: Card[]): { rank: HandRank, rankValue: number } {
    // รอคนเลือก
    return { rank: 'HIGH_CARD', rankValue: 0 };
}

export function compareHands(handA: Card[], handB: Card[]): number {
    // รอคนเลือก
    return 0;
}

export function determineWinners(players: ServerPlayer[]): ServerPlayer[] {
    // รอคนเลือก
    return [];
}
