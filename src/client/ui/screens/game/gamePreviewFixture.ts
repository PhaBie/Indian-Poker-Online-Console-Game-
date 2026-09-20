import type { GameStatePayload } from './types';

export const GAME_PREVIEW_PLAYER_ID = 'preview-player';

export type GamePreviewPlayerCount = 2 | 3 | 4;

const PREVIEW_PLAYERS: GameStatePayload['players'] = [
  {
    id: GAME_PREVIEW_PLAYER_ID,
    name: 'YOU',
    chips: 950,
    bet: 50,
    status: 'ACTIVE',
    isBlind: true,
  },
  {
    id: 'preview-alpha',
    name: 'ALPHA',
    chips: 950,
    bet: 50,
    status: 'ACTIVE',
    isBlind: true,
  },
  {
    id: 'preview-bravo',
    name: 'BRAVO',
    chips: 900,
    bet: 50,
    status: 'ACTIVE',
    isBlind: false,
  },
  {
    id: 'preview-charlie',
    name: 'CHARLIE',
    chips: 850,
    bet: 50,
    status: 'ACTIVE',
    isBlind: true,
  },
];

export function createGamePreviewState(
  playerCount: GamePreviewPlayerCount,
): GameStatePayload {
  return {
    roomId: 'preview',
    phase: 'PLAYING',
    hostId: GAME_PREVIEW_PLAYER_ID,
    maxPlayers: playerCount,
    pot: 100,
    currentStake: 50,
    currentTurnPlayerId: GAME_PREVIEW_PLAYER_ID,
    turnEndTime: null,
    players: PREVIEW_PLAYERS.slice(0, playerCount),
    myCards: [
      { rank: 14, suit: 'SPADES' },
      { rank: 13, suit: 'HEARTS' },
      { rank: 12, suit: 'CLUBS' },
    ],
    pendingSideshow: null,
  };
}

export function parsePreviewPlayerCount(
  value: string | undefined,
): GamePreviewPlayerCount {
  if (value === '3') return 3;
  if (value === '4') return 4;
  return 2;
}

export const GAME_PREVIEW_STATE = createGamePreviewState(2);
