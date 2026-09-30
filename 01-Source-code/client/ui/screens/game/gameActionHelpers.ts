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

/**
 * คำนวณช่วงเงินเดิมพันต่ำสุดและสูงสุดตามสถานะการเล่นของผู้เล่น
 * - หากอยู่ในสถานะ Blind: ตัวคูณเป็น 1 เท่าของ Stake ปัจจุบัน
 * - หากเปิดดูไพ่แล้ว (Seen): ตัวคูณเป็น 2 เท่าของ Stake ปัจจุบัน
 */
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

/**
 * ประเมินรายการแอคชันที่ผู้เล่นปัจจุบันสามารถเลือกเล่นได้ในเทิร์นนี้
 * ตรวจสอบเงื่อนไขยอดชิปคงเหลือ, คำขอ Sideshow ที่รอการตอบรับ, และจำนวนผู้เล่นที่ยังอยู่ในเกม
 */
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

  // เซิร์ฟเวอร์จะปฏิเสธคำสั่งที่ใช้ชิปเกินกว่าที่ผู้เล่นมี จึงแสดงเฉพาะแอคชันที่สามารถจ่ายชิปได้จริง
  // โดยเฉพาะหลังเปิดดูไพ่แล้ว ซึ่งยอดเดิมพันขั้นต่ำจะเพิ่มเป็นสองเท่า
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
