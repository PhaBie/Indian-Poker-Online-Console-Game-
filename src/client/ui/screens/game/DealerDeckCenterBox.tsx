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

function CardGlowPhaseContent() {
  return (
    <>
      <Text color="magentaBright" bold>
        CARD SLOTS
      </Text>
      <Text color="yellowBright" bold>
        ⚡ ACTIVATING ⚡
      </Text>
      <Text color="magenta">GLOW SWEEP</Text>
    </>
  );
}

function SeatRouletteContent({ elapsedMs }: { readonly elapsedMs: number }) {
  const dicePatterns = ['🎲 ⚀ ⚁ ⚂', '🎲 ⚂ ⚃ ⚄', '🎲 ⚄ ⚅ ⚀', '🎲 ⚁ ⚃ ⚅'];
  const index = Math.floor(elapsedMs / 150) % dicePatterns.length;

  return (
    <>
      <Text color="yellowBright" bold>
        SEAT ROULETTE
      </Text>
      <Text color="cyanBright" bold>
        {dicePatterns[index]}
      </Text>
      <Text color="yellow">SPINNING...</Text>
    </>
  );
}

function SeatsSettledContent() {
  return (
    <>
      <Text color="greenBright" bold>
        SEATS LOCKED
      </Text>
      <Text color="cyanBright" bold>
        [ READY ]
      </Text>
      <Text color="gray">TAKING SEATS</Text>
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
  if (elapsedMs < 4000) {
    const currentCardNum = elapsedMs < 2000 ? 1 : elapsedMs < 3000 ? 2 : 3;
    return {
      borderColor: 'cyanBright',
      content: <DealingCardContent currentCardNum={currentCardNum} />,
    };
  }
  if (elapsedMs < 4800) {
    return {
      borderColor: 'magentaBright',
      content: <CardGlowPhaseContent />,
    };
  }
  if (elapsedMs < 8800) {
    return {
      borderColor: 'yellowBright',
      content: <SeatRouletteContent elapsedMs={elapsedMs} />,
    };
  }
  return {
    borderColor: 'greenBright',
    content: <SeatsSettledContent />,
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
