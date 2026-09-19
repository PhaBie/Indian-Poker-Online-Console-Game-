import { Box, Text } from 'ink';
import { UI_COLORS } from '../../theme/colors';
import type { CreateRoomCardProps } from './types';
import { useArrowMotion } from './useArrowMotion';

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

interface NetworkOptionRowProps {
  readonly numericChoice: string;
  readonly title: string;
  readonly description: string;
  readonly isSelected: boolean;
  readonly isSubmitting: boolean;
  readonly arrowGlyph: string;
  readonly isGliding: boolean;
  readonly activeColor: string;
}

function NetworkOptionRow({
  numericChoice,
  title,
  description,
  isSelected,
  isSubmitting,
  arrowGlyph,
  isGliding,
  activeColor,
}: NetworkOptionRowProps) {
  const displayedArrow = isSelected ? arrowGlyph.padEnd(4, ' ') : '    ';
  const arrowColor = isGliding ? UI_COLORS.goldHighlight : activeColor;
  const titleColor = isSelected ? activeColor : UI_COLORS.inactiveTitle;
  const descriptionColor = isSelected ? UI_COLORS.primaryText : UI_COLORS.inactiveDesc;

  return (
    <Box flexDirection="row" alignItems="center" marginY={0}>
      <Box width={4}>
        <Text bold={isSelected} color={arrowColor}>
          {displayedArrow}
        </Text>
      </Box>
      <Box width={18}>
        <Text bold={isSelected} color={titleColor}>
          [{numericChoice}] {title}
        </Text>
      </Box>
      <Box>
        <Text color={descriptionColor}>
          {isSelected && isSubmitting ? '● Connecting...' : description}
        </Text>
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
            UP/DOWN
          </Text>
          <Text color={UI_COLORS.mutedText}> Navigate</Text>
        </Text>
      </Box>
      <Box marginRight={4}>
        <Text>
          <Text bold color={UI_COLORS.goldBorder}>
            ENTER
          </Text>
          <Text color={UI_COLORS.mutedText}> Select</Text>
        </Text>
      </Box>
      <Box>
        <Text>
          <Text bold color={UI_COLORS.goldBorder}>
            ESC
          </Text>
          <Text color={UI_COLORS.mutedText}> Back</Text>
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
  const focusedIndex = selectedMode === 'LAN' ? 0 : 1;
  const { glyph, isGliding } = useArrowMotion(focusedIndex);

  return (
    <Box
      width="100%"
      borderStyle="round"
      borderColor={UI_COLORS.menuBorder}
      flexDirection="column"
      alignItems="center"
      paddingX={paddingX}
      paddingY={1}
    >
      <CreateRoomCardHeader />

      <Box flexDirection="column" marginY={1} width={46}>
        <NetworkOptionRow
          numericChoice="1"
          title="LAN Mode"
          description="Local WiFi (Host IPv4)"
          isSelected={selectedMode === 'LAN'}
          isSubmitting={isSubmitting}
          arrowGlyph={glyph}
          isGliding={isGliding}
          activeColor={UI_COLORS.activeGreen}
        />
        <Box marginTop={1}>
          <NetworkOptionRow
            numericChoice="2"
            title="Online Mode"
            description="Internet (Ngrok Relay)"
            isSelected={selectedMode === 'INTERNET'}
            isSubmitting={isSubmitting}
            arrowGlyph={glyph}
            isGliding={isGliding}
            activeColor={UI_COLORS.activeBlue}
          />
        </Box>
      </Box>
    </Box>
  );
}
