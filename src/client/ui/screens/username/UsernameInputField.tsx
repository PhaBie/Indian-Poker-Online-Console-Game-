import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { UI_COLORS } from '../../theme/colors';
import { MAX_USERNAME_LENGTH } from '../../hooks/useUsernameInput';
import type { UsernameInputFieldProps } from './types';

export function UsernameInputField({
  rawInput,
  characterCount,
  isLengthValid,
  hasError,
  onInputChange,
  onInputSubmit,
}: UsernameInputFieldProps) {
  const borderColor = hasError
    ? UI_COLORS.errorRed
    : isLengthValid
      ? UI_COLORS.activeGreen
      : UI_COLORS.goldBorder;

  const countColor = hasError
    ? UI_COLORS.errorRed
    : isLengthValid
      ? UI_COLORS.activeGreen
      : UI_COLORS.mutedText;

  return (
    <Box
      borderStyle="round"
      borderColor={borderColor}
      paddingX={2}
      paddingY={1}
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      width="100%"
    >
      <Box flexDirection="row" alignItems="center" flexGrow={1}>
        <Text bold color={UI_COLORS.goldHighlight}>
          &gt;{' '}
        </Text>
        <TextInput
          value={rawInput}
          placeholder="e.g. Maverick"
          onChange={onInputChange}
          onSubmit={onInputSubmit}
        />
      </Box>
      <Box marginLeft={2}>
        <Text bold color={countColor}>
          [{characterCount}/{MAX_USERNAME_LENGTH}]
        </Text>
      </Box>
    </Box>
  );
}
