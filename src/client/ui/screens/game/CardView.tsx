import { Box, Text } from 'ink';
import type { CardViewProps } from './types';
import { formatCardRank, getCardSuitSymbol, getCardSuitColor } from './gameLayoutHelpers';

function HiddenCardBox() {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      marginX={0.5}
      width={5}
      height={3}
      justifyContent="center"
      alignItems="center"
    >
      <Text color="gray">?</Text>
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
        marginX={0.5}
        width={5}
        height={3}
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
      marginX={0.5}
      width={5}
      height={3}
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
