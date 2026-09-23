import { Box, Text } from 'ink';
import { UI_COLORS } from '../../shared/theme/colors';
import { MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH } from '../../hooks/useUsernameInput';
import type { UsernameStatusMessageProps } from './types';

export function UsernameStatusMessage({
  errorMessage,
  isLengthValid,
  characterCount,
}: UsernameStatusMessageProps) {
  if (errorMessage) {
    return (
      <Box marginTop={1} justifyContent="center">
        <Text bold color={UI_COLORS.errorRed}>
          ✕ {errorMessage}
        </Text>
      </Box>
    );
  }

  if (isLengthValid) {
    return (
      <Box marginTop={1} justifyContent="center">
        <Text color={UI_COLORS.activeGreen}>✓ Valid alias - Press ENTER to continue</Text>
      </Box>
    );
  }

  return (
    <Box marginTop={1} justifyContent="center">
      <Text color={characterCount === 0 ? UI_COLORS.mutedText : UI_COLORS.warningYellow}>
        Alias requires {MIN_USERNAME_LENGTH}-{MAX_USERNAME_LENGTH} characters
      </Text>
    </Box>
  );
}
