import { describe, expect, test } from 'bun:test';
import { getGameplayActions } from '../../../src/client/ui/screens/game/gameActionHelpers';
import { getGameEscapeAction } from '../../../src/client/ui/screens/game/gameEscapeActions';

const primaryTestPlayer = {
  id: 'player_me',
  name: 'Me',
  chips: 950,
  bet: 50,
  status: 'ACTIVE' as const,
  isBlind: true,
};

const opponentTestPlayer = {
  id: 'player_opponent',
  name: 'Opponent',
  chips: 950,
  bet: 50,
  status: 'ACTIVE' as const,
  isBlind: true,
};

const activeTablePlayers = [primaryTestPlayer, opponentTestPlayer];

describe('13. ระบบควบคุมการกระทำในเกม (Game Actions UI)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test('[getGameplayActions] 13.1 ผู้เล่นสถานะ Blind ถึงตาเล่นในโต๊ะ 2 คน → แสดงรายการ Action ที่ถูกกติกาครบถ้วน', () => {
      const availableActionList = getGameplayActions({
        players: activeTablePlayers,
        myPlayerId: 'player_me',
        currentTurnPlayerId: 'player_me',
        currentStake: 50,
        pendingSideshow: null,
      });

      expect(availableActionList).toEqual([
        { label: 'CALL', value: 'CALL', hint: '$50' },
        { label: 'BET', value: 'BET', hint: '$50–$100' },
        { label: 'SEE', value: 'SEEN' },
        { label: 'FOLD', value: 'FOLD' },
        { label: 'SHOW', value: 'SHOW' },
      ]);
    });

    test('[getGameEscapeAction] 13.2 กดปุ่ม Escape ขณะกำลังป้อนจำนวนเงินเดิมพัน → ยกเลิกการป้อนเดิมพันและกลับสู่เมนูเลือกการกระทำในเกม (Action Menu)', () => {
      const determinedEscapeAction = getGameEscapeAction(true, 'input_bet', false);
      expect(determinedEscapeAction).toBe('cancel_bet');
    });

    test('[getGameEscapeAction] 13.3 กดปุ่ม Escape จากเมนูเลือก Action ปกติ → เปิดกล่องยืนยันการออกจากห้อง', () => {
      const determinedEscapeAction = getGameEscapeAction(true, 'menu', false);
      expect(determinedEscapeAction).toBe('open_exit');
    });
  });

  describe('กรณีตาเล่นและขอบเขตข้อผิดพลาด (Turn Logic & Error Boundaries)', () => {
    test('[getGameplayActions] 13.4 ยังไม่ถึงตาของผู้เล่นตนเอง → ไม่แสดงรายการ Action ใดๆ', () => {
      const availableActionList = getGameplayActions({
        players: activeTablePlayers,
        myPlayerId: 'player_me',
        currentTurnPlayerId: 'player_opponent',
        currentStake: 50,
        pendingSideshow: null,
      });

      expect(availableActionList).toEqual([]);
    });

    test('[getGameplayActions] 13.5 ผู้เล่นชิปหมดจนล้มละลาย (Chips = 0) → ซ่อนรายการ Action ทั้งหมด', () => {
      const bankruptPlayer = { ...primaryTestPlayer, chips: 0 };
      const bankruptTablePlayers = [bankruptPlayer, opponentTestPlayer];

      const availableActionList = getGameplayActions({
        players: bankruptTablePlayers,
        myPlayerId: 'player_me',
        currentTurnPlayerId: 'player_me',
        currentStake: 50,
        pendingSideshow: null,
      });

      expect(availableActionList).toEqual([]);
    });

    test('[getGameplayActions] 13.6 ผู้เล่นสถานะ Seen มีชิปไม่พอ Call หรือ Show → บังคับให้เลือกได้เฉพาะ FOLD', () => {
      const insufficientChipsPlayer = {
        ...primaryTestPlayer,
        chips: 50,
        bet: 50,
        status: 'ACTIVE' as const,
        isBlind: false,
      };
      const tablePlayersWithShortStack = [insufficientChipsPlayer, opponentTestPlayer];

      const availableActionList = getGameplayActions({
        players: tablePlayersWithShortStack,
        myPlayerId: 'player_me',
        currentTurnPlayerId: 'player_me',
        currentStake: 100,
        pendingSideshow: null,
      });

      expect(availableActionList).toEqual([{ label: 'FOLD', value: 'FOLD' }]);
    });

    test('[getGameEscapeAction] 13.7 กล่องยืนยันการออกเปิดอยู่แล้ว → กด Escape ซ้ำต้องไม่ทำ Action ซ้ำซ้อน', () => {
      const determinedEscapeAction = getGameEscapeAction(true, 'menu', true);
      expect(determinedEscapeAction).toBeNull();
    });
  });
});
