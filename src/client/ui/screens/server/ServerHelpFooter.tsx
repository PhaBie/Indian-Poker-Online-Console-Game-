import { Box, Text } from 'ink';
import { UI_COLORS } from '../../shared/theme/colors';
import type { ServerConnectionMode } from './types';

interface ServerHelpFooterProps {
  readonly mode: ServerConnectionMode;
}

export function ServerHelpFooter({ mode }: ServerHelpFooterProps) {
  if (mode === 'INPUT_IP') {
    return (
      <Box justifyContent="center" marginTop={1}>
        <Text color={UI_COLORS.mutedText}>
          Press <Text color={UI_COLORS.white}>[ ENTER ]</Text> to Connect •{' '}
          <Text color={UI_COLORS.white}>[ ESC ]</Text> to Cancel
        </Text>
      </Box>
    );
  }

  return (
    <Box justifyContent="center" marginTop={1}>
      <Text color={UI_COLORS.mutedText}>
        Press <Text color={UI_COLORS.white}>[ 1 ]</Text> Change IP •{' '}
        <Text color={UI_COLORS.white}>[ 2 / R ]</Text> Retry •{' '}
        <Text color={UI_COLORS.white}>[ ESC ]</Text> Back to Menu
      </Text>
    </Box>
  );
}
