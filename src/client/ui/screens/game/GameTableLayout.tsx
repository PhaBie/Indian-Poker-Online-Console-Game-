import { Box, Text } from 'ink';
import type { GameTableLayoutProps, GamePlayerItem } from './types';
import { PlayerSeatNode } from './PlayerSeatNode';

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

function PotDisplayBox({ pot }: { readonly pot: number }) {
  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      paddingX={3}
      paddingY={1}
      flexDirection="column"
      alignItems="center"
    >
      <Text color="white">TOTAL POT</Text>
      <Text color="greenBright" bold>
        ${pot}
      </Text>
    </Box>
  );
}

function TableHeaderBar({ roomId }: { readonly roomId: string }) {
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Text color="white">ROOM: #{roomId.substring(0, 6)}</Text>
      <Text color="greenBright" bold>
        PLAYING
      </Text>
    </Box>
  );
}

export function GameTableLayout({
  roomId,
  pot,
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
      borderColor="cyan"
      width={70}
      flexDirection="column"
      position="relative"
    >
      <TableHeaderBar roomId={roomId} />

      <Box
        flexGrow={1}
        flexDirection="column"
        justifyContent="space-between"
        paddingY={1}
      >
        <Box justifyContent="center" width="100%">
          <Box marginLeft={18}>{renderSlot(seatPositions.topPlayer)}</Box>
        </Box>

        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          paddingX={2}
        >
          {renderSlot(seatPositions.leftPlayer)}
          <PotDisplayBox pot={pot} />
          {renderSlot(seatPositions.rightPlayer)}
        </Box>

        <Box justifyContent="center" width="100%">
          <Box marginLeft={18}>{renderSlot(seatPositions.bottomPlayer)}</Box>
        </Box>
      </Box>
    </Box>
  );
}
