import { Box, Text } from 'ink';
import type { CardViewProps } from './types';
import { formatCardRank, getCardSuitSymbol, getCardSuitColor } from './gameLayoutHelpers';
import { UI_COLORS } from '../../shared/theme/colors';

export const CARD_WIDTH = 7;
export const CARD_HEIGHT = 3;

function HiddenCardBox({
  hiddenBorderColor = UI_COLORS.cardBack,
}: Pick<CardViewProps, 'hiddenBorderColor'>) {
  return (
    <Box
      borderStyle="single"
      borderColor={hiddenBorderColor}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      justifyContent="center"
      alignItems="center"
    >
      <Text color={UI_COLORS.cardBack}>♠</Text>
    </Box>
  );
}

export function CardView({ card, isHidden = false, hiddenBorderColor }: CardViewProps) {
  if (isHidden) {
    return <HiddenCardBox hiddenBorderColor={hiddenBorderColor} />;
  }

  if (!card) {
    return (
      <Box
        borderStyle="single"
        borderColor={UI_COLORS.cardEmpty}
        paddingX={0}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        justifyContent="center"
        alignItems="center"
      >
        <Text color={UI_COLORS.cardEmpty}>·</Text>
      </Box>
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
