import { Box, Text } from 'ink';
import type { RoomSummaryDTO } from './types';
import { UI_COLORS } from '../../theme/colors';
import { COLUMN_WIDTHS, formatGridCell, ROOM_BROWSER_CONTENT_WIDTH } from './RoomBrowserTableHeader';

interface RoomBrowserRowProps {
  readonly room: RoomSummaryDTO;
  readonly isSelected: boolean;
}

export function resolveRoomStatus(room: RoomSummaryDTO) {
  if (room.playerCount >= room.maxPlayers) {
    return { statusColor: UI_COLORS.errorRed, statusLabel: '● FULL' };
  }
  if (room.phase === 'PLAYING') {
    return { statusColor: UI_COLORS.activeBlue, statusLabel: '● PLAYING' };
  }
  if (room.phase === 'ENDED') {
    return { statusColor: UI_COLORS.warningYellow, statusLabel: '● ENDED' };
  }
  return { statusColor: UI_COLORS.activeGreen, statusLabel: '● OPEN' };
}

export function RoomBrowserRow({ room, isSelected }: RoomBrowserRowProps) {
  const { statusColor, statusLabel } = resolveRoomStatus(room);
  const textColor = isSelected ? UI_COLORS.goldHighlight : UI_COLORS.primaryText;

  return (
    <Box flexDirection="row" width={ROOM_BROWSER_CONTENT_WIDTH} paddingY={1}>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text bold={isSelected} color={textColor}>
        {formatGridCell(`${isSelected ? '❯' : ' '} #${room.roomId}`, COLUMN_WIDTHS.roomId)}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text bold={isSelected} color={textColor}>
        {formatGridCell(room.hostName, COLUMN_WIDTHS.host)}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text bold={isSelected} color={textColor}>
        {formatGridCell(`${room.playerCount} / ${room.maxPlayers}`, COLUMN_WIDTHS.players, 'center')}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text color={textColor}>
        {formatGridCell(`${room.bootAmount} 🪙`, COLUMN_WIDTHS.ante, 'center')}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text bold color={statusColor}>
        {formatGridCell(statusLabel, COLUMN_WIDTHS.status, 'center')}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
    </Box>
  );
}
