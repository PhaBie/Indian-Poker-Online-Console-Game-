import { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import { UI_COLORS } from '../theme/colors';

export interface HeaderCharacterItem {
  readonly char: string;
  readonly baseColor: string;
  readonly letterIndex: number;
  readonly bold?: boolean;
}

export const CASINO_SUIT_SYMBOLS = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣',
} as const;

export const FULL_HEADER_TITLE = 'TEEN PATTI - MAIN MENU';
export const APP_VERSION = 'v0.1.0';

export const BRAND_WORDS = [
  { text: 'TEEN', color: UI_COLORS.logoTeen },
  { text: ' ', color: '#FFFFFF' },
  { text: 'PATTI', color: UI_COLORS.logoPatti },
  { text: ' ', color: '#FFFFFF' },
  { text: '-', color: UI_COLORS.logoDash },
  { text: ' ', color: '#FFFFFF' },
  { text: 'MAIN', color: UI_COLORS.logoMain },
  { text: ' ', color: '#FFFFFF' },
  { text: 'MENU', color: UI_COLORS.logoMenu },
] as const;

interface CharacterAccumulator {
  readonly items: readonly HeaderCharacterItem[];
  readonly visibleCounter: number;
}

export function buildBrandTitleCharacters(
  pageTitle?: string,
): readonly HeaderCharacterItem[] {
  const initialAccumulator: CharacterAccumulator = { items: [], visibleCounter: 0 };
  const wordsToBuild =
    !pageTitle || pageTitle === 'MAIN MENU'
      ? BRAND_WORDS
      : [
          { text: 'TEEN', color: UI_COLORS.logoTeen },
          { text: ' ', color: '#FFFFFF' },
          { text: 'PATTI', color: UI_COLORS.logoPatti },
          { text: ' ', color: '#FFFFFF' },
          { text: '-', color: UI_COLORS.logoDash },
          { text: ' ', color: '#FFFFFF' },
          { text: pageTitle, color: UI_COLORS.logoMain },
        ];

  const finalAccumulator = wordsToBuild.reduce((accumulator, word) => {
    return Array.from(word.text).reduce((innerAccumulator, character) => {
      const isSpace = character === ' ';
      const letterIndex = isSpace ? -1 : innerAccumulator.visibleCounter;
      const nextItem: HeaderCharacterItem = {
        char: character,
        baseColor: word.color,
        bold: true,
        letterIndex,
      };

      return {
        items: [...innerAccumulator.items, nextItem],
        visibleCounter: isSpace
          ? innerAccumulator.visibleCounter
          : innerAccumulator.visibleCounter + 1,
      };
    }, accumulator);
  }, initialAccumulator);

  return finalAccumulator.items;
}

export const TITLE_CHARACTERS = buildBrandTitleCharacters();

function getLeadingTint(baseColor: string): string {
  if (baseColor === UI_COLORS.logoTeen) {
    return '#FF8A80';
  }
  if (baseColor === UI_COLORS.logoPatti) {
    return '#81C784';
  }
  if (baseColor === UI_COLORS.logoMain || baseColor === UI_COLORS.logoMenu) {
    return '#80D8FF';
  }
  if (baseColor === UI_COLORS.logoDash) {
    return '#CCCCCC';
  }
  return '#FFF9C4';
}

export function calculateShimmerColor(
  characterIndex: number,
  wavePosition: number,
  baseColor: string,
): string {
  const delta = characterIndex - wavePosition;
  if (delta === 0) {
    return '#FFFFFF';
  }
  if (delta === 1) {
    return getLeadingTint(baseColor);
  }
  if (delta === -1) {
    return '#FFF9C4';
  }
  if (delta === -2) {
    return '#FFE082';
  }
  if (delta === -3) {
    return '#FFD54F';
  }
  if (delta === -4) {
    return '#D8AD4A';
  }
  return baseColor;
}

export function isAnimationEnabled(): boolean {
  if (process.env.NO_ANIMATION === '1') {
    return false;
  }
  if (process.env.CI === 'true') {
    return false;
  }
  if (process.stdout?.isTTY === false) {
    return false;
  }
  return true;
}

type HeaderPhase = 'brand' | 'separator' | 'page';

const HEADER_PHASE_DELAYS = {
  separator: 70,
  page: 140,
} as const;

function useHeaderPhase(): HeaderPhase {
  const [phase, setPhase] = useState<HeaderPhase>('brand');

  useEffect(() => {
    const isAnimationActive = isAnimationEnabled();
    if (!isAnimationActive) {
      setPhase('page');
      return;
    }

    const separatorTimer = setTimeout(() => {
      setPhase('separator');
    }, HEADER_PHASE_DELAYS.separator);

    const pageTimer = setTimeout(() => {
      setPhase('page');
    }, HEADER_PHASE_DELAYS.page);

    return () => {
      clearTimeout(separatorTimer);
      clearTimeout(pageTimer);
    };
  }, []);

  return phase;
}

const SHIMMER_INTERVAL_MS = 55;
const SHIMMER_SWEEP_STEPS = 27;
const SHIMMER_REST_STEPS = 27;
const TOTAL_CYCLE_STEPS = SHIMMER_SWEEP_STEPS + SHIMMER_REST_STEPS;
const IDLE_WAVE_POSITION = -999;

function useShimmerWave(isReady: boolean): number {
  const isAnimationActive = isAnimationEnabled();
  const [stepIndex, setStepIndex] = useState<number>(0);

  useEffect(() => {
    if (!isAnimationActive || !isReady) {
      return;
    }

    const intervalTimer = setInterval(() => {
      setStepIndex((previousStep) => (previousStep + 1) % TOTAL_CYCLE_STEPS);
    }, SHIMMER_INTERVAL_MS);

    return () => {
      clearInterval(intervalTimer);
    };
  }, [isAnimationActive, isReady]);

  if (!isAnimationActive || !isReady || stepIndex >= SHIMMER_SWEEP_STEPS) {
    return IDLE_WAVE_POSITION;
  }

  return stepIndex - 3;
}

function renderShimmeringCharacters(
  wavePosition: number,
  titleCharacters: readonly HeaderCharacterItem[],
) {
  return titleCharacters.map((item, index) => {
    if (item.char === ' ' || item.letterIndex < 0) {
      return <Text key={`space-${index}`}> </Text>;
    }
    const charColor = calculateShimmerColor(
      item.letterIndex,
      wavePosition,
      item.baseColor,
    );
    return (
      <Text key={`${item.char}-${index}`} color={charColor}>
        {item.char}
      </Text>
    );
  });
}

function renderTitleContent(
  phase: HeaderPhase,
  wavePosition: number,
  pageTitle: string,
  titleCharacters: readonly HeaderCharacterItem[],
) {
  if (phase === 'brand') {
    return (
      <>
        <Text color={UI_COLORS.logoTeen}>TEEN</Text>
        <Text> </Text>
        <Text color={UI_COLORS.logoPatti}>PATTI</Text>
        <Text>{' '.repeat(Math.max(1, pageTitle.length + 3))}</Text>
      </>
    );
  }

  if (phase === 'separator') {
    return (
      <>
        <Text color={UI_COLORS.logoTeen}>TEEN</Text>
        <Text> </Text>
        <Text color={UI_COLORS.logoPatti}>PATTI</Text>
        <Text color={UI_COLORS.logoDash}> - </Text>
        <Text>{' '.repeat(Math.max(1, pageTitle.length))}</Text>
      </>
    );
  }

  return renderShimmeringCharacters(wavePosition, titleCharacters);
}

export interface ShimmeringHeaderProps {
  readonly containerWidth?: number;
  readonly pageTitle?: string;
}

export function ShimmeringHeader({
  pageTitle = 'MAIN MENU',
}: ShimmeringHeaderProps = {}) {
  const phase = useHeaderPhase();
  const wavePosition = useShimmerWave(phase === 'page');
  const titleCharacters = useMemo(
    () =>
      pageTitle === 'MAIN MENU' ? TITLE_CHARACTERS : buildBrandTitleCharacters(pageTitle),
    [pageTitle],
  );

  return (
    <Box
      width="100%"
      borderStyle="round"
      borderColor={UI_COLORS.goldBorder}
      alignItems="center"
      paddingY={0}
      marginBottom={0}
    >
      <Box paddingX={1} width="100%" flexDirection="row" alignItems="center">
        <Box width={8} />
        <Box flexGrow={1} justifyContent="center">
          <Text bold>
            {renderTitleContent(phase, wavePosition, pageTitle, titleCharacters)}
          </Text>
        </Box>
        <Box width={8} justifyContent="flex-end">
          <Text color={UI_COLORS.mutedText}>{APP_VERSION}</Text>
        </Box>
      </Box>
    </Box>
  );
}
