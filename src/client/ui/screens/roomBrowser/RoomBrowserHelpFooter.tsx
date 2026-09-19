import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';

export function RoomBrowserHelpFooter({
  isEnteringCode = false,
}: {
  readonly isEnteringCode?: boolean;
}) {
  return (
    <Box flexDirection="row" justifyContent="center" marginTop={1} gap={1}>
      {isEnteringCode ? (
        <>
          <Text color={UI_COLORS.mutedText}>
            <Text color={UI_COLORS.white}>[ ENTER ]</Text> Join
          </Text>
          <Text color={UI_COLORS.mutedText}>•</Text>
          <Text color={UI_COLORS.mutedText}>
            <Text color={UI_COLORS.white}>[ N ]</Text> Change Name
          </Text>
          <Text color={UI_COLORS.mutedText}>•</Text>
          <Text color={UI_COLORS.mutedText}>
            <Text color={UI_COLORS.white}>[ ESC ]</Text> Back
          </Text>
        </>
      ) : (
        <>
      <Text color={UI_COLORS.mutedText}>
        <Text color={UI_COLORS.white}>[ ↑/↓ ]</Text> Select
      </Text>
      <Text color={UI_COLORS.mutedText}>•</Text>
      <Text color={UI_COLORS.mutedText}>
        <Text color={UI_COLORS.white}>[ ENTER ]</Text> Join
      </Text>
      <Text color={UI_COLORS.mutedText}>•</Text>
      <Text color={UI_COLORS.mutedText}>
        <Text color={UI_COLORS.white}>[ N ]</Text> Change Name
      </Text>
      <Text color={UI_COLORS.mutedText}>•</Text>
      <Text color={UI_COLORS.mutedText}>
        <Text color={UI_COLORS.white}>[ C ]</Text> Code
      </Text>
      <Text color={UI_COLORS.mutedText}>•</Text>
      <Text color={UI_COLORS.mutedText}>
        <Text color={UI_COLORS.white}>[ ESC ]</Text> Back
      </Text>
        </>
      )}
    </Box>
  );
}
