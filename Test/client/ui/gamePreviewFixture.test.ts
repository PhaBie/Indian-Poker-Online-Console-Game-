import { describe, expect, test } from 'bun:test';
import {
  createGamePreviewState,
  GAME_PREVIEW_PLAYER_ID,
  GAME_PREVIEW_STATE,
  parsePreviewPlayerCount,
  shuffleOpponentNames,
} from '../../../src/client/ui/screens/game/gamePreviewFixture';

describe('game preview fixture', () => {
  test('provides an interactive two-player game state without a server', () => {
    expect(GAME_PREVIEW_STATE.phase).toBe('PLAYING');
    expect(GAME_PREVIEW_STATE.currentTurnPlayerId).toBe(GAME_PREVIEW_PLAYER_ID);
    expect(GAME_PREVIEW_STATE.players).toHaveLength(2);
    expect(GAME_PREVIEW_STATE.players[0].name).toBe('YOU');
    expect(GAME_PREVIEW_STATE.players[1].name).toBe('ALPHA');
  });

  test('creates a fixture for each supported table size', () => {
    expect(createGamePreviewState(2).players).toHaveLength(2);
    expect(createGamePreviewState(3).players).toHaveLength(3);
    expect(createGamePreviewState(4).players).toHaveLength(4);
  });

  test('uses a two-player preview when no valid player count is provided', () => {
    expect(parsePreviewPlayerCount(undefined)).toBe(2);
    expect(parsePreviewPlayerCount('3')).toBe(3);
    expect(parsePreviewPlayerCount('4')).toBe(4);
    expect(parsePreviewPlayerCount('99')).toBe(2);
  });

  test('shuffleOpponentNames keeps single element or empty list intact', () => {
    expect(shuffleOpponentNames([])).toEqual([]);
    expect(shuffleOpponentNames(['ALPHA'])).toEqual(['ALPHA']);
  });

  test('shuffleOpponentNames contains all original names', () => {
    const originalNames = ['ALPHA', 'BRAVO', 'CHARLIE'];
    const shuffledNames = shuffleOpponentNames(originalNames);
    expect(shuffledNames).toHaveLength(3);
    expect([...shuffledNames].sort()).toEqual([...originalNames].sort());
  });

  test('four player game preview randomizes opponent positions across multiple initializations', () => {
    const seatOrderRuns = Array.from({ length: 20 }, () => {
      const state = createGamePreviewState(4);
      return state.players
        .slice(1)
        .map((player) => player.name)
        .join(',');
    });
    const uniqueSeatOrders = new Set(seatOrderRuns);
    expect(uniqueSeatOrders.size).toBeGreaterThan(1);
  });
});
