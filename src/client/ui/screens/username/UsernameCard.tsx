import { Box } from 'ink';
import { UI_COLORS } from '../../theme/colors';
import type { UsernameCardProps } from './types';
import { UsernameCardHeader } from './UsernameCardHeader';
import { UsernameInputField } from './UsernameInputField';
import { UsernameStatusMessage } from './UsernameStatusMessage';

export function UsernameCard({
  paddingX,
  rawInput,
  characterCount,
  isLengthValid,
  errorMessage,
  onInputChange,
  onInputSubmit,
  networkMode,
  intent,
}: UsernameCardProps) {
  const hasError = Boolean(errorMessage);

  return (
    <Box
      width="100%"
      borderStyle="round"
      borderColor={UI_COLORS.menuBorder}
      flexDirection="column"
      paddingX={paddingX}
      paddingY={1}
      marginY={0}
    >
      <UsernameCardHeader networkMode={networkMode} intent={intent} />
      <UsernameInputField
        rawInput={rawInput}
        characterCount={characterCount}
        isLengthValid={isLengthValid}
        hasError={hasError}
        onInputChange={onInputChange}
        onInputSubmit={onInputSubmit}
      />
      <UsernameStatusMessage
        errorMessage={errorMessage}
        isLengthValid={isLengthValid}
        characterCount={characterCount}
      />
    </Box>
  );
}
