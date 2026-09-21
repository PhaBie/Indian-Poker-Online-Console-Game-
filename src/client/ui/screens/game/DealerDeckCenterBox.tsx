import { Box, Text } from 'ink';

export interface DealerDeckCenterBoxProps {
  readonly elapsedMs: number;
}

const SHUFFLE_PATTERNS = [
  '[♠]  ·   ·   · ',
  ' ·  [♥]  ·   · ',
  ' ·   ·  [♦]  · ',
  ' ·   ·   ·  [♣]',
] as const;

function ShuffleDeckContent({ elapsedMs }: { readonly elapsedMs: number }) {
  const patternIndex = Math.floor(elapsedMs / 250) % SHUFFLE_PATTERNS.length;
  const currentPattern = SHUFFLE_PATTERNS[patternIndex];

  return (
    <>
      <Text color="cyanBright" bold>
        DEALER DECK
      </Text>
      <Text color="cyan" bold>
        {currentPattern}
      </Text>
      <Text color="gray">SHUFFLING...</Text>
    </>
  );
}

function DealingCardContent({ currentCardNum }: { readonly currentCardNum: number }) {
  return (
    <>
      <Text color="cyanBright" bold>
        DEALING CARDS
      </Text>
      <Text color="yellowBright" bold>
        [CARD {currentCardNum}/3]
      </Text>
      <Box flexDirection="row">
        <Text color="cyanBright">{'●  '.repeat(currentCardNum)}</Text>
        <Text color="gray">{'○  '.repeat(3 - currentCardNum)}</Text>
      </Box>
    </>
  );
}

function resolveCenterBoxContent(elapsedMs: number) {
  if (elapsedMs < 1000) {
    return {
      borderColor: 'cyanBright',
      content: <ShuffleDeckContent elapsedMs={elapsedMs} />,
    };
  }
  const currentCardNum = elapsedMs < 2000 ? 1 : elapsedMs < 3000 ? 2 : 3;
  return {
    borderColor: 'cyanBright',
    content: <DealingCardContent currentCardNum={currentCardNum} />,
  };
}

export function DealerDeckCenterBox({ elapsedMs }: DealerDeckCenterBoxProps) {
  const { borderColor, content } = resolveCenterBoxContent(elapsedMs);

  return (
    <Box
      borderStyle="round"
      borderColor={borderColor}
      width={19}
      height={5}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      {content}
    </Box>
  );
}
