import { Box } from 'ink';
import type { GameTableLayoutProps, GamePlayerItem } from './types';
import { PlayerSeatNode } from './PlayerSeatNode';
import { PotDisplayBox } from './PotDisplayBox';

interface PlayerSlotProps {
  readonly player: GamePlayerItem | undefined;
  readonly myPlayerId: string | null;
  readonly currentTurnPlayerId: string | null;
  readonly pendingSideshowTargetId?: string;
  readonly myCards: GameTableLayoutProps['myCards'];
}

function PlayerSlot({
  player,
  myPlayerId,
  currentTurnPlayerId,
  pendingSideshowTargetId,
  myCards,
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
  const renderSlot = (player: GamePlayerItem | undefined) => (
    <PlayerSlot
      player={player}
      myPlayerId={myPlayerId}
      currentTurnPlayerId={currentTurnPlayerId}
      pendingSideshowTargetId={pendingSideshowTargetId}
      myCards={myCards}
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
