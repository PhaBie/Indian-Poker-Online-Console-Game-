import { describe, expect, jest, test } from 'bun:test';
import {
  determineSeatPositions,
  getCardSuitColor,
  getOrderedPlayersByPerspective,
  getPlayerBadgeInfo,
  getStatusDisplayInfo,
  resolveTableParticipants,
  shouldHidePlayerCards,
} from '../../../src/client/ui/screens/game/gameLayoutHelpers';
import {
  GAME_PREVIEW_PLAYER_ID,
  GamePreviewSession,
} from '../../../src/client/ui/screens/game/gamePreviewFixture';
import {
  HIDDEN_SIDESHOW_PAUSE_MS,
  scheduleSideshowResume,
} from '../../../src/client/ui/screens/game/GamePreview';
import {
  GAMEPLAY_HEIGHT,
  getGameplayLayoutMode,
} from '../../../src/client/ui/screens/game/GameScreen';
import { getGameControlsFooterMode } from '../../../src/client/ui/screens/game/GameControlsFooter';
import {
  GAME_CONTROLS_FOOTER_HEIGHT,
  GAME_HEADER_HEIGHT,
  GAME_TABLE_CANVAS_HEIGHT,
} from '../../../src/client/ui/screens/game/layoutConstants';
import {
  ROUND_RESULT_DIALOG_HEIGHT,
  ROUND_RESULT_DIALOG_TOP,
  getRoundParticipants,
  getRoundResultPresentation,
  getWinningHandLabel,
  sortPlayersForResult,
} from '../../../src/client/ui/screens/game/GameRoundResultDialog';
import {
  getSideshowPresentationKey,
  getVisibleSideshowResult,
} from '../../../src/client/ui/screens/game/sideshowPresentation';
import {
  CARD_BORDER_GLOW_ACTIVE_FRAMES,
  DEFAULT_CARD_BORDER_COLORS,
} from '../../../src/client/ui/screens/game/useCardBorderGlow';
import { UI_COLORS } from '../../../src/client/ui/shared/theme/colors';
import type { GameStatePayload } from '../../../src/client/ui/screens/game/types';
import type {
  GameResultPayload,
  HandRank,
  RoundWinReason,
} from '../../../src/shared/types';

function createRoundResultForPresentation(
  winReason: RoundWinReason,
  winningHand: HandRank = 'HIGH_CARD',
): GameResultPayload {
  const sharedResult = {
    winnerIds: ['winner_player'],
    payouts: { winner_player: 100 },
    exposedCards: {},
  };
  return winReason === 'LAST_PLAYER_STANDING'
    ? { ...sharedResult, winReason, winningHand: null }
    : { ...sharedResult, winReason, winningHand };
}

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
    test('[getWinningHandLabel] 14.6 ผู้เล่นคนอื่นหมอบหมดจนเหลือกองกลางไม่ถูกแข่ง → แสดงผลเป็น LAST PLAYER STANDING', () => {
      const winningLabel = getWinningHandLabel({
        winReason: 'LAST_PLAYER_STANDING',
        winningHand: null,
        winnerIds: ['winner_player'],
        payouts: { winner_player: 100 },
        exposedCards: {},
      });
      expect(winningLabel).toBe('LAST PLAYER STANDING');
    });

    test('[getWinningHandLabel] 14.6.1 ชนะด้วย SHOW และได้ TRAIL → แสดงผลเป็น WON BY SHOW · TRAIL — THREE OF A KIND', () => {
      const winningLabel = getWinningHandLabel({
        winReason: 'SHOW',
        winningHand: 'TRAIL',
        winnerIds: ['winner_player'],
        payouts: { winner_player: 300 },
        exposedCards: {
          winner_player: [
            { rank: 14, suit: 'SPADES' },
            { rank: 14, suit: 'HEARTS' },
            { rank: 14, suit: 'DIAMONDS' },
          ],
        },
      });
      expect(winningLabel).toBe('WON BY SHOW · TRAIL — THREE OF A KIND');
    });

    test('[getWinningHandLabel] 14.6.2 ชนะด้วย SHOW แบบไพ่เสมอ → แสดงผลพร้อมข้อความระบุ TIE RULE', () => {
      const winningLabel = getWinningHandLabel({
        winReason: 'SHOW_TIE',
        winningHand: 'PAIR',
        winnerIds: ['winner_player'],
        payouts: { winner_player: 200 },
        exposedCards: {
          winner_player: [
            { rank: 13, suit: 'SPADES' },
            { rank: 13, suit: 'HEARTS' },
            { rank: 2, suit: 'DIAMONDS' },
          ],
        },
      });
      expect(winningLabel).toBe(
        'WON BY SHOW · PAIR — TWO OF A KIND (TIE RULE — NON-REQUESTER WINS)',
      );
    });

    test('[getWinningHandLabel] 14.6.3 บังคับตัดสินผู้เล่นหลายคน → แสดงผลเป็น FORCED SHOWDOWN', () => {
      const winningLabel = getWinningHandLabel({
        winReason: 'FORCED_SHOWDOWN',
        winningHand: 'SEQUENCE',
        winnerIds: ['winner_player'],
        payouts: { winner_player: 500 },
        exposedCards: {
          winner_player: [
            { rank: 10, suit: 'SPADES' },
            { rank: 9, suit: 'HEARTS' },
            { rank: 8, suit: 'DIAMONDS' },
          ],
        },
      });
      expect(winningLabel).toBe('FORCED SHOWDOWN · SEQUENCE — THREE-CARD RUN');
    });

    test.each([
      {
        caseId: '14.6.4.1',
        result: createRoundResultForPresentation('SHOW'),
        expectedReasonLabel: 'WON BY SHOW',
        expectedReasonColor: UI_COLORS.roundResultShow,
        expectedDetailLabel: null,
      },
      {
        caseId: '14.6.4.2',
        result: createRoundResultForPresentation('SHOW_TIE'),
        expectedReasonLabel: 'WON BY SHOW',
        expectedReasonColor: UI_COLORS.roundResultShowTie,
        expectedDetailLabel: 'TIE RULE — NON-REQUESTER WINS',
      },
      {
        caseId: '14.6.4.3',
        result: createRoundResultForPresentation('FORCED_SHOWDOWN'),
        expectedReasonLabel: 'FORCED SHOWDOWN',
        expectedReasonColor: UI_COLORS.roundResultForcedShowdown,
        expectedDetailLabel: null,
      },
      {
        caseId: '14.6.4.4',
        result: createRoundResultForPresentation('LAST_PLAYER_STANDING'),
        expectedReasonLabel: 'LAST PLAYER STANDING',
        expectedReasonColor: UI_COLORS.roundResultLastPlayerStanding,
        expectedDetailLabel: null,
      },
    ])(
      '[getRoundResultPresentation] $caseId เหตุผลการชนะ $expectedReasonLabel → ใช้ข้อความและสีเฉพาะสถานะอย่างถูกต้อง',
      ({ result, expectedReasonLabel, expectedReasonColor, expectedDetailLabel }) => {
        const presentation = getRoundResultPresentation(result);
        expect(presentation.reasonLabel).toBe(expectedReasonLabel);
        expect(presentation.reasonColor).toBe(expectedReasonColor);
        expect(presentation.detailLabel).toBe(expectedDetailLabel);
      },
    );

    test.each([
      {
        caseId: '14.6.5.1',
        handRank: 'TRAIL' as const,
        expectedLabel: 'TRAIL — THREE OF A KIND',
        expectedColor: UI_COLORS.handRankTrail,
      },
      {
        caseId: '14.6.5.2',
        handRank: 'PURE_SEQUENCE' as const,
        expectedLabel: 'PURE SEQUENCE — SAME-SUIT RUN',
        expectedColor: UI_COLORS.handRankPureSequence,
      },
      {
        caseId: '14.6.5.3',
        handRank: 'SEQUENCE' as const,
        expectedLabel: 'SEQUENCE — THREE-CARD RUN',
        expectedColor: UI_COLORS.handRankSequence,
      },
      {
        caseId: '14.6.5.4',
        handRank: 'COLOR' as const,
        expectedLabel: 'COLOR — SAME SUIT',
        expectedColor: UI_COLORS.handRankColor,
      },
      {
        caseId: '14.6.5.5',
        handRank: 'PAIR' as const,
        expectedLabel: 'PAIR — TWO OF A KIND',
        expectedColor: UI_COLORS.handRankPair,
      },
      {
        caseId: '14.6.5.6',
        handRank: 'HIGH_CARD' as const,
        expectedLabel: 'HIGH CARD',
        expectedColor: UI_COLORS.handRankHighCard,
      },
    ])(
      '[getRoundResultPresentation] $caseId มือไพ่ $handRank → ใช้สีเฉพาะประเภทมือไพ่จาก Theme กลาง',
      ({ handRank, expectedLabel, expectedColor }) => {
        const presentation = getRoundResultPresentation(
          createRoundResultForPresentation('SHOW', handRank),
        );
        expect(presentation.handLabel).toBe(expectedLabel);
        expect(presentation.handColor).toBe(expectedColor);
      },
    );

    test('[getRoundResultPresentation] 14.6.6 ชุดสีสถานะและประเภทมือไพ่ → แต่ละรายการมีสีเฉพาะตัวและไม่ใช้สีซ้ำภายในกลุ่ม', () => {
      const reasonColors = [
        UI_COLORS.roundResultShow,
        UI_COLORS.roundResultShowTie,
        UI_COLORS.roundResultForcedShowdown,
        UI_COLORS.roundResultLastPlayerStanding,
      ];
      const handRankColors = [
        UI_COLORS.handRankTrail,
        UI_COLORS.handRankPureSequence,
        UI_COLORS.handRankSequence,
        UI_COLORS.handRankColor,
        UI_COLORS.handRankPair,
        UI_COLORS.handRankHighCard,
      ];

      expect(new Set(reasonColors).size).toBe(reasonColors.length);
      expect(new Set(handRankColors).size).toBe(handRankColors.length);
    });

    test('[sortPlayersForResult] 14.7 จัดอันดับผู้เล่นในหน้าต่างสรุปผลรอบ → ผู้ชนะอยู่อันดับแรก ตามด้วยยอดชิปคงเหลือ', () => {
      const summaryPlayerList = [
        { id: 'player_third', name: 'Third', chips: 850, bet: 50 },
        { id: 'player_winner', name: 'Winner', chips: 1_150, bet: 50 },
        { id: 'player_second', name: 'Second', chips: 1_000, bet: 100 },
      ];
      const roundResultPayload = {
        winReason: 'LAST_PLAYER_STANDING' as const,
        winnerIds: ['player_winner'],
        winningHand: null,
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

    test('[GAMEPLAY_HEIGHT] 14.11 ตรวจสอบความสูงแคนวาสโต๊ะเกม → รวมความสูง Header 3 แถว, Canvas 36 แถว และ Footer 2 แถว พอดี 41 แถว', () => {
      expect(
        GAME_HEADER_HEIGHT + GAME_TABLE_CANVAS_HEIGHT + GAME_CONTROLS_FOOTER_HEIGHT,
      ).toBe(GAMEPLAY_HEIGHT);
      expect(GAME_HEADER_HEIGHT).toBe(3);
      expect(GAME_TABLE_CANVAS_HEIGHT).toBe(36);
      expect(GAME_CONTROLS_FOOTER_HEIGHT).toBe(2);
    });

    test('[getGameControlsFooterMode] 14.11.1 แสดงคำสั่งด้านล่างเฉพาะช่วงที่ผู้เล่นควบคุม Action ได้ → คืนโหมด Action, Bet หรือซ่อนอย่างถูกต้อง', () => {
      expect(getGameControlsFooterMode(true, false, 'menu')).toBe('action_menu');
      expect(getGameControlsFooterMode(true, false, 'input_bet')).toBe('bet_input');
      expect(getGameControlsFooterMode(false, false, 'menu')).toBe('hidden');
      expect(getGameControlsFooterMode(true, true, 'menu')).toBe('hidden');
    });

    test('[ROUND_RESULT_DIALOG] 14.11.2 กล่องสรุปผลรอบจัดวางในแนวตั้งให้อยู่กึ่งกลางแคนวาสและไม่ล้นขอบเขตโต๊ะเกม 36 แถว', () => {
      expect(ROUND_RESULT_DIALOG_TOP + ROUND_RESULT_DIALOG_HEIGHT).toBeLessThanOrEqual(
        GAME_TABLE_CANVAS_HEIGHT,
      );
      expect(ROUND_RESULT_DIALOG_TOP).toBeGreaterThanOrEqual(1);
    });
  });

  describe('ชุดสีไพ่และแอนิเมชันขอบไพ่ (Card Visual Palette & Border Glow)', () => {
    test('[getCardSuitColor] 14.12 กำหนดสีไพ่ตามดอก → HEARTS และ DIAMONDS คืนค่า UI_COLORS.cardRedSuit', () => {
      expect(getCardSuitColor('HEARTS')).toBe(UI_COLORS.cardRedSuit);
      expect(getCardSuitColor('DIAMONDS')).toBe(UI_COLORS.cardRedSuit);
    });

    test('[getCardSuitColor] 14.13 กำหนดสีไพ่ตามดอก → SPADES และ CLUBS คืนค่า UI_COLORS.cardDarkSuitForeground', () => {
      expect(getCardSuitColor('SPADES')).toBe(UI_COLORS.cardDarkSuitForeground);
      expect(getCardSuitColor('CLUBS')).toBe(UI_COLORS.cardDarkSuitForeground);
    });

    test('[DEFAULT_CARD_BORDER_COLORS] 14.14 สีเริ่มต้นของขอบไพ่ทั้ง 3 ใบ → ใช้ UI_COLORS.cardBack', () => {
      expect(DEFAULT_CARD_BORDER_COLORS).toEqual([
        UI_COLORS.cardBack,
        UI_COLORS.cardBack,
        UI_COLORS.cardBack,
      ]);
    });

    test('[CARD_BORDER_GLOW_ACTIVE_FRAMES] 14.15 สีในแต่ละเฟรมของแอนิเมชันขอบไพ่เรืองแสง → ทุกสีต้องอยู่ในชุดสีการ์ดที่กำหนดและไม่มีสี magenta', () => {
      const allowedGlowColors = new Set<string>([
        UI_COLORS.cardBackDim,
        UI_COLORS.cardBack,
        UI_COLORS.cardBackBright,
        UI_COLORS.cardGlowHighlight,
      ]);
      for (const frame of CARD_BORDER_GLOW_ACTIVE_FRAMES) {
        for (const color of frame) {
          expect(allowedGlowColors.has(color)).toBe(true);
          expect(color.toLowerCase().includes('magenta')).toBe(false);
        }
      }
    });

    test('[CARD_BORDER_GLOW_ACTIVE_FRAMES] 14.15.1 แสงวิ่งเริ่มด้วยหัวแสงสีขาวอมฟ้าและเคลื่อนผ่านไพ่ตามลำดับ → แต่ละช่องได้รับสี Highlight จากซ้ายไปขวา', () => {
      expect(CARD_BORDER_GLOW_ACTIVE_FRAMES[0]).toEqual([
        UI_COLORS.cardGlowHighlight,
        UI_COLORS.cardBack,
        UI_COLORS.cardBack,
      ]);

      const firstHighlightFrameByCard = [0, 1, 2].map((cardIndex) =>
        CARD_BORDER_GLOW_ACTIVE_FRAMES.findIndex(
          (frame) => frame[cardIndex] === UI_COLORS.cardGlowHighlight,
        ),
      );
      expect(firstHighlightFrameByCard).toEqual([0, 2, 4]);
    });
  });

  function withDeterministicSeed<T>(executeAction: () => T, seedValue = 42): T {
    const originalMathRandom = Math.random;
    const seedBuffer = new Uint32Array([seedValue]);
    Math.random = () => {
      seedBuffer[0] = (seedBuffer[0] * 1664525 + 1013904223) >>> 0;
      return seedBuffer[0] / 4294967296;
    };
    try {
      return executeAction();
    } finally {
      Math.random = originalMathRandom;
    }
  }

  function handlePreviewPlayerTurn(
    session: GamePreviewSession,
    currentState: ReturnType<GamePreviewSession['getState']>,
  ): void {
    const action = currentState.players[0].isBlind ? 'SEEN' : 'CALL';
    session.handleEvent({
      type: 'PLAYER_ACTION',
      payload: { action },
    });
  }

  function advanceDeterministicTurn(
    session: GamePreviewSession,
    currentState: ReturnType<GamePreviewSession['getState']>,
  ): void {
    if (currentState.pendingSideshow?.targetId === GAME_PREVIEW_PLAYER_ID) {
      session.handleEvent({
        type: 'PLAYER_ACTION',
        payload: { action: 'ACCEPT_SIDESHOW' },
      });
      return;
    }

    if (currentState.currentTurnPlayerId === GAME_PREVIEW_PLAYER_ID) {
      handlePreviewPlayerTurn(session, currentState);
      return;
    }

    const didBotPlay = session.playNextBot();
    if (!didBotPlay && session.getState().showdownCards) {
      session.resolveShowdown();
    }
  }

  function runDeterministicGameToCompletion(playerCount: 2 | 3 | 4, seedValue = 42) {
    return withDeterministicSeed(() => {
      const session = new GamePreviewSession(playerCount);
      const startChips = session.getRoundStartChips();
      const totalStartChips = Object.values(startChips).reduce(
        (runningTotal, playerChips) => runningTotal + playerChips,
        0,
      );
      let sideshowOccurredCount = 0;

      for (let moveIndex = 0; moveIndex < 200; moveIndex++) {
        if (session.getRoundResult()) {
          break;
        }
        if (session.hasActiveSideshow()) {
          sideshowOccurredCount++;
          session.clearSideshowPresentation();
        }
        const currentState = session.getState();
        if (currentState.showdownCards) {
          session.resolveShowdown();
          break;
        }
        advanceDeterministicTurn(session, currentState);
      }
      return { session, startChips, totalStartChips, sideshowOccurredCount };
    }, seedValue);
  }

  function assertDeterministicGameSettlement(
    outcome: ReturnType<typeof runDeterministicGameToCompletion>,
  ): void {
    const endState = outcome.session.getState();
    const roundResult = outcome.session.getRoundResult();
    if (!roundResult) {
      throw new Error('Expected preview round to complete');
    }

    expect(endState.pot).toBe(0);
    const totalEndChips = endState.players.reduce(
      (runningTotal, player) => runningTotal + player.chips,
      0,
    );
    expect(totalEndChips).toBe(outcome.totalStartChips);

    for (const winnerId of roundResult.winnerIds) {
      const winner = endState.players.find((player) => player.id === winnerId);
      if (!winner) {
        throw new Error(`Winner ${winnerId} not found in players`);
      }
      const expectedChips =
        outcome.startChips[winnerId] - winner.bet + roundResult.payouts[winnerId];
      expect(winner.chips).toBe(expectedChips);
    }
  }

  describe('ความเป็นส่วนตัวของไพ่และการแสดงผลหลังหมอบ (Card Privacy & Fold Visibility)', () => {
    test('[GamePreviewSession] 14.16 ผู้เล่นตนเองสถานะ BLIND ทำการหมอบ (FOLD) จริง → status เป็น FOLDED, isBlind เป็น true, myCards ว่าง และไพ่ต้องถูกซ่อน', () => {
      const previewSession = new GamePreviewSession(2);
      expect(previewSession.getState().players[0].isBlind).toBe(true);

      previewSession.handleEvent({
        type: 'PLAYER_ACTION',
        payload: { action: 'FOLD' },
      });

      const foldedState = previewSession.getState();
      expect(foldedState.players[0].status).toBe('FOLDED');
      expect(foldedState.players[0].isBlind).toBe(true);
      expect(foldedState.myCards).toEqual([]);
      expect(
        shouldHidePlayerCards({
          isMe: true,
          isBlind: foldedState.players[0].isBlind,
          hasRevealedCards: false,
        }),
      ).toBe(true);
    });

    test('[GamePreviewSession] 14.17 ผู้เล่นตนเองสถานะ SEEN ทำการหมอบ (FOLD) จริง → status เป็น FOLDED, isBlind เป็น false, myCards มีไพ่ 3 ใบ และไพ่ต้องไม่ถูกซ่อน', () => {
      const previewSession = new GamePreviewSession(2);
      previewSession.handleEvent({
        type: 'PLAYER_ACTION',
        payload: { action: 'SEEN' },
      });

      const seenState = previewSession.getState();
      expect(seenState.players[0].isBlind).toBe(false);
      expect(seenState.myCards.length).toBe(3);

      previewSession.handleEvent({
        type: 'PLAYER_ACTION',
        payload: { action: 'FOLD' },
      });

      const foldedState = previewSession.getState();
      expect(foldedState.players[0].status).toBe('FOLDED');
      expect(foldedState.players[0].isBlind).toBe(false);
      expect(foldedState.myCards.length).toBe(3);
      expect(
        shouldHidePlayerCards({
          isMe: true,
          isBlind: foldedState.players[0].isBlind,
          hasRevealedCards: false,
        }),
      ).toBe(false);
    });

    test('[shouldHidePlayerCards] 14.18 ไพ่ของผู้เล่นฝ่ายตรงข้าม (isMe เป็น false) → ไพ่ต้องถูกซ่อนเสมอไม่ว่าคู่แข่งจะ Blind หรือ Seen', () => {
      const isBlindOpponentCardHidden = shouldHidePlayerCards({
        isMe: false,
        isBlind: true,
        hasRevealedCards: false,
      });
      const isSeenOpponentCardHidden = shouldHidePlayerCards({
        isMe: false,
        isBlind: false,
        hasRevealedCards: false,
      });
      expect(isBlindOpponentCardHidden).toBe(true);
      expect(isSeenOpponentCardHidden).toBe(true);
    });

    test('[shouldHidePlayerCards] 14.19 การเปิดไพ่จาก SHOW หรือ DUEL (hasRevealedCards เป็น true) → ไพ่ต้องไม่ถูกซ่อนเพื่อเปิดเผยข้อมูลตามสิทธิ์', () => {
      const isShowdownCardHiddenForMe = shouldHidePlayerCards({
        isMe: true,
        isBlind: true,
        hasRevealedCards: true,
      });
      const isShowdownCardHiddenForOpponent = shouldHidePlayerCards({
        isMe: false,
        isBlind: true,
        hasRevealedCards: true,
      });
      expect(isShowdownCardHiddenForMe).toBe(false);
      expect(isShowdownCardHiddenForOpponent).toBe(false);
    });

    test.each([
      { playerCount: 2 as const, seedValue: 42, expectSideshow: false },
      { playerCount: 3 as const, seedValue: 100, expectSideshow: true },
      { playerCount: 4 as const, seedValue: 200, expectSideshow: true },
    ])(
      '[GamePreviewSession] 14.20 จำลองเกมโหมด $playerCount คนแบบ Deterministic → ดำเนินเกมจนจบ Pot เป็นศูนย์, ชิปถูกอนุรักษ์ และ Winner ได้รับ Payout ถูกต้อง',
      ({ playerCount, seedValue, expectSideshow }) => {
        const outcome = runDeterministicGameToCompletion(playerCount, seedValue);
        if (expectSideshow) {
          expect(outcome.sideshowOccurredCount).toBeGreaterThan(0);
        }
        assertDeterministicGameSettlement(outcome);
      },
    );

    test('[GamePreviewSession] 14.21 ตรวจสอบ Bot–Bot DUEL ซ่อนไพ่จากผู้เล่น (sideshowResult เป็น null) แต่ session รับรู้ และเกมดำเนินต่อได้หลังล้าง presentation', () => {
      withDeterministicSeed(() => {
        const session = new GamePreviewSession(3);
        let didFindBotBotSideshow = false;

        for (let moveIndex = 0; moveIndex < 50; moveIndex++) {
          if (session.getRoundResult()) {
            break;
          }
          if (session.hasActiveSideshow()) {
            const state = session.getState();
            if (state.sideshowResult === null && state.sideshowNotice === null) {
              didFindBotBotSideshow = true;
              expect(session.hasActiveSideshow()).toBe(true);
              expect(state.sideshowResult).toBeNull();
              session.clearSideshowPresentation();
              expect(session.hasActiveSideshow()).toBe(false);
              expect(session.getState().sideshowResult).toBeNull();
              expect(() => {
                advanceDeterministicTurn(session, session.getState());
              }).not.toThrow();
              break;
            }
            session.clearSideshowPresentation();
          }
          advanceDeterministicTurn(session, session.getState());
        }

        expect(didFindBotBotSideshow).toBe(true);
      }, 2);
    });

    test('[GamePreviewSession] 14.22 ตรวจสอบการล้าง Declined Notice ใน clearSideshowPresentation → sideshowNotice และ lastSideshow ถูกล้างเป็น null', () => {
      withDeterministicSeed(() => {
        const session = new GamePreviewSession(3);
        let didFindDeclinedNotice = false;

        for (let moveIndex = 0; moveIndex < 50; moveIndex++) {
          if (session.getRoundResult()) {
            break;
          }
          if (session.hasActiveSideshow()) {
            const state = session.getState();
            if (state.sideshowNotice) {
              didFindDeclinedNotice = true;
              expect(session.hasActiveSideshow()).toBe(true);
              expect(state.sideshowNotice.outcome).toBe('DECLINED');
              session.clearSideshowPresentation();
              expect(session.hasActiveSideshow()).toBe(false);
              expect(session.getState().sideshowNotice).toBeNull();
              break;
            }
            session.clearSideshowPresentation();
          }
          advanceDeterministicTurn(session, session.getState());
        }

        expect(didFindDeclinedNotice).toBe(true);
      }, 1);
    });

    test('[GamePreviewSession] 14.23 ตรวจสอบ scheduleSideshowResume ว่า Action ถัดไปเกิดทันทีหลัง Presentation delay สิ้นสุดเพียงครั้งเดียวโดยไม่รอสองรอบ', () => {
      jest.useFakeTimers();
      try {
        withDeterministicSeed(() => {
          const session = new GamePreviewSession(3);
          for (let moveIndex = 0; moveIndex < 50; moveIndex++) {
            if (session.hasActiveSideshow()) {
              break;
            }
            advanceDeterministicTurn(session, session.getState());
          }

          expect(session.hasActiveSideshow()).toBe(true);
          const stateBeforeClear = session.getState();
          const turnBeforeClear = stateBeforeClear.currentTurnPlayerId;

          let didCallbackFire = false;
          let resolvedState: ReturnType<GamePreviewSession['getState']> | null = null;
          const cancelResume = scheduleSideshowResume(
            session,
            stateBeforeClear,
            (nextState) => {
              didCallbackFire = true;
              resolvedState = nextState;
            },
          );

          jest.advanceTimersByTime(HIDDEN_SIDESHOW_PAUSE_MS - 1);
          expect(didCallbackFire).toBe(false);
          expect(session.hasActiveSideshow()).toBe(true);

          jest.advanceTimersByTime(1);
          expect(didCallbackFire).toBe(true);
          expect(session.hasActiveSideshow()).toBe(false);
          const finalResolvedState = resolvedState as GameStatePayload | null;
          if (!finalResolvedState) {
            throw new Error('Expected resolvedState to be present');
          }
          expect(finalResolvedState.currentTurnPlayerId).toBe(GAME_PREVIEW_PLAYER_ID);
          expect(() => {
            session.handleEvent({
              type: 'PLAYER_ACTION',
              payload: { action: 'CALL' },
            });
          }).not.toThrow();
          expect(session.getState().currentTurnPlayerId).not.toBe(turnBeforeClear);

          cancelResume();
        }, 2);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
