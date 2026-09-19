import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';

export function UsernameCardHeader() {
  return (
    <Box flexDirection="column" alignItems="center" marginBottom={1}>
      <Text color={UI_COLORS.mutedText}>
        Enter your alias to take a seat at the table
      </Text>
    </Box>
  );
}
