import { Box } from 'ink';
import { useEffect, useState } from 'react';
import type { GameTableLayoutProps, GamePlayerItem } from './types';
import { PlayerSeatNode } from './PlayerSeatNode';
import { PotDisplayBox } from './PotDisplayBox';

interface PlayerSlotProps {
  readonly player: GamePlayerItem | undefined;
  readonly myPlayerId: string | null;
  readonly currentTurnPlayerId: string | null;
  readonly pendingSideshowTargetId?: string;
  readonly myCards: GameTableLayoutProps['myCards'];
  readonly cardBorderGlowColors: readonly string[];
}

const CARD_BORDER_GLOW_INTERVAL_MS = 90;
const CARD_BORDER_GLOW_PAUSE_MS = 5_000;
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

function useCardBorderGlow() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((currentFrame) => (currentFrame + 1) % CARD_BORDER_GLOW_CYCLE_FRAMES);
    }, CARD_BORDER_GLOW_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return CARD_BORDER_GLOW_ACTIVE_FRAMES[frame] ?? DEFAULT_CARD_BORDER_COLORS;
}

function PlayerSlot({
  player,
  myPlayerId,
  currentTurnPlayerId,
  pendingSideshowTargetId,
  myCards,
  cardBorderGlowColors,
}: PlayerSlotProps) {
  const isMe = Boolean(player && player.id === myPlayerId);
  const isThisPlayerTurn = Boolean(player && player.id === currentTurnPlayerId);
  const isPendingSideshowTargetNode = Boolean(
    player && player.id === pendingSideshowTargetId,
  );

  return (
    <PlayerSeatNode
      player={player}
      isMe={isMe}
      isThisPlayerTurn={isThisPlayerTurn}
      isPendingSideshowTargetNode={isPendingSideshowTargetNode}
      myCards={myCards}
      cardBorderGlowColors={cardBorderGlowColors}
    />
  );
}

interface TableCenterRowProps {
  readonly leftSlot: React.ReactNode;
  readonly rightSlot: React.ReactNode;
  readonly pot: number;
  readonly currentStake: number;
}

function TableCenterRow({ leftSlot, rightSlot, pot, currentStake }: TableCenterRowProps) {
  return (
    <Box flexDirection="row" alignItems="center" width="100%">
      <Box width={36} justifyContent="center" alignItems="center">
        {leftSlot}
      </Box>
      <Box width={30} flexDirection="row" justifyContent="center">
        <PotDisplayBox pot={pot} currentStake={currentStake} />
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
}: GameTableLayoutProps) {
  const cardBorderGlowColors = useCardBorderGlow();
  const renderSlot = (player: GamePlayerItem | undefined) => (
    <PlayerSlot
      player={player}
      myPlayerId={myPlayerId}
      currentTurnPlayerId={currentTurnPlayerId}
      pendingSideshowTargetId={pendingSideshowTargetId}
      myCards={myCards}
      cardBorderGlowColors={cardBorderGlowColors}
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
        />

        <Box justifyContent="center" width="100%">
          {renderSlot(seatPositions.bottomPlayer)}
        </Box>
      </Box>
    </Box>
  );
}
