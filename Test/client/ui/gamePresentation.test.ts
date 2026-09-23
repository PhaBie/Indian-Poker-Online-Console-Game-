import { describe, expect, test } from 'bun:test';
import {
  determineSeatPositions,
  getOrderedPlayersByPerspective,
  getPlayerBadgeInfo,
  getStatusDisplayInfo,
  resolveTableParticipants,
} from '../../../src/client/ui/screens/game/gameLayoutHelpers';
import {
  GAMEPLAY_HEIGHT,
  getGameplayLayoutMode,
} from '../../../src/client/ui/screens/GameScreen';
import { GAME_TABLE_CANVAS_HEIGHT } from '../../../src/client/ui/screens/game/layoutConstants';
import {
  getRoundParticipants,
  getWinningHandLabel,
  sortPlayersForResult,
} from '../../../src/client/ui/screens/game/GameRoundResultDialog';
import {
  getSideshowPresentationKey,
  getVisibleSideshowResult,
} from '../../../src/client/ui/screens/game/sideshowPresentation';
import type { GameStatePayload } from '../../../src/client/ui/screens/game/types';

describe('14. ระบบแสดงผลโต๊ะเกมและผลการเล่น (Game Presentation UI)', () => {
  describe('การจัดสรรที่นั่งและมุมมองโต๊ะเกม (Seating & Perspective Layout)', () => {
    test('[determineSeatPositions] 14.1 จัดสรรตำแหน่งที่นั่งสำหรับผู้เล่น 2, 3 และ 4 คน → ตำแหน่งที่นั่งรอบโต๊ะถูกต้อง', () => {
      const twoPlayerSeats = determineSeatPositions(['Player_A', 'Player_B']);
      expect(twoPlayerSeats.topPlayer).toBe('Player_B');

      const threePlayerSeats = determineSeatPositions([
        'Player_A',
        'Player_B',
        'Player_C',
      ]);
      expect(threePlayerSeats.rightPlayer).toBe('Player_C');

      const fourPlayerSeats = determineSeatPositions([
        'Player_A',
        'Player_B',
        'Player_C',
        'Player_D',
      ]);
      expect(fourPlayerSeats.topPlayer).toBe('Player_C');
    });

    test('[getOrderedPlayersByPerspective] 14.2 จัดลำดับมุมมองผู้เล่นรอบโต๊ะ → ผู้เล่นเจ้าของหน้าจออยู่ตำแหน่งล่างสุด (Index 0)', () => {
      const allPlayersInRoom = [
        { id: 'player_alice', name: 'Alice' },
        { id: 'player_bob', name: 'Bob' },
        { id: 'player_carol', name: 'Carol' },
      ];
      const orderedByBobPerspective = getOrderedPlayersByPerspective(
        allPlayersInRoom,
        'player_bob',
      );

      expect(orderedByBobPerspective[0].id).toBe('player_bob');
      expect(orderedByBobPerspective[1].id).toBe('player_carol');
      expect(orderedByBobPerspective[2].id).toBe('player_alice');
    });

    test('[resolveTableParticipants] 14.3 กรองเฉพาะผู้เล่นที่มีส่วนร่วมในรอบ ไม่รวมผู้ชม WAITING พร้อม Fallback เมื่อทุกคนรอเล่น', () => {
      const playersIncludingSpectator = [
        { id: 'player_active_1', name: 'ActiveOne', status: 'ACTIVE' },
        { id: 'player_active_2', name: 'ActiveTwo', status: 'ACTIVE' },
        { id: 'player_spectator', name: 'Spectator', status: 'WAITING' },
      ];
      const resolvedTableParticipants = resolveTableParticipants(
        playersIncludingSpectator,
      );
      expect(resolvedTableParticipants).toHaveLength(2);
      expect(resolvedTableParticipants.map((participant) => participant.id)).toEqual([
        'player_active_1',
        'player_active_2',
      ]);

      const allSpectatingPlayers = [
        { id: 'player_waiting_1', name: 'WaitingOne', status: 'WAITING' },
        { id: 'player_waiting_2', name: 'WaitingTwo', status: 'WAITING' },
      ];
      const resolvedFallbackParticipants = resolveTableParticipants(allSpectatingPlayers);
      expect(resolvedFallbackParticipants).toHaveLength(2);
      expect(resolvedFallbackParticipants.map((participant) => participant.id)).toEqual([
        'player_waiting_1',
        'player_waiting_2',
      ]);
    });
  });

  describe('ป้ายกำกับและสถานะการเล่น (Status & Badge Presentation)', () => {
    test('[getPlayerBadgeInfo] 14.4 สร้างป้ายสถานะ Badge ของผู้เล่น → แสดง [FOLD], [TURN] หรือซ่อนป้ายตอน Showdown อย่างถูกต้อง', () => {
      const foldBadge = getPlayerBadgeInfo(true, false, false);
      expect(foldBadge.label).toBe('[FOLD]');

      const turnBadge = getPlayerBadgeInfo(false, true, false);
      expect(turnBadge.label).toBe('[TURN]');

      const showdownBadge = getPlayerBadgeInfo(false, false, false, true);
      expect(showdownBadge.label).toBeNull();
    });

    test('[getStatusDisplayInfo] 14.5 สร้างข้อความสถานะการเล่น → แสดงข้อความผู้ชมรอรอบใหม่ หรือแสดงตาของผู้เล่นอย่างถูกต้อง', () => {
      const spectatorStatusInfo = getStatusDisplayInfo({
        isWaitingForNextRound: true,
        isMyTurn: false,
        isPendingSideshowTarget: false,
        isPendingSideshowChallenger: false,
        hasPendingSideshow: false,
      });
      expect(spectatorStatusInfo.text).toBe('SPECTATING · WAITING FOR NEW GAME');

      const myTurnStatusInfo = getStatusDisplayInfo({
        isWaitingForNextRound: false,
        isMyTurn: true,
        isPendingSideshowTarget: false,
        isPendingSideshowChallenger: false,
        hasPendingSideshow: false,
      });
      expect(myTurnStatusInfo.text).toBe('Your turn!');
    });
  });

  describe('การสรุปผลรอบและการดวลการ์ด (Round Result & Sideshow Presentation)', () => {
    test('[getWinningHandLabel] 14.6 ผู้เล่นคนอื่นหมอบหมดจนเหลือกองกลางไม่ถูกแข่ง → แสดงผลเป็น WON BY FOLD', () => {
      const winningLabel = getWinningHandLabel({
        winnerIds: ['winner_player'],
        winningHand: 'HIGH_CARD',
        payouts: { winner_player: 100 },
        exposedCards: {},
      });
      expect(winningLabel).toBe('WON BY FOLD');
    });

    test('[sortPlayersForResult] 14.7 จัดอันดับผู้เล่นในหน้าต่างสรุปผลรอบ → ผู้ชนะอยู่อันดับแรก ตามด้วยยอดชิปคงเหลือ', () => {
      const summaryPlayerList = [
        { id: 'player_third', name: 'Third', chips: 850, bet: 50 },
        { id: 'player_winner', name: 'Winner', chips: 1_150, bet: 50 },
        { id: 'player_second', name: 'Second', chips: 1_000, bet: 100 },
      ];
      const roundResultPayload = {
        winnerIds: ['player_winner'],
        winningHand: 'HIGH_CARD' as const,
        payouts: { player_winner: 150 },
        exposedCards: {},
      };

      const sortedParticipants = sortPlayersForResult(
        summaryPlayerList,
        roundResultPayload,
        {
          player_third: 900,
          player_winner: 1_000,
          player_second: 1_100,
        },
      );

      expect(sortedParticipants.map((participant) => participant.id)).toEqual([
        'player_winner',
        'player_second',
        'player_third',
      ]);
    });

    test('[getRoundParticipants] 14.8 คัดแยกผู้เล่นในสรุปผลการเล่น → ไม่นับรวมผู้ชมสถานะ WAITING ในหน้าต่างผลการเล่น', () => {
      const participantList = [
        { id: 'player_winner', name: 'Winner', chips: 550, bet: 250, status: 'ACTIVE' },
        { id: 'player_loser', name: 'Loser', chips: 50, bet: 250, status: 'FOLDED' },
        {
          id: 'player_spectator',
          name: 'Spectator',
          chips: 300,
          bet: 0,
          status: 'WAITING',
        },
      ];
      const filteredParticipants = getRoundParticipants(participantList);

      expect(filteredParticipants.map((participant) => participant.id)).toEqual([
        'player_winner',
        'player_loser',
      ]);
    });

    test('[sideshowPresentation] 14.9 ซ่อนผลการดวล Sideshow จากโต๊ะเมื่อแสดงผลหน้าจอท้องถิ่นเสร็จสมบูรณ์', () => {
      const sampleSideshowResult: NonNullable<GameStatePayload['sideshowResult']> = {
        challengerId: 'player_challenger',
        targetId: 'player_target',
        winnerId: 'player_challenger',
        loserId: 'player_target',
        cards: {
          player_challenger: [{ rank: 14, suit: 'SPADES' }],
          player_target: [{ rank: 2, suit: 'CLUBS' }],
        },
      };
      const presentationDismissalKey = getSideshowPresentationKey(sampleSideshowResult);

      expect(getVisibleSideshowResult(sampleSideshowResult, null)).toEqual(
        sampleSideshowResult,
      );
      expect(
        getVisibleSideshowResult(sampleSideshowResult, presentationDismissalKey),
      ).toBeNull();
    });
  });

  describe('ขอบเขตแคนวาสโต๊ะเกมและขนาดหน้าต่าง (Canvas Boundaries)', () => {
    test('[getGameplayLayoutMode] 14.10 ตรวจสอบขนาดจอ Terminal สำหรับหน้าเกมรอบขอบเขต 150 × 41 → คืนค่า desktop เฉพาะเมื่อถึงเกณฑ์', () => {
      expect(getGameplayLayoutMode(149, 41)).toBe('unsupported');
      expect(getGameplayLayoutMode(150, 40)).toBe('unsupported');
      expect(getGameplayLayoutMode(150, 41)).toBe('desktop');
    });

    test('[GAMEPLAY_HEIGHT] 14.11 ตรวจสอบความสูงแคนวาสโต๊ะเกม → รวมความสูง Header, Canvas และ Control พอดี 41 แถว', () => {
      expect(3 + GAME_TABLE_CANVAS_HEIGHT + 1).toBe(GAMEPLAY_HEIGHT);
    });
  });
});
