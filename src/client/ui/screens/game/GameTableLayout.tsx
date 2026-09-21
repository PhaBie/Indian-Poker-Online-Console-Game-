import { Box } from 'ink';
import type { GameTableLayoutProps, GamePlayerItem } from './types';
import { PlayerSeatNode } from './PlayerSeatNode';
import { PotDisplayBox } from './PotDisplayBox';
import { DealerDeckCenterBox } from './DealerDeckCenterBox';
import { useCardBorderGlow } from './useCardBorderGlow';

interface PlayerSlotProps {
  readonly player: GamePlayerItem | undefined;
  readonly myPlayerId: string | null;
  readonly currentTurnPlayerId: string | null;
  readonly pendingSideshowTargetId?: string;
  readonly myCards: GameTableLayoutProps['myCards'];
  readonly sideshowResult: GameTableLayoutProps['sideshowResult'];
  readonly sideshowNotice: GameTableLayoutProps['sideshowNotice'];
  readonly showdownCards: GameTableLayoutProps['showdownCards'];
  readonly sideshowParticipantIds: readonly string[];
  readonly cardBorderGlowColors: readonly string[];
  readonly visibleCardCount?: number;
  readonly isEntranceDeckPhase?: boolean;
  readonly justDealtCardIndex?: number;
  readonly isEntranceActive?: boolean;
  readonly isNameGlowPhase?: boolean;
  readonly nameGlowElapsedMs?: number;
}

function calculateSlotFlags(
  player: GamePlayerItem | undefined,
  myPlayerId: string | null,
  currentTurnPlayerId: string | null,
  pendingSideshowTargetId?: string,
  sideshowParticipantIds: readonly string[] = [],
  hasSideshowResult: boolean = false,
  hasSideshowNotice: boolean = false,
  hasShowdownCards: boolean = false,
) {
  const isMe = Boolean(player && player.id === myPlayerId);
  const isBankrupt = Boolean(player && player.chips <= 0);
  const isSideshowParticipantNode = Boolean(
    player && sideshowParticipantIds.includes(player.id),
  );
  const isShowdownRevealed = Boolean(player && hasShowdownCards);
  const isThisPlayerTurn = Boolean(
    player &&
    !isBankrupt &&
    !hasSideshowResult &&
    !hasSideshowNotice &&
    !hasShowdownCards &&
    player.id === currentTurnPlayerId,
  );
  const isPendingSideshowTargetNode = Boolean(
    player && !isBankrupt && player.id === pendingSideshowTargetId,
  );

  return {
    isMe,
    isBankrupt,
    isSideshowParticipantNode,
    isShowdownRevealed,
    isThisPlayerTurn,
    isPendingSideshowTargetNode,
  };
}

function PlayerSlot(props: PlayerSlotProps) {
  const {
    player,
    myPlayerId,
    currentTurnPlayerId,
    pendingSideshowTargetId,
    myCards,
    sideshowResult,
    sideshowNotice,
    showdownCards,
    sideshowParticipantIds,
    cardBorderGlowColors,
    visibleCardCount,
    isEntranceDeckPhase,
    justDealtCardIndex,
    isEntranceActive,
    isNameGlowPhase,
    nameGlowElapsedMs,
  } = props;
  const flags = calculateSlotFlags(
    player,
    myPlayerId,
    currentTurnPlayerId,
    pendingSideshowTargetId,
    sideshowParticipantIds,
    Boolean(sideshowResult),
    Boolean(sideshowNotice),
    Boolean(player && showdownCards?.[player.id]),
  );

  const revealedCards = player
    ? (sideshowResult?.cards[player.id] ?? showdownCards?.[player.id])
    : undefined;

  return (
    <PlayerSeatNode
      player={player}
      {...flags}
      myCards={myCards}
      visibleCardCount={visibleCardCount}
      isEntranceDeckPhase={isEntranceDeckPhase}
      justDealtCardIndex={justDealtCardIndex}
      isEntranceActive={isEntranceActive}
      isNameGlowPhase={isNameGlowPhase}
      nameGlowElapsedMs={nameGlowElapsedMs}
      revealedCards={revealedCards}
      cardBorderGlowColors={cardBorderGlowColors}
    />
  );
}

interface TableCenterRowProps {
  readonly leftSlot: React.ReactNode;
  readonly rightSlot: React.ReactNode;
  readonly pot: number;
  readonly currentStake: number;
  readonly isPotAmountVisible?: boolean;
  readonly isEntranceDeckPhase?: boolean;
  readonly entranceElapsedMs?: number;
  readonly playerCount?: number;
}

function TableCenterRow({
  leftSlot,
  rightSlot,
  pot,
  currentStake,
  isPotAmountVisible,
  isEntranceDeckPhase = false,
  entranceElapsedMs = 0,
}: TableCenterRowProps) {
  return (
    <Box flexDirection="row" alignItems="center" width="100%">
      <Box width={36} justifyContent="center" alignItems="center">
        {leftSlot}
      </Box>
      <Box width={30} flexDirection="row" justifyContent="center">
        {isEntranceDeckPhase ? (
          <DealerDeckCenterBox elapsedMs={entranceElapsedMs} />
        ) : (
          <PotDisplayBox
            pot={pot}
            currentStake={currentStake}
            isAmountVisible={isPotAmountVisible}
          />
        )}
      </Box>
      <Box width={36} justifyContent="center" alignItems="center">
        {rightSlot}
      </Box>
    </Box>
  );
}

function buildSideshowParticipantIds(
  sideshowResult: GameTableLayoutProps['sideshowResult'],
  sideshowNotice: GameTableLayoutProps['sideshowNotice'],
): readonly string[] {
  if (sideshowResult) {
    return [sideshowResult.challengerId, sideshowResult.targetId];
  }
  if (sideshowNotice) {
    return [sideshowNotice.challengerId, sideshowNotice.targetId];
  }
  return [];
}

interface TableSlotsLayoutProps {
  readonly topSlot: React.ReactNode;
  readonly leftSlot: React.ReactNode;
  readonly rightSlot: React.ReactNode;
  readonly bottomSlot: React.ReactNode;
  readonly pot: number;
  readonly currentStake: number;
  readonly isPotAmountVisible?: boolean;
  readonly isEntranceDeckPhase?: boolean;
  readonly entranceElapsedMs?: number;
  readonly playerCount?: number;
}

function TableSlotsLayout({
  topSlot,
  leftSlot,
  rightSlot,
  bottomSlot,
  pot,
  currentStake,
  isPotAmountVisible,
  isEntranceDeckPhase,
  entranceElapsedMs,
  playerCount,
}: TableSlotsLayoutProps) {
  return (
    <Box
      borderStyle="round"
      borderColor="cyanBright"
      width={104}
      height={38}
      flexDirection="column"
      position="relative"
    >
      <Box
        flexGrow={1}
        flexDirection="column"
        justifyContent="space-between"
        paddingTop={1}
        paddingBottom={1}
      >
        <Box justifyContent="center" width="100%">
          {topSlot}
        </Box>
        <TableCenterRow
          leftSlot={leftSlot}
          rightSlot={rightSlot}
          pot={pot}
          currentStake={currentStake}
          isPotAmountVisible={isPotAmountVisible}
          isEntranceDeckPhase={isEntranceDeckPhase}
          entranceElapsedMs={entranceElapsedMs}
          playerCount={playerCount}
        />
        <Box justifyContent="center" width="100%">
          {bottomSlot}
        </Box>
      </Box>
    </Box>
  );
}

export function GameTableLayout(props: GameTableLayoutProps) {
  const cardBorderGlowColors = useCardBorderGlow(
    props.isEntranceActive,
    props.entranceElapsedMs,
    props.cardGlowStartMs,
    props.cardGlowEndMs,
  );
  const participantIds = buildSideshowParticipantIds(
    props.sideshowResult,
    props.sideshowNotice,
  );

  const renderSlot = (player: GamePlayerItem | undefined) => (
    <PlayerSlot
      player={player}
      myPlayerId={props.myPlayerId}
      currentTurnPlayerId={props.currentTurnPlayerId}
      pendingSideshowTargetId={props.pendingSideshowTargetId}
      myCards={props.myCards}
      sideshowResult={props.sideshowResult}
      sideshowNotice={props.sideshowNotice}
      showdownCards={props.showdownCards}
      sideshowParticipantIds={participantIds}
      cardBorderGlowColors={cardBorderGlowColors}
      visibleCardCount={props.entranceVisibleCardCount}
      isEntranceDeckPhase={props.isEntranceDeckPhase}
      justDealtCardIndex={props.justDealtCardIndex}
      isEntranceActive={props.isEntranceActive}
      isNameGlowPhase={props.isNameGlowPhase}
      nameGlowElapsedMs={props.nameGlowElapsedMs}
    />
  );

  return (
    <TableSlotsLayout
      topSlot={renderSlot(props.seatPositions.topPlayer)}
      leftSlot={renderSlot(props.seatPositions.leftPlayer)}
      rightSlot={renderSlot(props.seatPositions.rightPlayer)}
      bottomSlot={renderSlot(props.seatPositions.bottomPlayer)}
      pot={props.pot}
      currentStake={props.currentStake}
      isPotAmountVisible={props.isPotAmountVisible}
      isEntranceDeckPhase={props.isEntranceDeckPhase}
      entranceElapsedMs={props.entranceElapsedMs}
      playerCount={props.playerCount}
    />
  );
}
