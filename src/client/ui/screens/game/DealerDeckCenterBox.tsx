import { Box, Text } from 'ink';
import { getEntranceMilestones } from './useTableEntranceAnimation';

export interface DealerDeckCenterBoxProps {
  readonly elapsedMs: number;
  readonly playerCount?: number;
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

function PlayerHonorContent() {
  return (
    <>
      <Text color="magentaBright" bold>
        HONORING SEATS
      </Text>
      <Text color="yellowBright" bold>
        ⚡ GLOW SWEEP ⚡
      </Text>
      <Text color="cyanBright">PLAYERS READY</Text>
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

function resolveCenterBoxContent(elapsedMs: number, playerCount: number = 4) {
  const milestones = getEntranceMilestones(playerCount);

  if (elapsedMs < milestones.card1Ms) {
    return {
      borderColor: 'cyanBright',
      content: <ShuffleDeckContent elapsedMs={elapsedMs} />,
    };
  }
  if (elapsedMs < milestones.seatSpinStartMs) {
    const currentCardNum =
      elapsedMs < milestones.card2Ms ? 1 : elapsedMs < milestones.card3Ms ? 2 : 3;
    return {
      borderColor: 'cyanBright',
      content: <DealingCardContent currentCardNum={currentCardNum} />,
    };
  }
  if (elapsedMs < milestones.seatSpinEndMs) {
    return {
      borderColor: 'yellowBright',
      content: <SeatRouletteContent elapsedMs={elapsedMs} />,
    };
  }
  if (elapsedMs < milestones.cardGlowEndMs) {
    return {
      borderColor: 'magentaBright',
      content: <PlayerHonorContent />,
    };
  }
  return {
    borderColor: 'greenBright',
    content: <SeatsSettledContent />,
  };
}

export function DealerDeckCenterBox({
  elapsedMs,
  playerCount,
}: DealerDeckCenterBoxProps) {
  const { borderColor, content } = resolveCenterBoxContent(elapsedMs, playerCount);

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
