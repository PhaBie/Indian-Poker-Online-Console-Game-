import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';

export function RoomBrowserHelpFooter({
  isEnteringCode = false,
}: {
  readonly isEnteringCode?: boolean;
}) {
  return (
    <Box justifyContent="center" marginTop={1}>
      <Text color={UI_COLORS.mutedText}>
        {isEnteringCode
          ? 'ENTER Join  •  N Name  •  ESC Back'
          : '↑/↓ Select  •  ENTER Join  •  N Name  •  C Code  •  ESC Back'}
      </Text>
    </Box>
  );
}
