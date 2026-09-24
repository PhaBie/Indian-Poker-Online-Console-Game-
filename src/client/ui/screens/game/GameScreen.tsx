import { Box, useInput } from 'ink';
import { useEffect, useState } from 'react';
import type { GameScreenProps, StatusStateContext, GameStatePayload } from './types';
import {
  getOrderedPlayersByPerspective,
  determineSeatPositions,
  resolveTableParticipants,
} from './gameLayoutHelpers';
import { useGameActionController } from './useGameActionController';
import { getGameEscapeAction } from './gameEscapeActions';
import { GameTableLayout } from './GameTableLayout';
import { GameActionsPanel, canChooseGameAction } from './GameActionsPanel';
import { getGameplayActions } from './gameActionHelpers';
import { GameExitConfirmDialog } from './GameExitConfirmDialog';
import { GameRoundResultDialog } from './GameRoundResultDialog';
import { GameSideshowResultDialog } from './GameSideshowResultDialog';
import { GameSideshowDeclinedDialog } from './GameSideshowDeclinedDialog';
import { GameBrandHeader } from './GameBrandHeader';
import { GAME_TABLE_CANVAS_HEIGHT } from './layoutConstants';
import { usePotPaymentAnimation } from './usePotPaymentAnimation';
import { useTableEntranceAnimation } from './useTableEntranceAnimation';
import { useDealSequenceTracker } from './useDealSequenceTracker';
import { resolveSeatPositionsForEntrance } from './useSeatSpinAnimation';
import {
  getSideshowPresentationKey,
  getVisibleSideshowResult,
} from './sideshowPresentation';
import { useTerminalSize } from '../../shared/hooks/useTerminalSize';
import { TerminalOutOfRangeScreen } from '../../shared/components/ScreenSizeGuard';
import { GameControlsFooter, getGameControlsFooterMode } from './GameControlsFooter';

export type { GameScreenProps } from './types';

// Keep the game at a desktop-sized canvas.  The same dimensions are also the
// hard lower bound checked before rendering, so Ink never squeezes the table
// into a smaller terminal.
export const GAMEPLAY_WIDTH = 150;
// Header (3) + table/action canvas (36) + controls footer (2). Keeping this
// at 41 lets a normal 1080p Windows Terminal show the same full table.
export const GAMEPLAY_HEIGHT = 41;
export function getGameplayLayoutMode(
  columns: number,
  rows: number,
): 'desktop' | 'unsupported' {
  if (columns < GAMEPLAY_WIDTH || rows < GAMEPLAY_HEIGHT) {
    return 'unsupported';
  }
  return 'desktop';
}
const SIDESHOW_CARDS_REVEAL_DELAY_MS = 2_000;
const SIDESHOW_RESULT_DELAY_MS = 4_000;
const SIDESHOW_DECLINED_DELAY_MS = 4_000;

export function getRoundResultPresentation(
  isRoundResultVisible: boolean,
  currentTurnPlayerId: string | null,
) {
  return {
    currentTurnPlayerId: isRoundResultVisible ? null : currentTurnPlayerId,
    shouldShowActions: !isRoundResultVisible,
  };
}

interface GameSidePanelProps {
  readonly isMyTurn: boolean;
  readonly inputMode: 'menu' | 'input_bet';
  readonly betAmount: string;
  readonly onActionSelect: (item: { label: string; value: string }) => void;
  readonly onBetChange: (amount: string) => void;
  readonly onBetSubmit: (amount: string) => void;
  readonly statusContext: StatusStateContext;
  readonly actionItems: readonly { label: string; value: string; hint?: string }[];
  readonly notice: string | null;
  readonly isInputDisabled: boolean;
  readonly shouldShowActions?: boolean;
  readonly isEntranceActive?: boolean;
  readonly entranceDescription?: string;
}

function GameSidePanel(props: GameSidePanelProps) {
  return <GameActionsPanel {...props} />;
}

function buildStatusContext(
  currentTurnPlayerId: string | null,
  myPlayerId: string | null,
  pendingSideshow: GameStatePayload['pendingSideshow'],
  players: GameStatePayload['players'],
): StatusStateContext {
  const me = players.find((player) => player.id === myPlayerId);
  const isWaitingForNextRound = me?.status === 'WAITING';
  return {
    isWaitingForNextRound,
    isMyTurn:
      !isWaitingForNextRound && currentTurnPlayerId === myPlayerId && !pendingSideshow,
    isPendingSideshowTarget:
      !isWaitingForNextRound && pendingSideshow?.targetId === myPlayerId,
    isPendingSideshowChallenger:
      !isWaitingForNextRound && pendingSideshow?.challengerId === myPlayerId,
    hasPendingSideshow: !isWaitingForNextRound && Boolean(pendingSideshow),
  };
}

function resolveGameActions(
  players: GameStatePayload['players'],
  myPlayerId: string | null,
  activeTurnPlayerId: string | null,
  currentStake: number,
  pendingSideshow: GameStatePayload['pendingSideshow'],
  effectiveRoundResult: unknown,
) {
  const me = players.find((player) => player.id === myPlayerId);
  if (me?.status === 'WAITING') {
    return [];
  }
  return getGameplayActions({
    players,
    myPlayerId,
    currentTurnPlayerId: activeTurnPlayerId,
    currentStake,
    pendingSideshow: effectiveRoundResult ? null : (pendingSideshow ?? null),
  });
}

export function GameScreen({
  gameState,
  myPlayerId,
  socketClient,
  serverError,
  roundResult,
  roundStartChips,
  onNextGame,
  onEndGame,
  onLeave,
}: GameScreenProps) {
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [dismissedSideshowResultKey, setDismissedSideshowResultKey] = useState<
    string | null
  >(null);
  const [isSideshowResultVisible, setIsSideshowResultVisible] = useState(false);
  const [dismissedSideshowNoticeKey, setDismissedSideshowNoticeKey] = useState<
    string | null
  >(null);
  const { columns, rows } = useTerminalSize();
  const {
    players,
    pot,
    currentStake,
    currentTurnPlayerId,
    myCards,
    roomId,
    hostId,
    pendingSideshow,
    sideshowResult,
    sideshowNotice,
    showdownCards,
    roundStartedAt,
  } = gameState;
  const sideshowResultKey = sideshowResult
    ? getSideshowPresentationKey(sideshowResult)
    : null;
  const visibleSideshowResult = getVisibleSideshowResult(
    sideshowResult,
    dismissedSideshowResultKey,
  );
  const sideshowNoticeKey = sideshowNotice
    ? `${sideshowNotice.challengerId}|${sideshowNotice.targetId}|${sideshowNotice.outcome}`
    : null;
  const visibleSideshowNotice =
    sideshowNotice && sideshowNoticeKey !== dismissedSideshowNoticeKey
      ? sideshowNotice
      : null;
  const isSideshowNoticeVisible = Boolean(visibleSideshowNotice);

  useEffect(() => {
    if (!visibleSideshowResult || !sideshowResultKey) {
      setIsSideshowResultVisible(false);
      return;
    }

    const timer = setTimeout(
      () => setIsSideshowResultVisible(true),
      SIDESHOW_CARDS_REVEAL_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [sideshowResultKey, visibleSideshowResult]);

  useEffect(() => {
    if (!visibleSideshowResult || !sideshowResultKey) return;

    const timer = setTimeout(() => {
      setIsSideshowResultVisible(false);
      setDismissedSideshowResultKey(sideshowResultKey);
    }, SIDESHOW_CARDS_REVEAL_DELAY_MS + SIDESHOW_RESULT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [sideshowResultKey, visibleSideshowResult]);

  useEffect(() => {
    if (!visibleSideshowNotice || !sideshowNoticeKey) return;

    const timer = setTimeout(
      () => setDismissedSideshowNoticeKey(sideshowNoticeKey),
      SIDESHOW_DECLINED_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [sideshowNoticeKey, visibleSideshowNotice]);
  const effectiveRoundResult = roundResult ?? gameState.roundResult ?? null;
  const isRoundEnded = Boolean(effectiveRoundResult);
  const activeTablePlayers = resolveTableParticipants(players);
  const { dealSequence, isSubsequentRound, isPlayerCountChanged } =
    useDealSequenceTracker(isRoundEnded, activeTablePlayers.length);
  const roundResultPresentation = getRoundResultPresentation(
    isRoundEnded,
    currentTurnPlayerId,
  );
  const { isAmountVisible, effectiveTurnPlayerId, isPotBlinking, displayedPotAmount } =
    usePotPaymentAnimation(pot, roundResultPresentation.currentTurnPlayerId);
  const entranceAnimation = useTableEntranceAnimation(
    pot,
    activeTablePlayers.length,
    isSubsequentRound,
    dealSequence,
    isPlayerCountChanged,
    true,
    roundStartedAt,
  );
  const activeTurnPlayerId = entranceAnimation.isEntranceActive
    ? null
    : effectiveTurnPlayerId;
  const actionCtrl = useGameActionController(socketClient);
  const orderedPlayers = getOrderedPlayersByPerspective(activeTablePlayers, myPlayerId);
  const rawSeatPositions = determineSeatPositions(orderedPlayers);
  const seatPositions = resolveSeatPositionsForEntrance(
    rawSeatPositions,
    entranceAnimation.elapsedMs,
    entranceAnimation.isEntranceActive,
    entranceAnimation.milestones.seatSpinStartMs,
    entranceAnimation.milestones.seatSpinEndMs,
  );
  const effectivePot = entranceAnimation.isEntranceActive
    ? entranceAnimation.displayedPot
    : displayedPotAmount;
  const isEffectivePotAmountVisible = entranceAnimation.isEntranceActive
    ? entranceAnimation.isPotAmountVisible
    : isAmountVisible;
  const statusContext = buildStatusContext(
    activeTurnPlayerId,
    myPlayerId,
    effectiveRoundResult ? null : pendingSideshow,
    players,
  );
  const actionItems = resolveGameActions(
    players,
    myPlayerId,
    activeTurnPlayerId,
    currentStake,
    pendingSideshow,
    effectiveRoundResult,
  );
  const notice = actionCtrl.localError ?? serverError;
  const hostName = players.find((player) => player.id === hostId)?.name;
  const layoutMode = getGameplayLayoutMode(columns, rows);
  const canChooseAction = canChooseGameAction({
    isEntranceActive: entranceAnimation.isEntranceActive,
    shouldShowActions: roundResultPresentation.shouldShowActions,
    isMyTurn: statusContext.isMyTurn,
    isPendingSideshowTarget: statusContext.isPendingSideshowTarget,
  });
  const isActionInputDisabled =
    !roundResultPresentation.shouldShowActions ||
    isExitDialogOpen ||
    Boolean(showdownCards) ||
    isSideshowResultVisible ||
    isSideshowNoticeVisible ||
    isPotBlinking ||
    entranceAnimation.isEntranceActive;
  const controlsFooterMode = getGameControlsFooterMode(
    canChooseAction,
    isActionInputDisabled,
    actionCtrl.inputMode,
  );

  useInput((_, key) => {
    const escapeAction = getGameEscapeAction(
      key.escape,
      actionCtrl.inputMode,
      isExitDialogOpen,
    );
    if (escapeAction === 'cancel_bet') {
      actionCtrl.cancelBetInput();
    }
    if (escapeAction === 'open_exit') {
      setIsExitDialogOpen(true);
    }
  });

  if (layoutMode === 'unsupported') {
    return (
      <TerminalOutOfRangeScreen
        currentColumns={columns}
        currentRows={rows}
        status="TOO_SMALL"
        minimumColumns={GAMEPLAY_WIDTH}
        minimumRows={GAMEPLAY_HEIGHT}
      />
    );
  }

  return (
    <Box width="100%" height={rows} alignItems="center" justifyContent="center">
      <Box
        flexDirection="column"
        width={GAMEPLAY_WIDTH}
        height={GAMEPLAY_HEIGHT}
        alignItems="center"
      >
        <GameBrandHeader hostName={hostName} roomId={roomId} width={GAMEPLAY_WIDTH} />
        <Box
          flexDirection="row"
          width={GAMEPLAY_WIDTH}
          height={GAME_TABLE_CANVAS_HEIGHT}
          position="relative"
        >
          <GameTableLayout
            pot={effectivePot}
            currentStake={currentStake}
            seatPositions={seatPositions}
            currentTurnPlayerId={activeTurnPlayerId}
            myPlayerId={myPlayerId}
            pendingSideshowTargetId={
              effectiveRoundResult ? undefined : pendingSideshow?.targetId
            }
            myCards={myCards}
            sideshowResult={effectiveRoundResult ? null : visibleSideshowResult}
            sideshowNotice={effectiveRoundResult ? null : visibleSideshowNotice}
            showdownCards={effectiveRoundResult ? null : showdownCards}
            isPotAmountVisible={isEffectivePotAmountVisible}
            entranceVisibleCardCount={entranceAnimation.visibleCardCount}
            isEntranceDeckPhase={entranceAnimation.isDeckPhase}
            entranceElapsedMs={entranceAnimation.elapsedMs}
            justDealtCardIndex={entranceAnimation.justDealtCardIndex}
            isEntranceActive={entranceAnimation.isEntranceActive}
            cardGlowStartMs={entranceAnimation.milestones.cardGlowStartMs}
            cardGlowEndMs={entranceAnimation.milestones.cardGlowEndMs}
            isNameGlowPhase={entranceAnimation.isNameGlowPhase}
            nameGlowElapsedMs={Math.max(
              0,
              entranceAnimation.elapsedMs - entranceAnimation.milestones.nameGlowStartMs,
            )}
            playerCount={activeTablePlayers.length}
          />
          <GameSidePanel
            isMyTurn={statusContext.isMyTurn}
            inputMode={actionCtrl.inputMode}
            betAmount={actionCtrl.betAmount}
            onActionSelect={actionCtrl.handleActionSelect}
            onBetChange={actionCtrl.setBetAmount}
            onBetSubmit={actionCtrl.handleBetSubmit}
            statusContext={statusContext}
            actionItems={actionItems}
            notice={notice ?? null}
            shouldShowActions={roundResultPresentation.shouldShowActions}
            isEntranceActive={entranceAnimation.isEntranceActive}
            entranceDescription={entranceAnimation.phaseDescription}
            isInputDisabled={isActionInputDisabled}
          />
          {isExitDialogOpen && (
            <GameExitConfirmDialog
              onConfirm={onLeave}
              onCancel={() => setIsExitDialogOpen(false)}
            />
          )}
          {effectiveRoundResult && (
            <GameRoundResultDialog
              result={effectiveRoundResult}
              gameState={gameState}
              roundStartChips={roundStartChips ?? {}}
              myPlayerId={myPlayerId}
              onNextGame={onNextGame ?? (() => {})}
              onEndGame={onEndGame ?? (() => {})}
            />
          )}
          {visibleSideshowResult && isSideshowResultVisible && !effectiveRoundResult && (
            <GameSideshowResultDialog result={visibleSideshowResult} players={players} />
          )}
          {visibleSideshowNotice && isSideshowNoticeVisible && (
            <GameSideshowDeclinedDialog
              notice={visibleSideshowNotice}
              players={players}
            />
          )}
        </Box>
        <GameControlsFooter mode={controlsFooterMode} />
      </Box>
    </Box>
  );
}
