import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';
import { ROOM_BROWSER_CONTENT_WIDTH } from './RoomBrowserTableHeader';

interface RoomBrowserHeaderProps {
  readonly serverUrl: string;
  readonly playerName: string;
  readonly networkMode?: 'LAN' | 'INTERNET';
  readonly lastError?: string | null;
}

export function RoomBrowserHeader({
  serverUrl,
  playerName,
  networkMode = 'LAN',
  lastError,
}: RoomBrowserHeaderProps) {
  const isLan = networkMode === 'LAN';
  const serverLabel = serverUrl.replace(/^wss?:\/\//, '').split(/[/?]/)[0];
  return (
    <Box flexDirection="column" width={ROOM_BROWSER_CONTENT_WIDTH} alignSelf="center">
      <Box justifyContent="space-between">
        <Text bold color={isLan ? UI_COLORS.activeGreen : UI_COLORS.activeBlue}>
          {isLan ? 'LAN LOBBY' : 'ONLINE LOBBY'}
        </Text>
        <Text color={UI_COLORS.dimText}>
          PLAYER{' '}
          <Text bold color={UI_COLORS.goldHighlight}>
            {playerName || 'Anonymous'}
          </Text>
        </Text>
      </Box>
      <Text color={UI_COLORS.mutedText}>
        {isLan ? `Server  ${serverLabel}` : 'Browse available rooms'}
      </Text>
      {lastError && (
        <Box marginTop={1}>
          <Text color={UI_COLORS.errorRed} wrap="truncate-end">
            {lastError}
          </Text>
        </Box>
      )}
    </Box>
  );
}
