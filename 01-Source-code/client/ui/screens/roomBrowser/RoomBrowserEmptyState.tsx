import { Box, Text } from 'ink';
import { UI_COLORS } from '../../shared/theme/colors';

export function RoomBrowserEmptyState() {
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" width="100%">
      <Box marginBottom={1}>
        <Text color={UI_COLORS.cardDarkSuitForeground}>♠</Text>
        <Text> </Text>
        <Text color={UI_COLORS.cardRedSuit}>♥</Text>
        <Text> </Text>
        <Text color={UI_COLORS.cardRedSuit}>♦</Text>
        <Text> </Text>
        <Text color={UI_COLORS.cardDarkSuitForeground}>♣</Text>
      </Box>

      <Text bold color={UI_COLORS.primaryText}>
        NO OPEN TABLES YET
      </Text>

      <Box marginTop={1}>
        <Text color={UI_COLORS.dimText}>Create a room to start the next game.</Text>
      </Box>
    </Box>
  );
}
