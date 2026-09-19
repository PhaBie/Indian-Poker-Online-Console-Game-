import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';

export function RoomBrowserEmptyState() {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      paddingY={2}
      width="100%"
    >
      <Box marginBottom={1}>
        <Text color={UI_COLORS.suitSpade}>♠</Text>
        <Text>  </Text>
        <Text color={UI_COLORS.suitHeart}>♥</Text>
        <Text>  </Text>
        <Text color={UI_COLORS.suitDiamond}>♦</Text>
        <Text>  </Text>
        <Text color={UI_COLORS.suitClub}>♣</Text>
      </Box>

      <Text bold color={UI_COLORS.primaryText}>
        No active rooms found on this server
      </Text>

      <Box marginTop={1}>
        <Text color={UI_COLORS.dimText}>
          Be the first to open a room and start playing!
        </Text>
      </Box>
    </Box>
  );
}
