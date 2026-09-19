import type { Card } from '../../../../shared/types';
import type { TableSeatPositions, PlayerBadgeInfo, StatusStateContext } from './types';

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

export function getCardSuitColor(suit: Card['suit']): 'red' | 'white' {
  return suit === 'HEARTS' || suit === 'DIAMONDS' ? 'red' : 'white';
}

export function getPlayerBadgeInfo(
  hasFolded: boolean,
  isThisPlayerTurn: boolean,
  isPendingSideshowTarget: boolean,
): PlayerBadgeInfo {
  if (hasFolded) {
    return { label: '[FOLD]', color: 'gray' };
  }
  if (isThisPlayerTurn) {
    return { label: '[TURN]', color: 'cyanBright' };
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

export function getStatusDisplayInfo(context: StatusStateContext): StatusDisplayInfo {
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
