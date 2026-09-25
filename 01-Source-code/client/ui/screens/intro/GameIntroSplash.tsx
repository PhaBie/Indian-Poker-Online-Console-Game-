import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { UI_COLORS } from '../../shared/theme/colors';
import { isAnimationEnabled } from '../../shared/components/ShimmeringHeader';
import { useTerminalSize } from '../../shared/hooks/useTerminalSize';
import { getGameContainerWidth } from '../../shared/layout/gameContainerLayout';

export interface PlayingCardDefinition {
  readonly rank: string;
  readonly suit: string;
  readonly color: string;
}

export const ROYAL_TRAIL_CARDS: readonly PlayingCardDefinition[] = [
  { rank: 'A', suit: '♠', color: UI_COLORS.cardDarkSuitForeground },
  { rank: 'K', suit: '♥', color: UI_COLORS.cardRedSuit },
  { rank: 'Q', suit: '♦', color: UI_COLORS.cardRedSuit },
];

export const INTRO_DEAL_DELAY_MS = 1200;

export interface IntroDealState {
  readonly visibleCardCount: number;
  readonly flippedCardCount: number;
  readonly isTitleVisible: boolean;
  readonly isSubtitleVisible: boolean;
}

export function calculateDealSequence(elapsedMs: number): IntroDealState {
  if (elapsedMs < 180) {
    return {
      visibleCardCount: 1,
      flippedCardCount: 0,
      isTitleVisible: false,
      isSubtitleVisible: false,
    };
  }
  if (elapsedMs < 360) {
    return {
      visibleCardCount: 2,
      flippedCardCount: 1,
      isTitleVisible: false,
      isSubtitleVisible: false,
    };
  }
  if (elapsedMs < 540) {
    return {
      visibleCardCount: 3,
      flippedCardCount: 2,
      isTitleVisible: false,
      isSubtitleVisible: false,
    };
  }
  if (elapsedMs < 720) {
    return {
      visibleCardCount: 3,
      flippedCardCount: 3,
      isTitleVisible: false,
      isSubtitleVisible: false,
    };
  }
  if (elapsedMs < 920) {
    return {
      visibleCardCount: 3,
      flippedCardCount: 3,
      isTitleVisible: true,
      isSubtitleVisible: false,
    };
  }
  return {
    visibleCardCount: 3,
    flippedCardCount: 3,
    isTitleVisible: true,
    isSubtitleVisible: true,
  };
}

function CardBack() {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={UI_COLORS.menuBorder}
      width={11}
      height={5}
      paddingX={1}
    >
      <Text color={UI_COLORS.menuBorder}>╱ ╲ ╱ ╲</Text>
      <Text color={UI_COLORS.goldBorder}> ◆ ◆ </Text>
      <Text color={UI_COLORS.menuBorder}>╲ ╱ ╲ ╱</Text>
    </Box>
  );
}

function CardFront({ card }: { readonly card: PlayingCardDefinition }) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={card.color}
      width={11}
      height={5}
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Text bold color={card.color}>
          {card.rank}
        </Text>
        <Text bold color={card.color}>
          {card.suit}
        </Text>
      </Box>
      <Box justifyContent="center">
        <Text bold color={card.color}>
          {card.suit}
        </Text>
      </Box>
      <Box justifyContent="space-between">
        <Text bold color={card.color}>
          {card.suit}
        </Text>
        <Text bold color={card.color}>
          {card.rank}
        </Text>
      </Box>
    </Box>
  );
}

interface CasinoCardSlotProps {
  readonly card: PlayingCardDefinition;
  readonly isVisible: boolean;
  readonly isFlipped: boolean;
}

function CasinoCardSlot({ card, isVisible, isFlipped }: CasinoCardSlotProps) {
  if (!isVisible) {
    return <Box width={11} height={5} />;
  }
  if (!isFlipped) {
    return <CardBack />;
  }
  return <CardFront card={card} />;
}

function useDealAnimation(
  onFinish: () => void,
  autoFinishDelayMs: number,
): IntroDealState {
  const isAnimated = isAnimationEnabled();
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  useInput(
    () => {
      onFinish();
    },
    { isActive: Boolean(process.stdin?.isTTY) },
  );

  useEffect(() => {
    if (!isAnimated) {
      onFinish();
      return;
    }

    const intervalTimer = setInterval(() => {
      setElapsedMs((previousMs) => previousMs + 40);
    }, 40);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, autoFinishDelayMs);

    return () => {
      clearInterval(intervalTimer);
      clearTimeout(finishTimer);
    };
  }, [isAnimated, autoFinishDelayMs, onFinish]);

  return calculateDealSequence(elapsedMs);
}

interface IntroTitleBannerProps {
  readonly isTitleVisible: boolean;
  readonly isSubtitleVisible: boolean;
}

function IntroTitleBanner({ isTitleVisible, isSubtitleVisible }: IntroTitleBannerProps) {
  return (
    <>
      <Box marginBottom={1}>
        {isTitleVisible ? (
          <Text bold>
            <Text color={UI_COLORS.logoTeen}>T E E N </Text>
            <Text color={UI_COLORS.logoPatti}>P A T T I</Text>
          </Text>
        ) : (
          <Text>{' '.repeat(17)}</Text>
        )}
      </Box>
      <Box>
        {isSubtitleVisible ? (
          <Text color={UI_COLORS.mutedText}>- INDIAN POKER -</Text>
        ) : (
          <Text>{' '.repeat(16)}</Text>
        )}
      </Box>
    </>
  );
}

export interface GameIntroSplashProps {
  readonly onFinish: () => void;
  readonly autoFinishDelayMs?: number;
}

export function GameIntroSplash({
  onFinish,
  autoFinishDelayMs = INTRO_DEAL_DELAY_MS,
}: GameIntroSplashProps) {
  const { columns, rows } = useTerminalSize();
  const containerWidth = getGameContainerWidth(columns);
  const { visibleCardCount, flippedCardCount, isTitleVisible, isSubtitleVisible } =
    useDealAnimation(onFinish, autoFinishDelayMs);

  return (
    <Box
      flexDirection="column"
      width="100%"
      height={rows}
      alignItems="center"
      justifyContent="center"
    >
      <Box
        width={containerWidth}
        borderStyle="round"
        borderColor={UI_COLORS.goldBorder}
        flexDirection="column"
        alignItems="center"
        paddingY={1}
      >
        <Box marginBottom={1} flexDirection="row">
          {ROYAL_TRAIL_CARDS.map((card, index) => (
            <Box key={card.suit} marginRight={index < 2 ? 2 : 0}>
              <CasinoCardSlot
                card={card}
                isVisible={index < visibleCardCount}
                isFlipped={index < flippedCardCount}
              />
            </Box>
          ))}
        </Box>
        <IntroTitleBanner
          isTitleVisible={isTitleVisible}
          isSubtitleVisible={isSubtitleVisible}
        />
      </Box>
    </Box>
  );
}
