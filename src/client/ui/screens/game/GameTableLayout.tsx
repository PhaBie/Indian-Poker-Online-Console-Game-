import { Box } from 'ink';
import { useEffect, useRef, useState } from 'react';
import type { GameTableLayoutProps, GamePlayerItem } from './types';
import { PlayerSeatNode } from './PlayerSeatNode';
import { PotDisplayBox } from './PotDisplayBox';
import { DealerDeckCenterBox } from './DealerDeckCenterBox';

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
}

const CARD_BORDER_GLOW_INTERVAL_MS = 90;
const CARD_BORDER_GLOW_PAUSE_MS = 7_000;
const CARD_BORDER_GLOW_ACTIVE_FRAMES = [
  ['magentaBright', 'magenta', 'magenta'],
  ['yellow', 'magentaBright', 'magenta'],
  ['yellowBright', 'yellow', 'magentaBright'],
  ['yellow', 'yellowBright', 'yellow'],
  ['magentaBright', 'yellow', 'yellowBright'],
  ['magenta', 'magentaBright', 'yellow'],
  ['magenta', 'magenta', 'magentaBright'],
] as const;
const CARD_BORDER_GLOW_PAUSE_FRAMES = Math.ceil(
  CARD_BORDER_GLOW_PAUSE_MS / CARD_BORDER_GLOW_INTERVAL_MS,
);
const CARD_BORDER_GLOW_CYCLE_FRAMES =
  CARD_BORDER_GLOW_ACTIVE_FRAMES.length + CARD_BORDER_GLOW_PAUSE_FRAMES;
const DEFAULT_CARD_BORDER_COLORS = ['magenta', 'magenta', 'magenta'] as const;

function useCardBorderGlow(isEntranceActive: boolean = false) {
  const [frame, setFrame] = useState(
    isEntranceActive ? CARD_BORDER_GLOW_CYCLE_FRAMES : 0,
  );
  const wasEntranceActive = useRef(isEntranceActive);

  useEffect(() => {
    if (wasEntranceActive.current && !isEntranceActive) {
      setFrame(0);
    }
    wasEntranceActive.current = isEntranceActive;
  }, [isEntranceActive]);

  useEffect(() => {
    if (isEntranceActive) {
      return;
    }

    const timer = setInterval(() => {
      setFrame((currentFrame) => (currentFrame + 1) % CARD_BORDER_GLOW_CYCLE_FRAMES);
    }, CARD_BORDER_GLOW_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isEntranceActive]);

  if (isEntranceActive) {
    return DEFAULT_CARD_BORDER_COLORS;
  }

  return CARD_BORDER_GLOW_ACTIVE_FRAMES[frame] ?? DEFAULT_CARD_BORDER_COLORS;
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

export function GameTableLayout({
  pot,
  currentStake,
  seatPositions,
  currentTurnPlayerId,
  myPlayerId,
  pendingSideshowTargetId,
  myCards,
  sideshowResult,
  sideshowNotice,
  showdownCards,
  isPotAmountVisible,
  entranceVisibleCardCount,
  isEntranceDeckPhase,
  entranceElapsedMs,
  justDealtCardIndex,
  isEntranceActive,
}: GameTableLayoutProps) {
  const cardBorderGlowColors = useCardBorderGlow(isEntranceActive);
  const renderSlot = (player: GamePlayerItem | undefined) => (
    <PlayerSlot
      player={player}
      myPlayerId={myPlayerId}
      currentTurnPlayerId={currentTurnPlayerId}
      pendingSideshowTargetId={pendingSideshowTargetId}
      myCards={myCards}
      sideshowResult={sideshowResult}
      sideshowNotice={sideshowNotice}
      showdownCards={showdownCards}
      sideshowParticipantIds={
        sideshowResult
          ? [sideshowResult.challengerId, sideshowResult.targetId]
          : sideshowNotice
            ? [sideshowNotice.challengerId, sideshowNotice.targetId]
            : []
      }
      cardBorderGlowColors={cardBorderGlowColors}
      visibleCardCount={entranceVisibleCardCount}
      isEntranceDeckPhase={isEntranceDeckPhase}
      justDealtCardIndex={justDealtCardIndex}
      isEntranceActive={isEntranceActive}
    />
  );

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
          {renderSlot(seatPositions.topPlayer)}
        </Box>

        <TableCenterRow
          leftSlot={renderSlot(seatPositions.leftPlayer)}
          rightSlot={renderSlot(seatPositions.rightPlayer)}
          pot={pot}
          currentStake={currentStake}
          isPotAmountVisible={isPotAmountVisible}
          isEntranceDeckPhase={isEntranceDeckPhase}
          entranceElapsedMs={entranceElapsedMs}
        />

        <Box justifyContent="center" width="100%">
          {renderSlot(seatPositions.bottomPlayer)}
        </Box>
      </Box>
    </Box>
  );
}
