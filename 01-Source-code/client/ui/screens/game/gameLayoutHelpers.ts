import type { Card, HandRank } from '../../../../shared/types';
import type { TableSeatPositions, PlayerBadgeInfo, StatusStateContext } from './types';
import { UI_COLORS } from '../../shared/theme/colors';

export const HAND_RANK_LABELS: Readonly<Record<HandRank, string>> = {
  TRAIL: 'TRAIL — THREE OF A KIND',
  PURE_SEQUENCE: 'PURE SEQUENCE — SAME-SUIT RUN',
  SEQUENCE: 'SEQUENCE — THREE-CARD RUN',
  COLOR: 'COLOR — SAME SUIT',
  PAIR: 'PAIR — TWO OF A KIND',
  HIGH_CARD: 'HIGH CARD',
};

/**
 * เรียงลำดับรายชื่อผู้เล่นตามมุมมอง โดยหากพบผู้เล่นปัจจุบัน (myPlayerId) จะหมุนอาเรย์ให้มาอยู่ตำแหน่งแรก แต่หากไม่พบจะคงลำดับเดิมไว้
 */
export function getOrderedPlayersByPerspective<T extends { readonly id: string }>(
  players: readonly T[],
  myPlayerId: string | null,
): readonly T[] {
  if (players.length === 0) {
    return [];
  }
  const myIndex = players.findIndex((player) => player.id === myPlayerId);
  if (myIndex === -1) {
    return [...players];
  }
  return [...players.slice(myIndex), ...players.slice(0, myIndex)];
}

/**
 * กำหนดตำแหน่งที่นั่ง 4 ทิศ (ล่าง, ซ้าย, บน, ขวา) บนโต๊ะเกมตามจำนวนผู้เล่นที่ร่วมโต๊ะ
 */
export function determineSeatPositions<T>(
  orderedPlayers: readonly T[],
): TableSeatPositions<T> {
  const playerCount = orderedPlayers.length;
  const bottomPlayer = orderedPlayers[0];

  if (playerCount === 2) {
    return {
      bottomPlayer,
      leftPlayer: undefined,
      topPlayer: orderedPlayers[1],
      rightPlayer: undefined,
    };
  }

  if (playerCount === 3) {
    return {
      bottomPlayer,
      leftPlayer: orderedPlayers[1],
      topPlayer: undefined,
      rightPlayer: orderedPlayers[2],
    };
  }

  if (playerCount >= 4) {
    return {
      bottomPlayer,
      leftPlayer: orderedPlayers[1],
      topPlayer: orderedPlayers[2],
      rightPlayer: orderedPlayers[3],
    };
  }

  return {
    bottomPlayer,
    leftPlayer: undefined,
    topPlayer: undefined,
    rightPlayer: undefined,
  };
}

const RANK_DISPLAY_MAP: Record<number, string> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export function formatCardRank(rank: number): string {
  return RANK_DISPLAY_MAP[rank] ?? rank.toString();
}

const SUIT_SYMBOLS: Record<Card['suit'], string> = {
  SPADES: '♠',
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
};

export function getCardSuitSymbol(suit: Card['suit']): string {
  return SUIT_SYMBOLS[suit] ?? '?';
}

export function getCardSuitColor(suit: Card['suit']): string {
  return suit === 'HEARTS' || suit === 'DIAMONDS'
    ? UI_COLORS.cardRedSuit
    : UI_COLORS.cardDarkSuitForeground;
}

/**
 * ตรวจสอบว่าต้องซ่อน (คว่ำ) ไพ่ของผู้เล่นหรือไม่
 * - หากมีการเปิดเผยไพ่ (Showdown หรือ Sideshow) จะไม่ซ่อน
 * - หากเป็นไพ่ของผู้เล่นอื่น จะซ่อนเสมอ
 * - หากเป็นไพ่ของผู้เล่นตนเอง จะซ่อนเมื่อยังอยู่ในสถานะ Blind
 */
export function shouldHidePlayerCards({
  isMe,
  isBlind,
  hasRevealedCards = false,
}: {
  readonly isMe: boolean;
  readonly isBlind: boolean;
  readonly hasRevealedCards?: boolean;
}): boolean {
  if (hasRevealedCards) {
    return false;
  }
  if (!isMe) {
    return true;
  }
  return isBlind;
}

/**
 * กำหนดข้อความและสีของป้ายสถานะประจำตัวผู้เล่น (Badge) เช่น [TURN], [FOLD], [DISCONNECT], [SIDESHOW?]
 */
export function getPlayerBadgeInfo(
  hasFolded: boolean,
  isThisPlayerTurn: boolean,
  isPendingSideshowTarget: boolean,
  isShowdownRevealed: boolean = false,
  isDisconnected: boolean = false,
): PlayerBadgeInfo {
  // กรณี SHOW จะเปิดเผยไพ่ของทั้งสองฝ่ายก่อนสรุปผลการแข่งขันรอบเกม แม้ระบบภายในเซิร์ฟเวอร์จะมาร์กผู้แพ้ว่าหมอบ (folded) เพื่อตัดยอดกองกลาง
  // แต่ไม่ใช่การหมอบโดยสมัครใจ จึงไม่แสดงป้าย [FOLD] ในระหว่างจังหวะเปิดเผยไพ่นี้
  if (isShowdownRevealed) {
    return { label: null, color: 'white' };
  }
  if (isDisconnected) {
    return { label: '[DISCONNECT]', color: 'redBright' };
  }
  if (hasFolded) {
    return { label: '[FOLD]', color: 'redBright' };
  }
  if (isThisPlayerTurn) {
    return { label: '[TURN]', color: 'yellowBright' };
  }
  if (isPendingSideshowTarget) {
    return { label: '[SIDESHOW?]', color: 'magentaBright' };
  }
  return { label: null, color: 'white' };
}

export interface StatusDisplayInfo {
  readonly text: string;
  readonly color: string;
  readonly bold?: boolean;
}

/**
 * ประเมินข้อความและสีสำหรับแถบแสดงสถานะส่วนกลางของโต๊ะเกมตามบริบทของเกมในปัจจุบัน
 */
export function getStatusDisplayInfo(context: StatusStateContext): StatusDisplayInfo {
  if (context.isWaitingForNextRound) {
    return {
      text: 'WAITING FOR NEW GAME',
      color: 'cyanBright',
      bold: true,
    };
  }
  if (context.isMyTurn) {
    return { text: 'Your turn!', color: 'greenBright', bold: true };
  }
  if (context.isPendingSideshowTarget) {
    return { text: 'Action Required!', color: 'redBright', bold: true };
  }
  if (context.isPendingSideshowChallenger) {
    return { text: 'Waiting for target...', color: 'yellowBright' };
  }
  if (context.hasPendingSideshow) {
    return { text: 'Sideshow pending...', color: 'gray' };
  }
  return { text: 'Waiting for turn...', color: 'white' };
}

export function resolveTableParticipants<T extends { readonly status: string }>(
  players: readonly T[],
): readonly T[] {
  const nonWaitingPlayers = players.filter((player) => player.status !== 'WAITING');
  return nonWaitingPlayers.length > 0 ? nonWaitingPlayers : players;
}
