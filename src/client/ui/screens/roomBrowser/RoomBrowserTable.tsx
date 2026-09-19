import { Box, Text } from 'ink';
import type { RoomSummaryDTO } from './types';
import { UI_COLORS } from '../../theme/colors';
import { RoomBrowserTableHeader, ROOM_BROWSER_CONTENT_WIDTH, buildGridBorder } from './RoomBrowserTableHeader';
import { RoomBrowserRow } from './RoomBrowserRow';
import { RoomBrowserEmptyState } from './RoomBrowserEmptyState';

interface RoomBrowserTableProps {
  readonly rooms: RoomSummaryDTO[];
  readonly selectedIndex: number;
  readonly maxVisibleRows: number;
}

export function getVisibleRoomWindow(
  totalRooms: number,
  selectedIndex: number,
  maxVisibleRows: number,
): { start: number; end: number } {
  if (totalRooms === 0) {
    return { start: 0, end: 0 };
  }

  const visibleRows = Math.max(1, Math.min(maxVisibleRows, totalRooms));
  const maxStart = Math.max(0, totalRooms - visibleRows);
  const centeredStart = selectedIndex - Math.floor(visibleRows / 2);
  const start = Math.max(0, Math.min(centeredStart, maxStart));

  return { start, end: start + visibleRows };
}

export function RoomBrowserTable({
  rooms,
  selectedIndex,
  maxVisibleRows,
}: RoomBrowserTableProps) {
  if (rooms.length === 0) {
    return <RoomBrowserEmptyState />;
  }

  const { start, end } = getVisibleRoomWindow(
    rooms.length,
    selectedIndex,
    maxVisibleRows,
  );
  const visibleRooms = rooms.slice(start, end);
  const hasRoomsAbove = start > 0;
  const hasRoomsBelow = end < rooms.length;

  return (
    <Box
      flexDirection="column"
      width={ROOM_BROWSER_CONTENT_WIDTH}
      alignSelf="center"
      marginTop={1}
    >
      {hasRoomsAbove && (
        <Text color={UI_COLORS.dimText}>
          {' '.repeat(ROOM_BROWSER_CONTENT_WIDTH - 2)}▲ {start} more rooms
        </Text>
      )}
      <Text color={UI_COLORS.mutedText}>{buildGridBorder('┌', '┬', '┐')}</Text>
      <RoomBrowserTableHeader />
      <Text color={UI_COLORS.mutedText}>{buildGridBorder('├', '┼', '┤')}</Text>
      {visibleRooms.map((room, index) => (
        <Box key={room.roomId} flexDirection="column">
          <RoomBrowserRow
            room={room}
            isSelected={start + index === selectedIndex}
          />
          {index < visibleRooms.length - 1 && (
            <Text color={UI_COLORS.mutedText}>{buildGridBorder('├', '┼', '┤')}</Text>
          )}
        </Box>
      ))}
      <Text color={UI_COLORS.mutedText}>{buildGridBorder('└', '┴', '┘')}</Text>
      {hasRoomsBelow && (
        <Text color={UI_COLORS.dimText}>
          {' '.repeat(ROOM_BROWSER_CONTENT_WIDTH - 2)}▼ {rooms.length - end} more rooms
        </Text>
      )}
      <Box marginTop={1}>
        <Text color={UI_COLORS.mutedText}>
          Showing {start + 1}-{end} of {rooms.length}
        </Text>
      </Box>
    </Box>
  );
}
