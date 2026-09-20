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
import { GameBrandHeader } from './game/GameBrandHeader';
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

interface GameSidePanelProps {
  readonly isMyTurn: boolean;
  readonly inputMode: 'menu' | 'input_bet';
  readonly betAmount: string;
  readonly onActionSelect: (item: { label: string; value: string }) => void;
  readonly onBetChange: (amount: string) => void;
  readonly onBetSubmit: (amount: string) => void;
  readonly statusContext: StatusStateContext;
  readonly actionItems: readonly { label: string; value: string; hint?: string }[];
  readonly isInputDisabled: boolean;
}

function GameSidePanel(props: GameSidePanelProps) {
  return <GameActionsPanel {...props} />;
}

function buildStatusContext(
  currentTurnPlayerId: string | null,
  myPlayerId: string | null,
  pendingSideshow: GameStatePayload['pendingSideshow'],
): StatusStateContext {
  return {
    isMyTurn: currentTurnPlayerId === myPlayerId && !pendingSideshow,
    isPendingSideshowTarget: pendingSideshow?.targetId === myPlayerId,
    isPendingSideshowChallenger: pendingSideshow?.challengerId === myPlayerId,
    hasPendingSideshow: Boolean(pendingSideshow),
  };
}

export function GameScreen({
  gameState,
  myPlayerId,
  socketClient,
  serverError,
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
  } = gameState;
  const actionCtrl = useGameActionController(socketClient);
  const orderedPlayers = getOrderedPlayersByPerspective(players, myPlayerId);
  const seatPositions = determineSeatPositions(orderedPlayers);
  const statusContext = buildStatusContext(
    currentTurnPlayerId,
    myPlayerId,
    pendingSideshow,
  );
  const actionItems = getGameplayActions({
    players,
    myPlayerId,
    currentTurnPlayerId,
    currentStake,
    pendingSideshow: pendingSideshow ?? null,
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
        <Box height={1} justifyContent="center" alignItems="center">
          {notice && <Text color="redBright">[!] {notice}</Text>}
        </Box>
        <Box flexDirection="row" width={GAMEPLAY_WIDTH} height={38} position="relative">
          <GameTableLayout
            pot={pot}
            currentStake={currentStake}
            seatPositions={seatPositions}
            currentTurnPlayerId={currentTurnPlayerId}
            myPlayerId={myPlayerId}
            pendingSideshowTargetId={pendingSideshow?.targetId}
            myCards={myCards}
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
            isInputDisabled={isExitDialogOpen}
          />
          {isExitDialogOpen && (
            <GameExitConfirmDialog
              onConfirm={onLeave}
              onCancel={() => setIsExitDialogOpen(false)}
            />
          )}
        </Box>
        <Box height={3} justifyContent="center" alignItems="center">
          <Text color="gray">↑ ↓ </Text>
          <Text color="white">CHOOSE</Text>
          <Text color="gray"> · </Text>
          <Text color="yellow">ENTER</Text>
          <Text color="white"> CONFIRM</Text>
          <Text color="gray"> · ONLY LEGAL MOVES ARE SHOWN</Text>
        </Box>
      </Box>
    </Box>
  );
}
