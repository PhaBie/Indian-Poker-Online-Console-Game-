import { describe, it, expect } from 'bun:test';
import {
  getOrderedPlayersByPerspective,
  determineSeatPositions,
  formatCardRank,
  getCardSuitSymbol,
  getPlayerBadgeInfo,
  getStatusDisplayInfo,
} from '../../../src/client/ui/screens/game/gameLayoutHelpers';

describe('gameLayoutHelpers - getOrderedPlayersByPerspective', () => {
  const samplePlayers = [
    { id: 'player-1', name: 'Alice' },
    { id: 'player-2', name: 'Bob' },
    { id: 'player-3', name: 'Charlie' },
    { id: 'player-4', name: 'Dan' },
  ];

  it('should return empty list when given empty players array', () => {
    const result = getOrderedPlayersByPerspective([], 'player-1');
    expect(result).toEqual([]);
  });

  it('should preserve original order when spectator with unknown player id', () => {
    const result = getOrderedPlayersByPerspective(samplePlayers, 'spectator-id');
    expect(result).toEqual(samplePlayers);
  });

  it('should maintain order when current player is already at index 0', () => {
    const result = getOrderedPlayersByPerspective(samplePlayers, 'player-1');
    expect(result[0].id).toBe('player-1');
    expect(result[1].id).toBe('player-2');
    expect(result[2].id).toBe('player-3');
    expect(result[3].id).toBe('player-4');
  });

  it('should rotate players array so current player is placed at index 0', () => {
    const result = getOrderedPlayersByPerspective(samplePlayers, 'player-3');
    expect(result[0].id).toBe('player-3');
    expect(result[1].id).toBe('player-4');
    expect(result[2].id).toBe('player-1');
    expect(result[3].id).toBe('player-2');
  });

  it('should rotate correctly when current player is the last element', () => {
    const result = getOrderedPlayersByPerspective(samplePlayers, 'player-4');
    expect(result[0].id).toBe('player-4');
    expect(result[1].id).toBe('player-1');
    expect(result[2].id).toBe('player-2');
    expect(result[3].id).toBe('player-3');
  });
});

describe('gameLayoutHelpers - determineSeatPositions', () => {
  it('should assign head-to-head positions when player count is 2', () => {
    const players = ['Alice', 'Bob'];
    const seats = determineSeatPositions(players);
    expect(seats.bottomPlayer).toBe('Alice');
    expect(seats.topPlayer).toBe('Bob');
    expect(seats.leftPlayer).toBeUndefined();
    expect(seats.rightPlayer).toBeUndefined();
  });

  it('should assign triangle positions when player count is 3', () => {
    const players = ['Alice', 'Bob', 'Charlie'];
    const seats = determineSeatPositions(players);
    expect(seats.bottomPlayer).toBe('Alice');
    expect(seats.leftPlayer).toBe('Bob');
    expect(seats.rightPlayer).toBe('Charlie');
    expect(seats.topPlayer).toBeUndefined();
  });

  it('should assign four-way cross positions when player count is 4 or more', () => {
    const players = ['Alice', 'Bob', 'Charlie', 'Dan'];
    const seats = determineSeatPositions(players);
    expect(seats.bottomPlayer).toBe('Alice');
    expect(seats.leftPlayer).toBe('Bob');
    expect(seats.topPlayer).toBe('Charlie');
    expect(seats.rightPlayer).toBe('Dan');
  });

  it('should handle single player table without throwing', () => {
    const players = ['Alice'];
    const seats = determineSeatPositions(players);
    expect(seats.bottomPlayer).toBe('Alice');
    expect(seats.leftPlayer).toBeUndefined();
    expect(seats.topPlayer).toBeUndefined();
    expect(seats.rightPlayer).toBeUndefined();
  });
});

describe('gameLayoutHelpers - formatCardRank and suit helpers', () => {
  it('should format face card ranks correctly', () => {
    expect(formatCardRank(11)).toBe('J');
    expect(formatCardRank(12)).toBe('Q');
    expect(formatCardRank(13)).toBe('K');
    expect(formatCardRank(14)).toBe('A');
  });

  it('should format numeral card ranks as string numbers', () => {
    expect(formatCardRank(10)).toBe('10');
    expect(formatCardRank(2)).toBe('2');
  });

  it('should return correct unicode symbols for suits', () => {
    expect(getCardSuitSymbol('SPADES')).toBe('♠');
    expect(getCardSuitSymbol('HEARTS')).toBe('♥');
    expect(getCardSuitSymbol('DIAMONDS')).toBe('♦');
    expect(getCardSuitSymbol('CLUBS')).toBe('♣');
  });
});

describe('gameLayoutHelpers - getPlayerBadgeInfo', () => {
  it('should prioritize folded badge when player has folded', () => {
    const badge = getPlayerBadgeInfo(true, true, true);
    expect(badge.label).toBe('[FOLD]');
  });

  it('should display turn badge when player is active and has not folded', () => {
    const badge = getPlayerBadgeInfo(false, true, false);
    expect(badge.label).toBe('[TURN]');
  });

  it('should display sideshow challenge badge when target of challenge', () => {
    const badge = getPlayerBadgeInfo(false, false, true);
    expect(badge.label).toBe('[SIDESHOW?]');
  });

  it('should return null badge for inactive passive player', () => {
    const badge = getPlayerBadgeInfo(false, false, false);
    expect(badge.label).toBeNull();
  });
});

describe('gameLayoutHelpers - getStatusDisplayInfo', () => {
  it('should display your turn message when isMyTurn is true', () => {
    const status = getStatusDisplayInfo({
      isMyTurn: true,
      isPendingSideshowTarget: false,
      isPendingSideshowChallenger: false,
      hasPendingSideshow: false,
    });
    expect(status.text).toBe('Your turn!');
  });

  it('should display action required when targeted by sideshow', () => {
    const status = getStatusDisplayInfo({
      isMyTurn: false,
      isPendingSideshowTarget: true,
      isPendingSideshowChallenger: false,
      hasPendingSideshow: true,
    });
    expect(status.text).toBe('Action Required!');
  });

  it('should display waiting for target when challenger initiated sideshow', () => {
    const status = getStatusDisplayInfo({
      isMyTurn: false,
      isPendingSideshowTarget: false,
      isPendingSideshowChallenger: true,
      hasPendingSideshow: true,
    });
    expect(status.text).toBe('Waiting for target...');
  });

  it('should display default waiting message when idle', () => {
    const status = getStatusDisplayInfo({
      isMyTurn: false,
      isPendingSideshowTarget: false,
      isPendingSideshowChallenger: false,
      hasPendingSideshow: false,
    });
    expect(status.text).toBe('Waiting for turn...');
  });
});
