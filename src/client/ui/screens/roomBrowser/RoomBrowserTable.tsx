import { Box, Text } from 'ink';
import type { RoomSummaryDTO } from './types';
import { UI_COLORS } from '../../theme/colors';
import { RoomBrowserRow } from './RoomBrowserRow';

interface RoomBrowserTableProps {
  readonly rooms: RoomSummaryDTO[];
  readonly selectedIndex: number;
}

export function RoomBrowserTable({ rooms, selectedIndex }: RoomBrowserTableProps) {
  return (
    <Box flexDirection="column" width="100%" marginY={1}>
      <Box flexDirection="row" width="100%" marginBottom={1}>
        <Box width="6%">
          <Text color={UI_COLORS.mutedText}> </Text>
        </Box>
        <Box width="20%">
          <Text bold color={UI_COLORS.inactiveTitle}>
            TABLE ID
          </Text>
        </Box>
        <Box width="26%">
          <Text bold color={UI_COLORS.inactiveTitle}>
            HOST
          </Text>
        </Box>
        <Box width="16%">
          <Text bold color={UI_COLORS.inactiveTitle}>
            PLAYERS
          </Text>
        </Box>
        <Box width="18%">
          <Text bold color={UI_COLORS.inactiveTitle}>
            BOOT
          </Text>
        </Box>
        <Box width="14%">
          <Text bold color={UI_COLORS.inactiveTitle}>
            STATUS
          </Text>
        </Box>
      </Box>

      {rooms.length === 0 ? (
        <Box flexDirection="column" alignItems="center" paddingY={2}>
          <Text color={UI_COLORS.mutedText}>No active tables on this server.</Text>
          <Text color={UI_COLORS.goldHighlight} bold>
            Press [ C ] to create and host the first table!
          </Text>
        </Box>
      ) : (
        rooms.map((room, index) => (
          <RoomBrowserRow
            key={room.roomId}
            room={room}
            isSelected={index === selectedIndex}
          />
        ))
      )}
    </Box>
  );
}
