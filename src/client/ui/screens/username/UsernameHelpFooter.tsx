import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';

export function UsernameHelpFooter() {
  return (
    <Box justifyContent="center" marginTop={1} flexDirection="row">
      <Box marginRight={4}>
        <Text>
          <Text bold color={UI_COLORS.goldBorder}>
            ENTER
          </Text>
          <Text color={UI_COLORS.mutedText}> Confirm</Text>
        </Text>
      </Box>
      <Box>
        <Text>
          <Text bold color={UI_COLORS.goldBorder}>
            ESC
          </Text>
          <Text color={UI_COLORS.mutedText}> Back to Menu</Text>
        </Text>
      </Box>
    </Box>
  );
}
