import { Box } from 'ink';
import type { GameScreenProps, StatusStateContext, GameStatePayload } from './game/types';
import {
  getOrderedPlayersByPerspective,
  determineSeatPositions,
} from './game/gameLayoutHelpers';
import {
  useGameActionController,
  ACTION_MENU_ITEMS,
  SIDESHOW_ACTION_ITEMS,
} from './game/useGameActionController';
import { GameTableLayout } from './game/GameTableLayout';
import { GameActionsPanel } from './game/GameActionsPanel';
import { GameStatusPanel } from './game/GameStatusPanel';

export type { GameScreenProps } from './game/types';

interface GameSidePanelProps {
  readonly isMyTurn: boolean;
  readonly inputMode: 'menu' | 'input_bet';
  readonly betAmount: string;
  readonly isPendingSideshowTarget: boolean;
  readonly onActionSelect: (item: { label: string; value: string }) => void;
  readonly onBetChange: (amount: string) => void;
  readonly onBetSubmit: (amount: string) => void;
  readonly localError: string | null;
  readonly serverError?: string | null;
  readonly statusContext: StatusStateContext;
}

function GameSidePanel(props: GameSidePanelProps) {
  return (
    <Box flexDirection="column" width={28} marginLeft={1}>
      <GameActionsPanel
        isMyTurn={props.isMyTurn}
        inputMode={props.inputMode}
        betAmount={props.betAmount}
        isPendingSideshowTarget={props.isPendingSideshowTarget}
        actionItems={ACTION_MENU_ITEMS}
        sideshowItems={SIDESHOW_ACTION_ITEMS}
        onActionSelect={props.onActionSelect}
        onBetChange={props.onBetChange}
        onBetSubmit={props.onBetSubmit}
      />
      <GameStatusPanel
        localError={props.localError}
        serverError={props.serverError}
        statusContext={props.statusContext}
      />
    </Box>
  );
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
}: GameScreenProps) {
  const { players, pot, currentTurnPlayerId, myCards, roomId, pendingSideshow } =
    gameState;
  const actionCtrl = useGameActionController(socketClient);
  const orderedPlayers = getOrderedPlayersByPerspective(players, myPlayerId);
  const seatPositions = determineSeatPositions(orderedPlayers);
  const statusContext = buildStatusContext(
    currentTurnPlayerId,
    myPlayerId,
    pendingSideshow,
  );

  return (
    <Box flexDirection="row" width={100} height={30}>
      <GameTableLayout
        roomId={roomId}
        pot={pot}
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
        isPendingSideshowTarget={statusContext.isPendingSideshowTarget}
        onActionSelect={actionCtrl.handleActionSelect}
        onBetChange={actionCtrl.setBetAmount}
        onBetSubmit={actionCtrl.handleBetSubmit}
        localError={actionCtrl.localError}
        serverError={serverError}
        statusContext={statusContext}
      />
    </Box>
  );
}
