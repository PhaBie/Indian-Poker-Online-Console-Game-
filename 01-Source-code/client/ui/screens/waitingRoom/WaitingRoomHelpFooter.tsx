import { Box, Text } from 'ink';
import { UI_COLORS } from '../../shared/theme/colors';

interface WaitingRoomHelpFooterProps {
  readonly isHost: boolean;
}

export function WaitingRoomHelpFooter({ isHost }: WaitingRoomHelpFooterProps) {
  if (isHost) {
    return (
      <Box justifyContent="center" marginTop={1}>
        <Text color={UI_COLORS.mutedText}>
          <Text color={UI_COLORS.white}>[ S ]</Text> Start Game •{' '}
          <Text color={UI_COLORS.white}>[ R ]</Text> Ready / Unready •{' '}
          <Text color={UI_COLORS.white}>[ ESC / L ]</Text> Leave Table
        </Text>
      </Box>
    );
  }

  return (
    <Box justifyContent="center" marginTop={1}>
      <Text color={UI_COLORS.mutedText}>
        <Text color={UI_COLORS.white}>[ R ]</Text> Ready / Unready •{' '}
        <Text color={UI_COLORS.white}>[ ESC / L ]</Text> Leave Table
      </Text>
    </Box>
  );
}
