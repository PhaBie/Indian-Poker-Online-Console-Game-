import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';
import type { CreateRoomCardProps } from './types';

function CreateRoomCardHeader() {
  return (
    <Box flexDirection="column" alignItems="center" marginBottom={1}>
      <Text bold color={UI_COLORS.goldBorder}>
        ♠ ♥ ♦ ♣ CREATE ROOM ♣ ♦ ♥ ♠
      </Text>
      <Box marginTop={1}>
        <Text color={UI_COLORS.mutedText}>Select connection mode to host your table</Text>
      </Box>
    </Box>
  );
}

export function CreateRoomHelpFooter() {
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

export function CreateRoomCard({
  selectedMode,
  isSubmitting,
  paddingX,
}: CreateRoomCardProps) {
  const isLanSelected = selectedMode === 'LAN';

  return (
    <Box
      width="100%"
      borderStyle="round"
      borderColor={UI_COLORS.menuBorder}
      flexDirection="column"
      paddingX={paddingX}
      paddingY={1}
    >
      <CreateRoomCardHeader />
      <Box flexDirection="column" marginY={1} paddingX={2}>
        <Box marginY={0}>
          <Text bold color={isLanSelected ? UI_COLORS.goldHighlight : UI_COLORS.dimText}>
            {isLanSelected ? '> ' : '  '}[1] LAN Mode
          </Text>
          <Text color={UI_COLORS.mutedText}> (Local WiFi)</Text>
        </Box>
        <Box marginY={0} marginTop={1}>
          <Text bold color={!isLanSelected ? UI_COLORS.goldHighlight : UI_COLORS.dimText}>
            {!isLanSelected ? '> ' : '  '}[2] Online Mode
          </Text>
          <Text color={UI_COLORS.mutedText}> (Internet / Ngrok)</Text>
        </Box>
      </Box>
      <Box justifyContent="center" marginTop={1}>
        <Text color={isSubmitting ? UI_COLORS.activeGreen : UI_COLORS.mutedText}>
          {isSubmitting
            ? '● Creating room on server...'
            : 'Press 1 or 2, or use arrows + ENTER'}
        </Text>
      </Box>
    </Box>
  );
}
