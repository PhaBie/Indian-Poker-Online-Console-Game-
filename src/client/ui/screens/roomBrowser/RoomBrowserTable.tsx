import { Box, Text } from 'ink';
import type { RoomSummaryDTO } from './types';
import { UI_COLORS } from '../../theme/colors';
import {
  RoomBrowserTableHeader,
  ROOM_BROWSER_CONTENT_WIDTH,
  buildGridBorder,
} from './RoomBrowserTableHeader';
import { RoomBrowserRow } from './RoomBrowserRow';
import { RoomBrowserEmptyState } from './RoomBrowserEmptyState';

interface RoomBrowserTableProps {
  readonly rooms: RoomSummaryDTO[];
  readonly selectedIndex: number;
  readonly maxVisibleRows: number;
  readonly networkMode?: 'LAN' | 'INTERNET';
  readonly serverUrl: string;
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
  networkMode = 'LAN',
  serverUrl,
}: RoomBrowserTableProps) {
  const serverLabel = serverUrl.replace(/^wss?:\/\//, '').split(/[/?]/)[0];

  if (rooms.length === 0) {
    return (
      <Box
        flexDirection="column"
        width={ROOM_BROWSER_CONTENT_WIDTH}
        height={11}
        alignSelf="center"
        paddingBottom={2}
      >
        <Box
          flexGrow={1}
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
        >
          <RoomBrowserEmptyState />
          <Box marginTop={1} justifyContent="center">
            <Text color={UI_COLORS.mutedText}>
              {networkMode === 'LAN'
                ? `CONNECTED TO  ${serverLabel}`
                : 'READY TO BROWSE AVAILABLE ROOMS'}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  const { start, end } = getVisibleRoomWindow(
    rooms.length,
    selectedIndex,
    maxVisibleRows,
  );
  const visibleRooms = rooms.slice(start, end);

  return (
    <Box
      flexDirection="column"
      width={ROOM_BROWSER_CONTENT_WIDTH}
      alignSelf="center"
      marginTop={1}
    >
      <Text color={UI_COLORS.mutedText}>{buildGridBorder('┌', '┬', '┐')}</Text>
      <RoomBrowserTableHeader />
      <Text color={UI_COLORS.mutedText}>{buildGridBorder('├', '┼', '┤')}</Text>
      {visibleRooms.map((room, index) => (
        <Box key={room.roomId} flexDirection="column">
          <RoomBrowserRow room={room} isSelected={start + index === selectedIndex} />
          {index < visibleRooms.length - 1 && (
            <Text color={UI_COLORS.mutedText}>{buildGridBorder('├', '┼', '┤')}</Text>
          )}
        </Box>
      ))}
      <Text color={UI_COLORS.mutedText}>{buildGridBorder('└', '┴', '┘')}</Text>
      <Box marginTop={1} width="100%" justifyContent="space-between">
        <Text color={UI_COLORS.mutedText}>
          Showing {start + 1}-{end} of {rooms.length}
        </Text>
        <Text color={UI_COLORS.mutedText}>
          {networkMode === 'LAN' ? `Server  ${serverLabel}` : 'Browse available rooms'}
        </Text>
      </Box>
    </Box>
  );
}
