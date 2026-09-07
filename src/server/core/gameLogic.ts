import type { Card, HandRank } from '../../shared/types';

export function createDeck(): Card[] {
    const suits: Card['suit'][] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
    const ranks: Card['rank'][] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    return suits.flatMap(suit => ranks.map(rank => ({ suit, rank })));
}

export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
    const shuffledDeck = [...deck];

    for (let index = shuffledDeck.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(rng() * (index + 1));
        [shuffledDeck[index], shuffledDeck[swapIndex]] = [
            shuffledDeck[swapIndex],
            shuffledDeck[index]
        ];
    }

    return shuffledDeck;
}

export function dealCards(deck: Card[], playerCount: number, cardsPerPlayer: number): { hands: Card[][], remainingDeck: Card[] } {
    if (playerCount <= 0 || cardsPerPlayer <= 0) {
        return { hands: [], remainingDeck: [...deck] };
    }

    const totalCardsNeeded = playerCount * cardsPerPlayer;
    if (deck.length < totalCardsNeeded) {
        throw new Error("Not enough cards in deck.");
    }

    const hands: Card[][] = Array.from({ length: playerCount }, () => []);
    for (let i = 0; i < totalCardsNeeded; i++) {
        hands[i % playerCount].push(deck[i]);
    }
    const remainingDeck = deck.slice(totalCardsNeeded);
    return { hands, remainingDeck };
}

export function evaluateHand(cardsInput: Card[]): { rank: HandRank, rankValue: number, kickers: number[] } {
    if (cardsInput.length !== 3) {
        throw new Error('At least 3 cards are required to evaluate.');
    }

    // เรียงไพ่จากแต้มมากไปน้อย (A=14, K=13, ..., 2=2)
    const cards = [...cardsInput].sort((a, b) => b.rank - a.rank);

    // เช็คว่าดอกเดียวกันหมดหรือไม่
    const isFlush = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;

    // เช็คไพ่เรียง (กรณีพิเศษ A-2-3 ให้ถือว่าเป็นเรียงที่ใหญ่ที่สุด)
    const isA23 = cards[0].rank === 14 && cards[1].rank === 3 && cards[2].rank === 2;
    const isStraight = isA23 || (cards[0].rank - 1 === cards[1].rank && cards[1].rank - 1 === cards[2].rank);

    // 1. TRAIL (ไพ่ตอง)
    if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
        return { rank: 'TRAIL', rankValue: cards[0].rank, kickers: [] };
    }

    // 2. PURE_SEQUENCE (สเตรทฟลัช)
    if (isStraight && isFlush) {
        // ให้ A-2-3 มี rankValue เป็น 15 เพื่อให้ชนะ A-K-Q (14)
        return { rank: 'PURE_SEQUENCE', rankValue: isA23 ? 15 : cards[0].rank, kickers: [] };
    }

    // 3. SEQUENCE (สเตรท)
    if (isStraight) {
        return { rank: 'SEQUENCE', rankValue: isA23 ? 15 : cards[0].rank, kickers: [] };
    }

    // 4. COLOR (ฟลัช)
    if (isFlush) {
        return { rank: 'COLOR', rankValue: cards[0].rank, kickers: [cards[1].rank, cards[2].rank] };
    }

    // 5. PAIR (ไพ่คู่)
    if (cards[0].rank === cards[1].rank) {
        // คู่ซ้าย (เช่น 9-9-4)
        return { rank: 'PAIR', rankValue: cards[0].rank, kickers: [cards[2].rank] };
    } else if (cards[1].rank === cards[2].rank) {
        // คู่ขวา (เช่น 11-9-9)
        return { rank: 'PAIR', rankValue: cards[1].rank, kickers: [cards[0].rank] };
    }

    // 6. HIGH_CARD (ไพ่สูง)
    return { rank: 'HIGH_CARD', rankValue: cards[0].rank, kickers: [cards[1].rank, cards[2].rank] };
}

// 1. สร้างตารางคะแนน (Rank Weight) เพื่อให้เปรียบเทียบง่าย
const RANK_WEIGHT: Record<HandRank, number> = {
    'TRAIL': 6,
    'PURE_SEQUENCE': 5,
    'SEQUENCE': 4,
    'COLOR': 3,
    'PAIR': 2,
    'HIGH_CARD': 1
};

export function compareHands(firstHand: Card[], secondHand: Card[]): number {
    const handA = evaluateHand(firstHand);
    const handB = evaluateHand(secondHand);

    const rankDiff = RANK_WEIGHT[handA.rank] - RANK_WEIGHT[handB.rank];
    if (rankDiff !== 0) { 
        return rankDiff;
    }

    const valueDiff = handA.rankValue - handB.rankValue;
    if (valueDiff !== 0) { 
        return valueDiff;
    }

    const kickerDifference = handA.kickers
        .map((kicker, index) => kicker - handB.kickers[index])
        .find(difference => difference !== 0);

    return kickerDifference ?? 0;
}

export function getWinners(_players: { id: string, cards: Card[] }[]): string[] {
    // รอคนเลือก
    return [];
}

export function calculateSplitPot(pot: number, winnerIds: string[]): Record<string, number> {
    if (winnerIds.length === 0) {
        return {};
    }

    const share = Math.floor(pot / winnerIds.length);
    const remainder = pot % winnerIds.length;

    return Object.fromEntries(
        winnerIds.map((winnerId, index) => [
            winnerId,
            share + (index < remainder ? 1 : 0)
        ])
    );
}


