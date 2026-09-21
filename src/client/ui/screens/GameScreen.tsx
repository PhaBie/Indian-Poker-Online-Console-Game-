import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { GameScreenProps, StatusStateContext, GameStatePayload } from './game/types';
import {
  getOrderedPlayersByPerspective,
  determineSeatPositions,
} from './game/gameLayoutHelpers';
import { useGameActionController } from './game/useGameActionController';
import { GameTableLayout } from './game/GameTableLayout';
import { GameActionsPanel } from './game/GameActionsPanel';
import { getGameplayActions } from './game/gameActionHelpers';
import { GameExitConfirmDialog } from './game/GameExitConfirmDialog';
import { GameRoundResultDialog } from './game/GameRoundResultDialog';
import { GameSideshowResultDialog } from './game/GameSideshowResultDialog';
import { GameSideshowDeclinedDialog } from './game/GameSideshowDeclinedDialog';
import { GameBrandHeader } from './game/GameBrandHeader';
import { usePotPaymentAnimation } from './game/usePotPaymentAnimation';
import { useTableEntranceAnimation } from './game/useTableEntranceAnimation';
import { resolveSeatPositionsForEntrance } from './game/useSeatSpinAnimation';
import { useTerminalSize } from '../hooks/useTerminalSize';
import {
  getTerminalSizeStatus,
  TerminalOutOfRangeScreen,
} from '../components/ScreenSizeGuard';

export type { GameScreenProps } from './game/types';

// Keep the game at a desktop-sized canvas.  The same dimensions are also the
// hard lower bound checked before rendering, so Ink never squeezes the table
// into a smaller terminal.
export const GAMEPLAY_WIDTH = 150;
export const GAMEPLAY_HEIGHT = 45;
const GAMEPLAY_MIN_COLUMNS = GAMEPLAY_WIDTH;
const GAMEPLAY_MIN_ROWS = GAMEPLAY_HEIGHT;

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
  isRoundEnding: boolean,
): StatusStateContext {
  const me = players.find((player) => player.id === myPlayerId);
  const isBankrupt = (me?.chips ?? 0) <= 0;
  return {
    isBankrupt,
    isRoundEnding,
    isMyTurn: !isBankrupt && currentTurnPlayerId === myPlayerId && !pendingSideshow,
    isPendingSideshowTarget: !isBankrupt && pendingSideshow?.targetId === myPlayerId,
    isPendingSideshowChallenger:
      !isBankrupt && pendingSideshow?.challengerId === myPlayerId,
    hasPendingSideshow: !isBankrupt && Boolean(pendingSideshow),
  };
}

export function GameScreen({
  gameState,
  myPlayerId,
  socketClient,
  serverError,
  roundResult,
  roundStartChips,
  isSideshowResultVisible = false,
  isSideshowNoticeVisible = false,
  autoAdvanceRound = false,
  onNextRound,
  onLeave,
}: GameScreenProps) {
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
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
    isRoundEnding = false,
  } = gameState;
  const effectiveRoundResult = roundResult ?? gameState.roundResult ?? null;
  const roundResultPresentation = getRoundResultPresentation(
    Boolean(effectiveRoundResult),
    currentTurnPlayerId,
  );
  const { isAmountVisible, effectiveTurnPlayerId, isPotBlinking, displayedPotAmount } =
    usePotPaymentAnimation(pot, roundResultPresentation.currentTurnPlayerId);
  const entranceAnimation = useTableEntranceAnimation(pot);
  const activeTurnPlayerId = entranceAnimation.isEntranceActive
    ? null
    : effectiveTurnPlayerId;
  const actionCtrl = useGameActionController(socketClient);
  const orderedPlayers = getOrderedPlayersByPerspective(players, myPlayerId);
  const rawSeatPositions = determineSeatPositions(orderedPlayers);
  const seatPositions = resolveSeatPositionsForEntrance(
    rawSeatPositions,
    entranceAnimation.elapsedMs,
    entranceAnimation.isEntranceActive,
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
    isRoundEnding,
  );
  const actionItems = getGameplayActions({
    players,
    myPlayerId,
    currentTurnPlayerId: activeTurnPlayerId,
    currentStake,
    pendingSideshow: effectiveRoundResult ? null : (pendingSideshow ?? null),
  });
  const notice = actionCtrl.localError ?? serverError;
  const hostName = players.find((player) => player.id === hostId)?.name;
  const sizeStatus = getTerminalSizeStatus(columns, rows);
  const isGameplayTooSmall = columns < GAMEPLAY_MIN_COLUMNS || rows < GAMEPLAY_MIN_ROWS;
  const outOfRangeStatus =
    isGameplayTooSmall || sizeStatus === 'TOO_SMALL' ? 'TOO_SMALL' : 'TOO_LARGE';

  useInput((_, key) => {
    if (key.escape && !isExitDialogOpen) {
      setIsExitDialogOpen(true);
    }
  });

  if (sizeStatus !== 'OPTIMAL' || isGameplayTooSmall) {
    return (
      <TerminalOutOfRangeScreen
        currentColumns={columns}
        currentRows={rows}
        status={outOfRangeStatus}
        minimumColumns={GAMEPLAY_MIN_COLUMNS}
        minimumRows={GAMEPLAY_MIN_ROWS}
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
        <Box flexDirection="row" width={GAMEPLAY_WIDTH} height={38} position="relative">
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
            sideshowResult={effectiveRoundResult ? null : sideshowResult}
            sideshowNotice={effectiveRoundResult ? null : sideshowNotice}
            showdownCards={effectiveRoundResult ? null : showdownCards}
            isPotAmountVisible={isEffectivePotAmountVisible}
            entranceVisibleCardCount={entranceAnimation.visibleCardCount}
            isEntranceDeckPhase={entranceAnimation.isDeckPhase}
            entranceElapsedMs={entranceAnimation.elapsedMs}
            justDealtCardIndex={entranceAnimation.justDealtCardIndex}
            isEntranceActive={entranceAnimation.isEntranceActive}
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
              isRoundEnding ||
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
              showAutoNextRound={autoAdvanceRound}
              autoAdvanceLabel={
                gameState.isRoundEnding ? 'RETURNING TO WAITING ROOM' : undefined
              }
              onNextRound={onNextRound}
            />
          )}
          {sideshowResult && isSideshowResultVisible && !effectiveRoundResult && (
            <GameSideshowResultDialog result={sideshowResult} players={players} />
          )}
          {sideshowNotice && isSideshowNoticeVisible && (
            <GameSideshowDeclinedDialog notice={sideshowNotice} players={players} />
          )}
        </Box>
        <Box height={3} justifyContent="center" alignItems="center">
          {entranceAnimation.isEntranceActive ? (
            <Text color="cyanBright" bold>
              ♦ DEALING IN PROGRESS · ALL ACTIONS LOCKED ♦
            </Text>
          ) : !effectiveRoundResult ? (
            <>
              <Text color="gray">↑ ↓ </Text>
              <Text color="white">CHOOSE</Text>
              <Text color="gray"> · </Text>
              <Text color="yellow">ENTER</Text>
              <Text color="white"> CONFIRM</Text>
              <Text color="gray"> · ONLY LEGAL MOVES ARE SHOWN</Text>
            </>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
