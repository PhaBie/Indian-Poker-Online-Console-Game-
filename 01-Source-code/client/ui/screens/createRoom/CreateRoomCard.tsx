import { Box, Text } from 'ink';
import { UI_COLORS } from '../../shared/theme/colors';
import type { CreateRoomCardProps, RoomMaxPlayers } from './types';
import { useArrowMotion } from './useArrowMotion';

function CreateRoomCardHeader() {
  return (
    <Box flexDirection="column" alignItems="center" marginBottom={1}>
      <Text color={UI_COLORS.mutedText}>Select connection mode to host your table</Text>
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

function RoomSettingsCardContent({
  maxPlayers,
  arrowGlyph,
  isGliding,
}: {
  readonly maxPlayers: RoomMaxPlayers;
  readonly arrowGlyph: string;
  readonly isGliding: boolean;
}) {
  const getTableSizeColor = (count: number): string => {
    if (count === 2) return UI_COLORS.activeBlue;
    if (count === 3) return UI_COLORS.goldHighlight;
    return UI_COLORS.activeGreen;
  };

  return (
    <>
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Text color={UI_COLORS.mutedText}>Select table size</Text>
      </Box>
      <Box flexDirection="column" marginY={1} width={46}>
        {[2, 3, 4].map((count) => {
          const isSelected = count === maxPlayers;
          return (
            <Box key={count} marginTop={count === 2 ? 0 : 1}>
              <NetworkOptionRow
                numericChoice={String(count)}
                title={`${count} Players`}
                description={`${count}-player table only`}
                isSelected={isSelected}
                isSubmitting={false}
                arrowGlyph={arrowGlyph}
                isGliding={isGliding}
                activeColor={getTableSizeColor(count)}
              />
            </Box>
          );
        })}
      </Box>
    </>
  );
}

export function CreateRoomCard({
  step,
  selectedMode,
  maxPlayers,
  isSubmitting,
  paddingX,
}: CreateRoomCardProps) {
  const focusedIndex =
    step === 'mode' ? (selectedMode === 'LAN' ? 0 : 1) : maxPlayers - 2;
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
      {step === 'mode' ? (
        <>
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
                description="Shared online server"
                isSelected={selectedMode === 'INTERNET'}
                isSubmitting={isSubmitting}
                arrowGlyph={glyph}
                isGliding={isGliding}
                activeColor={UI_COLORS.activeBlue}
              />
            </Box>
          </Box>
        </>
      ) : (
        <RoomSettingsCardContent
          maxPlayers={maxPlayers}
          arrowGlyph={glyph}
          isGliding={isGliding}
        />
      )}
    </Box>
  );
}
