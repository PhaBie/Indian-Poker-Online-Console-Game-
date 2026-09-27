import type { Card, HandRank } from '../../shared/types';
import {
  evaluateHandInputSchema,
  compareHandsInputSchema,
  getWinnersInputSchema,
  calculateSplitPotInputSchema,
  shuffleDeckInputSchema,
  dealCardsInputSchema,
  rngValueSchema,
} from './gameSchema';

// ============================================================================
// 🟢 PURE FUNCTIONS (Core Logic - No Side Effects, No Console.log)
// ฟังก์ชันกลุ่มนี้จะรับ Input เข้ามาและคืนค่า Output ออกไปอย่างเดียว โดยไม่แก้ไข State ภายนอก
// ============================================================================

export function createDeck(): Card[] {
  const suits: Card['suit'][] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
  const ranks: Card['rank'][] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  return suits.flatMap((suit) => ranks.map((rank) => ({ suit, rank })));
}

export function dealCards(
  deck: Card[],
  playerCount: number,
  cardsPerPlayer: number,
): { hands: Card[][]; remainingDeck: Card[] } {
  const validArgs = dealCardsInputSchema.parse({ deck, playerCount, cardsPerPlayer });

  if (validArgs.playerCount <= 0 || validArgs.cardsPerPlayer <= 0) {
    return { hands: [], remainingDeck: [...validArgs.deck] };
  }

  const totalCardsNeeded = validArgs.playerCount * validArgs.cardsPerPlayer;
  if (validArgs.deck.length < totalCardsNeeded) {
    throw new Error('Not enough cards in deck.');
  }

  const hands: Card[][] = Array.from({ length: validArgs.playerCount }, () => []);
  for (let i = 0; i < totalCardsNeeded; i++) {
    hands[i % validArgs.playerCount].push(validArgs.deck[i]);
  }
  const remainingDeck = validArgs.deck.slice(totalCardsNeeded);

  return { hands, remainingDeck };
}

export function evaluateHand(cardsInput: Card[]): {
  rank: HandRank;
  rankValue: number;
  kickers: number[];
} {
  const validCardsInput = evaluateHandInputSchema.parse(cardsInput);

  if (cardsInput.length !== 3) {
    throw new Error('At least 3 cards are required to evaluate.');
  }

  // เรียงไพ่จากแต้มมากไปน้อย (A=14, K=13, ..., 2=2)
  const cards = [...validCardsInput].sort((a, b) => b.rank - a.rank);

  // เช็คว่าดอกเดียวกันหมดหรือไม่
  const isFlush = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;

  // เช็คไพ่เรียง (กรณีพิเศษ A-2-3 ให้ถือว่าเป็นเรียงที่ใหญ่ที่สุด)
  const isA23 = cards[0].rank === 14 && cards[1].rank === 3 && cards[2].rank === 2;
  const isStraight =
    isA23 || (cards[0].rank - 1 === cards[1].rank && cards[1].rank - 1 === cards[2].rank);

  // 1. TRAIL (ไพ่ตอง)
  if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
    return { rank: 'TRAIL', rankValue: cards[0].rank, kickers: [] };
  }
  // 2. PURE_SEQUENCE (สเตรทฟลัช)
  if (isStraight && isFlush) {
    return { rank: 'PURE_SEQUENCE', rankValue: isA23 ? 15 : cards[0].rank, kickers: [] };
  }
  // 3. SEQUENCE (สเตรท)
  if (isStraight) {
    return { rank: 'SEQUENCE', rankValue: isA23 ? 15 : cards[0].rank, kickers: [] };
  }
  // 4. COLOR (ฟลัช)
  if (isFlush) {
    return {
      rank: 'COLOR',
      rankValue: cards[0].rank,
      kickers: [cards[1].rank, cards[2].rank],
    };
  }
  // 5. PAIR (ไพ่คู่)
  if (cards[0].rank === cards[1].rank) {
    return { rank: 'PAIR', rankValue: cards[0].rank, kickers: [cards[2].rank] };
  }
  if (cards[1].rank === cards[2].rank) {
    return { rank: 'PAIR', rankValue: cards[1].rank, kickers: [cards[0].rank] };
  }
  // 6. HIGH_CARD (ไพ่สูง)
  return {
    rank: 'HIGH_CARD',
    rankValue: cards[0].rank,
    kickers: [cards[1].rank, cards[2].rank],
  };
}

// 1. สร้างตารางคะแนน (Rank Weight) เพื่อให้เปรียบเทียบง่าย
export const RANK_WEIGHT: Record<HandRank, number> = {
  TRAIL: 6,
  PURE_SEQUENCE: 5,
  SEQUENCE: 4,
  COLOR: 3,
  PAIR: 2,
  HIGH_CARD: 1,
};

export function compareHands(firstHand: Card[], secondHand: Card[]): number {
  const valid = compareHandsInputSchema.parse({ firstHand, secondHand });
  const handA = evaluateHand(valid.firstHand);
  const handB = evaluateHand(valid.secondHand);

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
    .find((difference) => difference !== 0);

  return kickerDifference ?? 0;
}

export function getWinners(players: { id: string; cards: Card[] }[]): string[] {
  const validPlayers = getWinnersInputSchema.parse(players);

  // ถ้าไม่มีผู้เล่น ให้คืนค่าเป็น array ว่าง
  if (validPlayers.length === 0) {
    return [];
  }

  // หาผู้เล่นที่มีมือดีที่สุด
  let bestCards = validPlayers[0].cards;
  let winnerIds: string[] = [validPlayers[0].id];

  for (let i = 1; i < validPlayers.length; i++) {
    const current = validPlayers[i];
    const cmp = compareHands(current.cards, bestCards);

    if (cmp > 0) {
      // เจอผู้เล่นที่มีมือดีกว่า ให้เริ่มรายการผู้ชนะใหม่
      bestCards = current.cards;
      winnerIds = [current.id];
    } else if (cmp === 0) {
      // มือเท่ากับแต้มที่ดีที่สุด ให้เพิ่มเข้าไปเป็นผู้ชนะร่วม (Split Pot)
      winnerIds.push(current.id);
    }
  }

  return winnerIds;
}

export function calculateSplitPot(
  pot: number,
  winnerIds: string[],
): Record<string, number> {
  const validCheck = calculateSplitPotInputSchema.parse({ pot, winnerIds });

  if (validCheck.winnerIds.length === 0) {
    return {};
  }

  const share = Math.floor(validCheck.pot / validCheck.winnerIds.length);
  const remainder = validCheck.pot % validCheck.winnerIds.length;

  return Object.fromEntries(
    validCheck.winnerIds.map((winnerId, index) => [
      winnerId,
      share + (index < remainder ? 1 : 0),
    ]),
  );
}

// ============================================================================
// 🟡 IMPURE FUNCTIONS (Randomness / Side Effects)
// ฟังก์ชันกลุ่มนี้มีการพึ่งพาความน่าจะเป็น หรือ State ภายนอก (เช่น Math.random)
// ============================================================================

export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
  const validDeck = shuffleDeckInputSchema.parse(deck);
  const shuffledDeck = [...validDeck];

  for (let index = shuffledDeck.length - 1; index > 0; index--) {
    const rawRngValue = rng();
    const validRngValue = rngValueSchema.parse(rawRngValue);
    const swapIndex = Math.floor(validRngValue * (index + 1));

    [shuffledDeck[index], shuffledDeck[swapIndex]] = [
      shuffledDeck[swapIndex],
      shuffledDeck[index],
    ];
  }

  return shuffledDeck;
}

// ============================================================================
// 🔴 IMPURE FUNCTIONS (Side Effects / Logging / Simulation)
// ฟังก์ชันกลุ่มนี้มีหน้าที่แสดงผล (console.log) ติดต่อภายนอก หรือจำลองการเล่น
// ============================================================================

export function simulateGameAndLog() {
  console.log('====================================================');
  console.log('🚀 เริ่มการจำลองเกม (Indian Poker) 🚀');
  console.log('====================================================\n');

  console.log('🃏 [GameLogic] เริ่มสร้างสำรับไพ่ใหม่...');
  const deck = createDeck();
  console.log(`✅ [GameLogic] สร้างไพ่เสร็จสิ้น จำนวน ${deck.length} ใบ`);
  console.log(
    '📦 ข้อมูลในสำรับไพ่ (Deck): ดู data/generated/simulation.json เพื่อตรวจสอบ',
    '\n',
  );

  console.log(`🔀 [GameLogic] กำลังสับไพ่...`);
  const shuffledDeck = shuffleDeck(deck);
  console.log(`✅ [GameLogic] สับไพ่เสร็จสิ้น`);
  console.log(
    '📦 ข้อมูลในสำรับไพ่หลังจากสับ (Shuffled Deck): ดู data/generated/simulation.json เพื่อตรวจสอบ',
    '\n',
  );

  const PLAYERS = ['Player_1', 'Player_2', 'Player_3', 'Player_4'];
  const CARDS_PER_PLAYER = 3;

  console.log(
    `🎴 [GameLogic] กำลังแจกไพ่ให้ผู้เล่น ${PLAYERS.length} คน คนละ ${CARDS_PER_PLAYER} ใบ...`,
  );
  const { hands, remainingDeck } = dealCards(
    shuffledDeck,
    PLAYERS.length,
    CARDS_PER_PLAYER,
  );
  console.log(`✅ [GameLogic] แจกไพ่สำเร็จ (ไพ่เหลือในกอง ${remainingDeck.length} ใบ)\n`);

  const suitSymbols: Record<string, string> = {
    SPADES: '♠',
    HEARTS: '♥',
    DIAMONDS: '♦',
    CLUBS: '♣',
  };

  const playerHands = PLAYERS.map((id, index) => {
    const cards = hands[index];
    const evaluated = evaluateHand(cards);
    const cardStr = cards.map((c) => `${c.rank}${suitSymbols[c.suit]}`).join('-');

    console.log(`👤 [${id}] ได้รับไพ่:`);
    console.log(
      `🔍 ไพ่ ${cardStr} -> ได้ [${evaluated.rank}] (RankValue: ${evaluated.rankValue})\n`,
    );

    return { id, cards };
  });

  console.log('====================================================');
  console.log(`🏆 [GameLogic] ค้นหาผู้ชนะจากผู้เล่น ${PLAYERS.length} คน...`);
  const winners = getWinners(playerHands);
  console.log(`🏅 [GameLogic] ผู้ชนะได้แก่: [${winners.join(', ')}]\n`);

  const POT_AMOUNT = 1000;
  console.log(
    `💰 [GameLogic] แบ่งกองกลาง ${POT_AMOUNT} ชิป ให้ผู้ชนะ ${winners.length} คน...`,
  );
  const splitResult = calculateSplitPot(POT_AMOUNT, winners);
  console.log(`💵 [GameLogic] ผลลัพธ์การโอนชิป:`, JSON.stringify(splitResult), '\n');

  // Export JSON
  const simulationData = {
    deck,
    shuffledDeck,
    remainingDeck,
    playerHands: playerHands.map((p) => ({
      id: p.id,
      cards: p.cards,
      evaluated: evaluateHand(p.cards),
    })),
    winners,
    splitResult,
  };

  try {
    const fs = require('fs');
    const path = require('path');
    const simulationPath = path.join(
      process.cwd(),
      'data',
      'generated',
      'simulation.json',
    );
    fs.mkdirSync(path.dirname(simulationPath), { recursive: true });
    fs.writeFileSync(simulationPath, JSON.stringify(simulationData, null, 2));
    console.log(
      '💾 [GameLogic] บันทึกข้อมูล JSON ลงไฟล์ data/generated/simulation.json เรียบร้อยแล้ว\n',
    );
  } catch (err) {
    console.error('ไม่สามารถบันทึกไฟล์ JSON ได้:', err);
  }

  console.log('====================================================');
  console.log('🎉 จบการจำลองเกม 🎉');
  console.log('====================================================\n');
}

// ทำงานเฉพาะเมื่อสั่งรันไฟล์นี้โดยตรงผ่าน bun run src/server/core/gameLogic.ts
// @ts-ignore
if (import.meta.main) {
  simulateGameAndLog();
}
