import { Box, Text } from 'ink';

export interface DealerDeckCenterBoxProps {
  readonly elapsedMs: number;
}

const DECK_SUIT_ICONS = ['♠', '♥', '♦', '♣'] as const;
const DECK_SUIT_COLORS = [
  'cyanBright',
  'redBright',
  'yellowBright',
  'blueBright',
] as const;

export function DealerDeckCenterBox({ elapsedMs }: DealerDeckCenterBoxProps) {
  const activeIconIndex = Math.floor(elapsedMs / 120) % DECK_SUIT_ICONS.length;

  return (
    <Box
      borderStyle="round"
      borderColor="cyanBright"
      width={19}
      height={5}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Text color="cyanBright" bold>
        DEALING
      </Text>
      <Box flexDirection="row">
        {DECK_SUIT_ICONS.map((suit, index) => {
          const isHighlighted = index === activeIconIndex;
          const color = isHighlighted ? 'white' : DECK_SUIT_COLORS[index];
          return (
            <Text key={suit} color={color} bold={isHighlighted}>
              {suit}
              {index < DECK_SUIT_ICONS.length - 1 ? '   ' : ''}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
}
