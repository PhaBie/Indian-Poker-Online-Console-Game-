import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';
import type { UsernameCardHeaderProps } from './types';

export function UsernameCardHeader({
  networkMode = 'LAN',
  intent = 'create',
}: UsernameCardHeaderProps = {}) {
  const isLan = networkMode === 'LAN';
  const badgeColor = isLan ? UI_COLORS.activeGreen : UI_COLORS.activeBlue;
  const badgeLabel = isLan ? '[LAN MODE]' : '[ONLINE MODE]';
  const actionText =
    intent === 'create'
      ? 'Enter alias to host your table'
      : 'Enter alias to join the table';

  return (
    <Box flexDirection="column" alignItems="center" marginBottom={1}>
      <Box flexDirection="row" alignItems="center">
        <Text bold color={badgeColor}>
          {badgeLabel}
        </Text>
        <Text color={UI_COLORS.mutedText}> {actionText}</Text>
      </Box>
    </Box>
  );
}
