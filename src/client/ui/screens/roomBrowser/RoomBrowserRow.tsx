import { Box, Text } from 'ink';
import type { RoomSummaryDTO } from './types';
import { UI_COLORS } from '../../theme/colors';

interface RoomBrowserRowProps {
  readonly room: RoomSummaryDTO;
  readonly isSelected: boolean;
}

function resolveRoomStatus(room: RoomSummaryDTO) {
  if (room.playerCount >= room.maxPlayers) {
    return { statusColor: UI_COLORS.errorRed, statusLabel: 'FULL' };
  }
  if (room.phase === 'PLAYING') {
    return { statusColor: UI_COLORS.activeBlue, statusLabel: 'IN GAME' };
  }
  if (room.phase === 'ENDED') {
    return { statusColor: UI_COLORS.warningYellow, statusLabel: 'FINISHED' };
  }
  return { statusColor: UI_COLORS.activeGreen, statusLabel: 'OPEN' };
}

export function RoomBrowserRow({ room, isSelected }: RoomBrowserRowProps) {
  const { statusColor, statusLabel } = resolveRoomStatus(room);
  const rowColor = isSelected ? UI_COLORS.goldHighlight : UI_COLORS.primaryText;

  return (
    <Box flexDirection="row" paddingY={0} width="100%">
      <Box width="6%">
        <Text color={isSelected ? UI_COLORS.goldHighlight : UI_COLORS.mutedText}>
          {isSelected ? '❯' : ' '}
        </Text>
      </Box>
      <Box width="20%">
        <Text bold={isSelected} color={rowColor}>
          #{room.roomId}
        </Text>
      </Box>
      <Box width="26%">
        <Text bold={isSelected} color={rowColor}>
          {room.hostName.slice(0, 14)}
        </Text>
      </Box>
      <Box width="16%">
        <Text bold={isSelected} color={rowColor}>
          {room.playerCount}/{room.maxPlayers}
        </Text>
      </Box>
      <Box width="18%">
        <Text color={rowColor}>{room.bootAmount} 🪙</Text>
      </Box>
      <Box width="14%">
        <Text bold color={statusColor}>
          {statusLabel}
        </Text>
      </Box>
    </Box>
  );
}
