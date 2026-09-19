import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { UI_COLORS } from '../../theme/colors';

interface WaitingRoomCardHeaderProps {
  readonly roomId: string | null;
  readonly playerCount: number;
  readonly maxPlayers: number;
  readonly isLan: boolean;
  readonly errorMessage: string | null;
}

export function WaitingRoomCardHeader({
  roomId,
  playerCount,
  maxPlayers,
  isLan,
  errorMessage,
}: WaitingRoomCardHeaderProps) {
  return (
    <Box flexDirection="column" width="100%" marginBottom={1}>
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text bold color={isLan ? UI_COLORS.activeGreen : UI_COLORS.activeBlue}>
            {isLan ? '[LAN MODE]' : '[ONLINE MODE]'}
          </Text>
          <Text bold color={UI_COLORS.goldHighlight}>
            [TABLE: #{roomId ?? '----'}]
          </Text>
        </Box>
        <Box flexDirection="row" alignItems="center">
          <Text color={UI_COLORS.activeBlue}>
            <Spinner type="dots" />
          </Text>
          <Text color={UI_COLORS.primaryText}> Waiting for players </Text>
          <Text bold color={UI_COLORS.goldHighlight}>
            ({playerCount}/{maxPlayers})
          </Text>
        </Box>
      </Box>

      {errorMessage && (
        <Box marginTop={1} justifyContent="center">
          <Text color={UI_COLORS.errorRed} bold>
            ✕ {errorMessage}
          </Text>
        </Box>
      )}
    </Box>
  );
}
