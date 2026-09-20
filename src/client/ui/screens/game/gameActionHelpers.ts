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

  if (state.currentTurnPlayerId !== state.myPlayerId || state.pendingSideshow) {
    return [];
  }

  const activePlayerCount = state.players.filter(
    (player) => player.status === 'ACTIVE',
  ).length;
  const betRange = getBetRange(state.currentStake, me.isBlind);
  const actions: GameplayAction[] = [
    { label: 'CALL', value: 'CALL', hint: `$${betRange.minimum}` },
    { label: 'BET', value: 'BET', hint: `$${betRange.minimum}–$${betRange.maximum}` },
    { label: 'FOLD', value: 'FOLD' },
  ];

  if (me.isBlind) {
    actions.splice(2, 0, { label: 'SEE', value: 'SEEN' });
  }
  if (activePlayerCount > 2) {
    actions.push({ label: 'DUEL', value: 'SIDESHOW' });
  }
  const opponent = state.players.find(
    (player) => player.id !== state.myPlayerId && player.status === 'ACTIVE',
  );
  if (activePlayerCount === 2 && (me.isBlind || !opponent?.isBlind)) {
    actions.push({ label: 'SHOW', value: 'SHOW' });
  }
  return actions;
}
