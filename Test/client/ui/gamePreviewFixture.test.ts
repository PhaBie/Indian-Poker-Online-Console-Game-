import { describe, expect, test } from 'bun:test';
import {
  createGamePreviewState,
  GAME_PREVIEW_PLAYER_ID,
  GAME_PREVIEW_STATE,
  parsePreviewPlayerCount,
} from '../../../src/client/ui/screens/game/gamePreviewFixture';

describe('game preview fixture', () => {
  test('provides an interactive two-player game state without a server', () => {
    expect(GAME_PREVIEW_STATE.phase).toBe('PLAYING');
    expect(GAME_PREVIEW_STATE.currentTurnPlayerId).toBe(GAME_PREVIEW_PLAYER_ID);
    expect(GAME_PREVIEW_STATE.players).toHaveLength(2);
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
});
