import { Box, Text } from 'ink';
import type { PublicPlayerDTO } from './types';
import { UI_COLORS } from '../../shared/theme/colors';
import { WaitingRoomSeatRow } from './WaitingRoomSeatRow';
import {
  buildWaitingRoomBorder,
  formatWaitingRoomCell,
  WAITING_ROOM_COLUMN_WIDTHS,
  WAITING_ROOM_TABLE_WIDTH,
} from './WaitingRoomTableGrid';

interface WaitingRoomPlayerListProps {
  readonly players: PublicPlayerDTO[];
  readonly hostId: string | null;
  readonly myPlayerId: string | null;
  readonly maxPlayers: number;
}

function WaitingRoomTableHeader() {
  return (
    <>
      <Text color={UI_COLORS.mutedText}>{buildWaitingRoomBorder('┌', '┬', '┐')}</Text>
      <Box flexDirection="row" width={WAITING_ROOM_TABLE_WIDTH}>
        <Text color={UI_COLORS.mutedText}>│</Text>
        <Text bold color={UI_COLORS.inactiveTitle}>
          {formatWaitingRoomCell('SEAT', WAITING_ROOM_COLUMN_WIDTHS.seat, 'center')}
        </Text>
        <Text color={UI_COLORS.mutedText}>│</Text>
        <Text bold color={UI_COLORS.inactiveTitle}>
          {formatWaitingRoomCell(
            'PLAYER NAME',
            WAITING_ROOM_COLUMN_WIDTHS.player,
            'center',
          )}
        </Text>
        <Text color={UI_COLORS.mutedText}>│</Text>
        <Text bold color={UI_COLORS.inactiveTitle}>
          {formatWaitingRoomCell('ROLE', WAITING_ROOM_COLUMN_WIDTHS.role, 'center')}
        </Text>
        <Text color={UI_COLORS.mutedText}>│</Text>
        <Text bold color={UI_COLORS.inactiveTitle}>
          {formatWaitingRoomCell('STATUS', WAITING_ROOM_COLUMN_WIDTHS.status, 'center')}
        </Text>
        <Text color={UI_COLORS.mutedText}>│</Text>
      </Box>
      <Text color={UI_COLORS.mutedText}>{buildWaitingRoomBorder('├', '┼', '┤')}</Text>
    </>
  );
}

export function WaitingRoomPlayerList({
  players,
  hostId,
  myPlayerId,
  maxPlayers,
}: WaitingRoomPlayerListProps) {
  const seatIndices = Array.from({ length: maxPlayers }, (_, index) => index);

  return (
    <Box
      flexDirection="column"
      width={WAITING_ROOM_TABLE_WIDTH}
      alignSelf="center"
      marginY={1}
    >
      <WaitingRoomTableHeader />
      {seatIndices.map((index) => {
        const player = players[index];
        return (
          <WaitingRoomSeatRow
            key={player ? player.id : `empty_seat_${index}`}
            seatNumber={index + 1}
            player={player}
            isHost={Boolean(player && player.id === hostId)}
            isMe={Boolean(player && player.id === myPlayerId)}
          />
        );
      })}
      <Text color={UI_COLORS.mutedText}>{buildWaitingRoomBorder('└', '┴', '┘')}</Text>
    </Box>
  );
}
