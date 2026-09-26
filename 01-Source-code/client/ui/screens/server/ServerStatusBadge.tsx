import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { UI_COLORS } from '../../shared/theme/colors';

interface ServerStatusBadgeProps {
  readonly isConnecting: boolean;
  readonly isConnected: boolean;
  readonly serverUrl: string;
}

export function ServerStatusBadge({
  isConnecting,
  isConnected,
  serverUrl,
}: ServerStatusBadgeProps) {
  if (isConnecting) {
    return (
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        <Text color={UI_COLORS.activeBlue}>
          <Spinner type="dots" />
        </Text>
        <Text color={UI_COLORS.activeBlue} bold>
          {' '}
          Connecting to {serverUrl}...
        </Text>
      </Box>
    );
  }

  if (isConnected) {
    return (
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        <Text color={UI_COLORS.activeGreen} bold>
          [ ● SERVER ONLINE ]
        </Text>
        <Text color={UI_COLORS.primaryText}> Connected to {serverUrl}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="row" alignItems="center" marginBottom={1}>
      <Text color={UI_COLORS.errorRed} bold>
        [ ✕ SERVER OFFLINE ]
      </Text>
      <Text color={UI_COLORS.mutedText}> Cannot reach {serverUrl}</Text>
    </Box>
  );
}
