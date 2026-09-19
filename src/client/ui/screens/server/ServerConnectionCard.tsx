import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';
import { ServerStatusBadge } from './ServerStatusBadge';
import { ServerIpInputField } from './ServerIpInputField';
import type { ServerConnectionMode } from './types';

interface ServerConnectionCardProps {
  readonly mode: ServerConnectionMode;
  readonly serverUrl: string;
  readonly isConnected: boolean;
  readonly isConnecting: boolean;
  readonly ipInput: string;
  readonly onIpChange: (val: string) => void;
  readonly onIpSubmit: () => void;
  readonly paddingX: number;
}

export function ServerConnectionCard({
  mode,
  serverUrl,
  isConnected,
  isConnecting,
  ipInput,
  onIpChange,
  onIpSubmit,
  paddingX,
}: ServerConnectionCardProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isConnected ? UI_COLORS.activeGreen : UI_COLORS.goldBorder}
      paddingX={paddingX}
      paddingY={1}
      width="100%"
    >
      <ServerStatusBadge
        isConnecting={isConnecting}
        isConnected={isConnected}
        serverUrl={serverUrl}
      />

      {mode === 'INPUT_IP' ? (
        <ServerIpInputField
          ipValue={ipInput}
          onChange={onIpChange}
          onSubmit={onIpSubmit}
        />
      ) : (
        <Box flexDirection="column" marginY={1}>
          <Text color={UI_COLORS.primaryText}>
            <Text bold color={UI_COLORS.goldHighlight}>
              [ 1 ]
            </Text>{' '}
            Connect to Another Server IP (Friend's PC)
          </Text>
          <Text color={UI_COLORS.primaryText}>
            <Text bold color={UI_COLORS.goldHighlight}>
              [ 2 ]
            </Text>{' '}
            Retry Connection to {serverUrl}
          </Text>
        </Box>
      )}
    </Box>
  );
}
