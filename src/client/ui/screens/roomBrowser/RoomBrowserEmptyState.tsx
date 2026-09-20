import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';

export function RoomBrowserEmptyState() {
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" width="100%">
      <Box marginBottom={1}>
        <Text color={UI_COLORS.suitSpade}>♠</Text>
        <Text> </Text>
        <Text color={UI_COLORS.suitHeart}>♥</Text>
        <Text> </Text>
        <Text color={UI_COLORS.suitDiamond}>♦</Text>
        <Text> </Text>
        <Text color={UI_COLORS.suitClub}>♣</Text>
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
