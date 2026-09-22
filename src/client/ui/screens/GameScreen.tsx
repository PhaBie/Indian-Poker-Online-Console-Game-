import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';
import type { GameScreenProps, StatusStateContext, GameStatePayload } from './game/types';
import {
  getOrderedPlayersByPerspective,
  determineSeatPositions,
} from './game/gameLayoutHelpers';
import { useGameActionController } from './game/useGameActionController';
import { getGameEscapeAction } from './game/gameEscapeActions';
import { GameTableLayout } from './game/GameTableLayout';
import { GameActionsPanel } from './game/GameActionsPanel';
import { getGameplayActions } from './game/gameActionHelpers';
import { GameExitConfirmDialog } from './game/GameExitConfirmDialog';
import { GameRoundResultDialog } from './game/GameRoundResultDialog';
import { GameSideshowResultDialog } from './game/GameSideshowResultDialog';
import { GameSideshowDeclinedDialog } from './game/GameSideshowDeclinedDialog';
import { GameBrandHeader } from './game/GameBrandHeader';
import { CompactGameLayout } from './game/CompactGameLayout';
import { GAME_TABLE_CANVAS_HEIGHT } from './game/layoutConstants';
import { usePotPaymentAnimation } from './game/usePotPaymentAnimation';
import { useTableEntranceAnimation } from './game/useTableEntranceAnimation';
import { useDealSequenceTracker } from './game/useDealSequenceTracker';
import { resolveSeatPositionsForEntrance } from './game/useSeatSpinAnimation';
import {
  getSideshowPresentationKey,
  getVisibleSideshowResult,
} from './game/sideshowPresentation';
import { useTerminalSize } from '../hooks/useTerminalSize';
import {
  MIN_TERMINAL_COLUMNS,
  MIN_TERMINAL_ROWS,
  TerminalOutOfRangeScreen,
} from '../components/ScreenSizeGuard';

export type { GameScreenProps } from './game/types';

// Keep the game at a desktop-sized canvas.  The same dimensions are also the
// hard lower bound checked before rendering, so Ink never squeezes the table
// into a smaller terminal.
export const GAMEPLAY_WIDTH = 150;
// Header (2) + table/action canvas (38) + one-line controls (1). Keeping this
// at 41 lets a normal 1080p Windows Terminal show the same full table.
export const GAMEPLAY_HEIGHT = 41;
export function getGameplayLayoutMode(
  columns: number,
  rows: number,
): 'desktop' | 'compact' | 'unsupported' {
  if (columns < MIN_TERMINAL_COLUMNS || rows < MIN_TERMINAL_ROWS) {
    return 'unsupported';
  }
  return columns >= GAMEPLAY_WIDTH && rows >= GAMEPLAY_HEIGHT ? 'desktop' : 'compact';
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

interface GameBottomStatusBarProps {
  readonly isEntranceActive: boolean;
  readonly isRoundEnded: boolean;
  readonly isWaitingForNextRound: boolean;
}

function GameBottomStatusBar({
  isEntranceActive,
  isRoundEnded,
  isWaitingForNextRound,
}: GameBottomStatusBarProps) {
  if (isEntranceActive) {
    return (
      <Box height={1} justifyContent="center" alignItems="center">
        <Text color="cyanBright" bold>
          ♦ DEALING IN PROGRESS · ALL ACTIONS LOCKED ♦
        </Text>
      </Box>
    );
  }
  if (isRoundEnded) {
    return <Box height={1} />;
  }
  if (isWaitingForNextRound) {
    return (
      <Box height={1} justifyContent="center" alignItems="center">
        <Text color="yellowBright" bold>
          👁 SPECTATING · YOU WILL JOIN THE TABLE IN THE NEW GAME
        </Text>
      </Box>
    );
  }
  return (
    <Box height={1} justifyContent="center" alignItems="center">
      <Text color="gray">↑ ↓ </Text>
      <Text color="white">CHOOSE</Text>
      <Text color="gray"> · </Text>
      <Text color="yellow">ENTER</Text>
      <Text color="white"> CONFIRM</Text>
      <Text color="gray"> · ONLY LEGAL MOVES ARE SHOWN</Text>
    </Box>
  );
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
  const nonWaitingPlayers = players.filter((player) => player.status !== 'WAITING');
  const activeTablePlayers = nonWaitingPlayers.length > 0 ? nonWaitingPlayers : players;
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
  const isCompactLayout = layoutMode === 'compact';

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
        minimumColumns={MIN_TERMINAL_COLUMNS}
        minimumRows={MIN_TERMINAL_ROWS}
      />
    );
  }

  return (
    <Box width="100%" height={rows} alignItems="center" justifyContent="center">
      {isCompactLayout ? (
        <Box flexDirection="column" width={76} alignItems="center" position="relative">
          <CompactGameLayout
            roomId={roomId}
            hostName={hostName}
            players={activeTablePlayers}
            myPlayerId={myPlayerId}
            currentTurnPlayerId={activeTurnPlayerId}
            pot={effectivePot}
            currentStake={currentStake}
            myCards={myCards}
            statusContext={statusContext}
            actionItems={actionItems}
            inputMode={actionCtrl.inputMode}
            betAmount={actionCtrl.betAmount}
            notice={notice ?? null}
            isInputDisabled={
              !roundResultPresentation.shouldShowActions ||
              isExitDialogOpen ||
              Boolean(showdownCards) ||
              isSideshowResultVisible ||
              isSideshowNoticeVisible ||
              isPotBlinking ||
              entranceAnimation.isEntranceActive
            }
            shouldShowActions={roundResultPresentation.shouldShowActions}
            onActionSelect={actionCtrl.handleActionSelect}
            onBetChange={actionCtrl.setBetAmount}
            onBetSubmit={actionCtrl.handleBetSubmit}
          />
          {isExitDialogOpen && (
            <GameExitConfirmDialog
              onConfirm={onLeave}
              onCancel={() => setIsExitDialogOpen(false)}
              compact
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
              compact
            />
          )}
        </Box>
      ) : (
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
                entranceAnimation.elapsedMs -
                  entranceAnimation.milestones.nameGlowStartMs,
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
              isInputDisabled={
                !roundResultPresentation.shouldShowActions ||
                isExitDialogOpen ||
                Boolean(showdownCards) ||
                isSideshowResultVisible ||
                isSideshowNoticeVisible ||
                isPotBlinking ||
                entranceAnimation.isEntranceActive
              }
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
            {visibleSideshowResult &&
              isSideshowResultVisible &&
              !effectiveRoundResult && (
                <GameSideshowResultDialog
                  result={visibleSideshowResult}
                  players={players}
                />
              )}
            {visibleSideshowNotice && isSideshowNoticeVisible && (
              <GameSideshowDeclinedDialog
                notice={visibleSideshowNotice}
                players={players}
              />
            )}
          </Box>
          <GameBottomStatusBar
            isEntranceActive={entranceAnimation.isEntranceActive}
            isRoundEnded={Boolean(effectiveRoundResult)}
            isWaitingForNextRound={statusContext.isWaitingForNextRound ?? false}
          />
        </Box>
      )}
    </Box>
  );
}
