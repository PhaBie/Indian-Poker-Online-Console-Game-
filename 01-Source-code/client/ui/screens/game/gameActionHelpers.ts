import type { GameActionType, PublicPlayerDTO } from '../../../../shared/types';

export interface GameplayAction {
  readonly label: string;
  readonly value: GameActionType;
  readonly hint?: string;
}

export interface GameplayActionState {
  readonly players: readonly PublicPlayerDTO[];
  readonly myPlayerId: string | null;
  readonly currentTurnPlayerId: string | null;
  readonly currentStake: number;
  readonly pendingSideshow: { challengerId: string; targetId: string } | null;
}

export function getBetRange(
  currentStake: number,
  isBlind: boolean,
): {
  readonly minimum: number;
  readonly maximum: number;
} {
  const multiplier = isBlind ? 1 : 2;
  return {
    minimum: currentStake * multiplier,
    maximum: currentStake * multiplier * 2,
  };
}

export function getGameplayActions(
  state: GameplayActionState,
): readonly GameplayAction[] {
  const me = state.players.find((player) => player.id === state.myPlayerId);
  if (!me) return [];

  if (state.pendingSideshow?.targetId === state.myPlayerId) {
    return [
      { label: 'ACCEPT', value: 'ACCEPT_SIDESHOW' },
      { label: 'DECLINE', value: 'REJECT_SIDESHOW' },
    ];
  }

  if (me.chips <= 0) return [];

  if (state.currentTurnPlayerId !== state.myPlayerId || state.pendingSideshow) {
    return [];
  }

  const activePlayerCount = state.players.filter(
    (player) => player.status === 'ACTIVE',
  ).length;
  const isEveryActivePlayerSeen = state.players
    .filter((player) => player.status === 'ACTIVE')
    .every((player) => !player.isBlind);
  const betRange = getBetRange(state.currentStake, me.isBlind);
  const actions: GameplayAction[] = [];

  // The server rejects payments above a player's stack. Keep every displayed
  // choice executable, especially after a player has looked at their cards
  // and their minimum payment doubles.
  if (me.chips >= betRange.minimum) {
    actions.push({ label: 'CALL', value: 'CALL', hint: `$${betRange.minimum}` });
    actions.push({
      label: 'BET',
      value: 'BET',
      hint: `$${betRange.minimum}–$${Math.min(betRange.maximum, me.chips)}`,
    });
  }

  actions.push({ label: 'FOLD', value: 'FOLD' });

  if (me.isBlind) {
    actions.splice(Math.min(2, actions.length - 1), 0, { label: 'SEE', value: 'SEEN' });
  }
  if (
    activePlayerCount > 2 &&
    isEveryActivePlayerSeen &&
    me.chips >= state.currentStake * 2
  ) {
    actions.push({ label: 'DUEL', value: 'SIDESHOW', hint: 'PREVIOUS' });
  }
  const opponent = state.players.find(
    (player) => player.id !== state.myPlayerId && player.status === 'ACTIVE',
  );
  const showCost = me.isBlind ? state.currentStake : state.currentStake * 2;
  if (
    activePlayerCount === 2 &&
    (me.isBlind || !opponent?.isBlind) &&
    me.chips >= showCost
  ) {
    actions.push({ label: 'SHOW', value: 'SHOW' });
  }
  return actions;
}
