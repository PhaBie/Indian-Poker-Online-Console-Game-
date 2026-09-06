import type { Card, HandRank} from '../../shared/types';

export function createDeck(): Card[] {
    // รอคนเลือก
    return [];
}

export function shuffleDeck(_deck: Card[], _rng?: () => number): Card[] {
    // รอคนเลือก
    return [];
}

export function dealCards(deck: Card[], playerCount: number, cardsPerPlayer: number): { hands: Card[][], remainingDeck: Card[] } {
    if (playerCount <= 0 || cardsPerPlayer <= 0) {
        return { hands: [], remainingDeck: [...deck] };
    }

    const totalCardsNeeded = playerCount * cardsPerPlayer;
    if (deck.length < totalCardsNeeded) {
        throw new Error("Not enough cards in deck to deal");
    }

    const hands: Card[][] = Array.from({ length: playerCount }, () => []);
    let cardIndex = 0;

    for (let round = 0; round < cardsPerPlayer; round++) {
        for (let player = 0; player < playerCount; player++) {
            hands[player].push(deck[cardIndex++]);
        }
    }

    const remainingDeck = deck.slice(cardIndex);

    return { hands, remainingDeck };
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
