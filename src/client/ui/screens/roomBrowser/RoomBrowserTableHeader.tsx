import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';

const COLUMN_WIDTHS = {
  roomId: 14,
  host: 15,
  players: 11,
  ante: 11,
  status: 13,
} as const;

export { COLUMN_WIDTHS };

export const ROOM_BROWSER_CONTENT_WIDTH = Object.values(COLUMN_WIDTHS).reduce(
  (total, width) => total + width,
  0,
) + Object.keys(COLUMN_WIDTHS).length + 1;

export function buildGridBorder(
  left: string,
  junction: string,
  right: string,
): string {
  const segments = Object.values(COLUMN_WIDTHS).map((width) => '─'.repeat(width));
  return `${left}${segments.join(junction)}${right}`;
}

export function formatGridCell(
  value: string,
  width: number,
  alignment: 'left' | 'center' = 'left',
): string {
  const availableWidth = Math.max(0, width - 2);
  const truncated = value.slice(0, availableWidth);
  const remaining = availableWidth - truncated.length;

  if (alignment === 'center') {
    const leftPadding = Math.floor(remaining / 2);
    return ` ${' '.repeat(leftPadding)}${truncated}${' '.repeat(remaining - leftPadding)} `;
  }

  return ` ${truncated}${' '.repeat(remaining)} `;
}

export function RoomBrowserTableHeader() {
  return (
    <Box flexDirection="row" width={ROOM_BROWSER_CONTENT_WIDTH}>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text bold color={UI_COLORS.goldHighlight}>
        {formatGridCell('ROOM ID', COLUMN_WIDTHS.roomId, 'center')}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text bold color={UI_COLORS.goldHighlight}>
        {formatGridCell('HOST', COLUMN_WIDTHS.host, 'center')}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text bold color={UI_COLORS.goldHighlight}>
        {formatGridCell('PLAYERS', COLUMN_WIDTHS.players, 'center')}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text bold color={UI_COLORS.goldHighlight}>
        {formatGridCell('ANTE', COLUMN_WIDTHS.ante, 'center')}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
      <Text bold color={UI_COLORS.goldHighlight}>
        {formatGridCell('STATUS', COLUMN_WIDTHS.status, 'center')}
      </Text>
      <Text color={UI_COLORS.mutedText}>│</Text>
    </Box>
  );
}
