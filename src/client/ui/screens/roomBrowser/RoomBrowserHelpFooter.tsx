import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';

export function RoomBrowserHelpFooter() {
  return (
    <Box justifyContent="center" marginTop={1}>
      <Text color={UI_COLORS.mutedText}>
        <Text color={UI_COLORS.white}>[ ↑ / ↓ ]</Text> Select •{' '}
        <Text color={UI_COLORS.white}>[ ENTER ]</Text> Join •{' '}
        <Text color={UI_COLORS.white}>[ C ]</Text> Create Table •{' '}
        <Text color={UI_COLORS.white}>[ R ]</Text> Refresh •{' '}
        <Text color={UI_COLORS.white}>[ ESC ]</Text> Back
      </Text>
    </Box>
  );
}
