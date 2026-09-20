import { Box, Text } from 'ink';
import type { CardViewProps } from './types';
import { formatCardRank, getCardSuitSymbol, getCardSuitColor } from './gameLayoutHelpers';

export const CARD_WIDTH = 7;
export const CARD_HEIGHT = 3;

function HiddenCardBox() {
  return (
    <Box
      borderStyle="single"
      borderColor="magenta"
      paddingX={1}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      justifyContent="center"
      alignItems="center"
    >
      <Text color="magenta">♠</Text>
    </Box>
  );
}

export function CardView({ card, isHidden = false }: CardViewProps) {
  if (isHidden) {
    return <HiddenCardBox />;
  }

  if (!card) {
    return (
      <Box
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
      />
    );
  }

  const cardColor = getCardSuitColor(card.suit);
  const suitSymbol = getCardSuitSymbol(card.suit);
  const rankLabel = formatCardRank(card.rank);

  return (
    <Box
      borderStyle="single"
      borderColor={cardColor}
      paddingX={0}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Text color={cardColor}>
        {rankLabel}
        {suitSymbol}
      </Text>
    </Box>
  );
}
