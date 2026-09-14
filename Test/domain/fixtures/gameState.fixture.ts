import { GameState } from '../../../src/server/domain/models/GameState';
import { Player } from '../../../src/server/domain/models/Player';
import type { PlayerStatus, Card } from '../../../src/shared/types';

export type PlayerFixture = {
  id: string;
  name: string;
  status: PlayerStatus;
  chips: number;
  bet?: number;
  isBlind?: boolean;
  cards?: Card[];
};

export function createGameStateFixture(
  stateOverrides: Partial<GameState> = {},
  playersFixture: PlayerFixture[] = [],
): GameState {
  const players = playersFixture.map((pf) => {
    const p = new Player(pf.id, pf.name, pf.chips);
    p.status = pf.status;
    if (pf.bet !== undefined) p.bet = pf.bet;
    if (pf.isBlind !== undefined) p.isBlind = pf.isBlind;
    if (pf.cards) p.privateCards = pf.cards;
    return p;
  });

  const gameState = new GameState(players, 50, 10000);
  Object.assign(gameState, stateOverrides);
  return gameState;
}
