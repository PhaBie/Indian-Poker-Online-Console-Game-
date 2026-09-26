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
const SHUFFLE_DURATION_MS = 1_000;
const CARD_DEAL_INTERVAL_MS = 1_000;

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
  if (elapsedMs < SHUFFLE_DURATION_MS) {
    return {
      borderColor: 'cyanBright',
      content: <ShuffleDeckContent elapsedMs={elapsedMs} />,
    };
  }
  const currentCardNum =
    elapsedMs < SHUFFLE_DURATION_MS + CARD_DEAL_INTERVAL_MS
      ? 1
      : elapsedMs < SHUFFLE_DURATION_MS + CARD_DEAL_INTERVAL_MS * 2
        ? 2
        : 3;
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
