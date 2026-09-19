import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';

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
    <Box flexDirection="column" alignItems="center" marginBottom={1}>
      <Box flexDirection="row" gap={1}>
        <Text bold color={UI_COLORS.activeGreen}>
          [LAN MODE]
        </Text>
        <Text bold color={UI_COLORS.activeBlue}>
          [SERVER: {serverUrl}]
        </Text>
        <Text bold color={UI_COLORS.goldHighlight}>
          [PLAYER: {playerName || 'Anonymous'}]
        </Text>
      </Box>
      {lastError && (
        <Box marginTop={1}>
          <Text color={UI_COLORS.errorRed} bold>
            ✕ {lastError}
          </Text>
        </Box>
      )}
    </Box>
  );
}
