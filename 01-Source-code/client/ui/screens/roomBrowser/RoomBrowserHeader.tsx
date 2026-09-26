import { Box, Text } from 'ink';
import { UI_COLORS } from '../../shared/theme/colors';
import { ROOM_BROWSER_CONTENT_WIDTH } from './RoomBrowserTableHeader';

interface RoomBrowserHeaderProps {
  readonly playerName: string;
  readonly networkMode?: 'LAN' | 'INTERNET';
  readonly lastError?: string | null;
}

export function RoomBrowserHeader({
  playerName,
  networkMode = 'LAN',
  lastError,
}: RoomBrowserHeaderProps) {
  return (
    <Box flexDirection="column" width={ROOM_BROWSER_CONTENT_WIDTH} alignSelf="center">
      <Box justifyContent="space-between">
        <Text
          bold
          color={networkMode === 'LAN' ? UI_COLORS.activeGreen : UI_COLORS.activeBlue}
        >
          {networkMode === 'LAN' ? 'LAN LOBBY' : 'ONLINE LOBBY'}
        </Text>
        <Text color={UI_COLORS.dimText}>
          PLAYER{' '}
          <Text bold color={UI_COLORS.goldHighlight}>
            {playerName || 'Anonymous'}
          </Text>
        </Text>
      </Box>
      <Box marginTop={1} height={1} width="100%" justifyContent="center" flexShrink={0}>
        {lastError && (
          <Text color={UI_COLORS.errorRed} wrap="truncate-end">
            [!] {lastError}
          </Text>
        )}
      </Box>
    </Box>
  );
}
