import { Box, Text } from 'ink';
import type { PublicPlayerDTO } from './types';
import { UI_COLORS } from '../../shared/theme/colors';
import {
  formatWaitingRoomCell,
  WAITING_ROOM_COLUMN_WIDTHS,
} from './WaitingRoomTableGrid';

interface WaitingRoomSeatRowProps {
  readonly seatNumber: number;
  readonly player?: PublicPlayerDTO;
  readonly isHost: boolean;
  readonly isMe: boolean;
}

interface OccupiedSeatRowProps {
  readonly seatNumber: number;
  readonly player: PublicPlayerDTO;
  readonly isHost: boolean;
  readonly isMe: boolean;
}

function WaitingRoomRowSeparator() {
  return (
    <Text color={UI_COLORS.mutedText}>
      ├{'─'.repeat(WAITING_ROOM_COLUMN_WIDTHS.seat)}┼
      {'─'.repeat(WAITING_ROOM_COLUMN_WIDTHS.player)}┼
      {'─'.repeat(WAITING_ROOM_COLUMN_WIDTHS.role)}┼
      {'─'.repeat(WAITING_ROOM_COLUMN_WIDTHS.status)}┤
    </Text>
  );
}

function EmptySeatRow({ seatNumber }: { readonly seatNumber: number }) {
  return (
    <Box flexDirection="row" width="100%">
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text color={UI_COLORS.mutedText}>
        {formatWaitingRoomCell(`[${seatNumber}]`, WAITING_ROOM_COLUMN_WIDTHS.seat)}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text color={UI_COLORS.mutedText}>
        {formatWaitingRoomCell('--- Empty Seat ---', WAITING_ROOM_COLUMN_WIDTHS.player)}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text color={UI_COLORS.mutedText}>
        {formatWaitingRoomCell('-', WAITING_ROOM_COLUMN_WIDTHS.role, 'center')}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text color={UI_COLORS.dimText}>
        {formatWaitingRoomCell(
          '[ AVAILABLE ]',
          WAITING_ROOM_COLUMN_WIDTHS.status,
          'center',
        )}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
    </Box>
  );
}

function OccupiedSeatRow({ seatNumber, player, isHost, isMe }: OccupiedSeatRowProps) {
  const isReady = player.status === 'READY';
  const statusColor = isReady ? UI_COLORS.activeGreen : UI_COLORS.warningYellow;
  const statusLabel = isReady ? '● READY' : '○ WAITING';

  return (
    <Box flexDirection="row" width="100%">
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text color={isMe ? UI_COLORS.goldHighlight : UI_COLORS.activeBlue}>
        {formatWaitingRoomCell(`[${seatNumber}]`, WAITING_ROOM_COLUMN_WIDTHS.seat)}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text bold={isMe} color={isMe ? UI_COLORS.goldHighlight : UI_COLORS.primaryText}>
        {formatWaitingRoomCell(
          `${player.name}${isMe ? ' (YOU)' : ''}`,
          WAITING_ROOM_COLUMN_WIDTHS.player,
        )}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text bold color={isHost ? UI_COLORS.activeBlue : UI_COLORS.inactiveTitle}>
        {formatWaitingRoomCell(
          isHost ? '[ HOST ]' : '[ PLAYER ]',
          WAITING_ROOM_COLUMN_WIDTHS.role,
          'center',
        )}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text bold color={statusColor}>
        {formatWaitingRoomCell(statusLabel, WAITING_ROOM_COLUMN_WIDTHS.status, 'center')}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
    </Box>
  );
}

export function WaitingRoomSeatRow({
  seatNumber,
  player,
  isHost,
  isMe,
}: WaitingRoomSeatRowProps) {
  return (
    <>
      {player ? (
        <OccupiedSeatRow
          seatNumber={seatNumber}
          player={player}
          isHost={isHost}
          isMe={isMe}
        />
      ) : (
        <EmptySeatRow seatNumber={seatNumber} />
      )}
      <WaitingRoomRowSeparator />
    </>
  );
}
