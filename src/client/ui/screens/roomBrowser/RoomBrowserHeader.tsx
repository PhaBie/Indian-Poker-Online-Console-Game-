import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';
import { ROOM_BROWSER_CONTENT_WIDTH } from './RoomBrowserTableHeader';

interface RoomBrowserHeaderProps {
  readonly serverUrl: string;
  readonly playerName: string;
  readonly lastError?: string | null;
}

export function RoomBrowserHeader({
  serverUrl,
  playerName,
  lastError,
}: RoomBrowserHeaderProps) {
  return (
    <Box flexDirection="column" width={ROOM_BROWSER_CONTENT_WIDTH} alignSelf="center">
      <Box flexDirection="row" width="100%" justifyContent="space-between" marginBottom={2}>
        <Box flexDirection="row" gap={2} alignItems="center">
          <Text bold color={UI_COLORS.activeGreen}>[ LAN MODE ]</Text>
          <Text color={UI_COLORS.dimText}>SERVER</Text>
          <Text bold color={UI_COLORS.activeBlue}>{serverUrl}</Text>
        </Box>
        <Box marginX={2}>
          <Text color={UI_COLORS.mutedText}>│</Text>
        </Box>
        <Box flexDirection="row" gap={1} alignItems="center">
          <Text color={UI_COLORS.dimText}>PLAYER</Text>
          <Text bold color={UI_COLORS.goldHighlight}>{playerName || 'Anonymous'}</Text>
        </Box>
      </Box>

      {lastError && (
        <Box justifyContent="center" marginBottom={1}>
          <Text color={UI_COLORS.errorRed} bold>✕ {lastError}</Text>
        </Box>
      )}
    </Box>
  );
}
