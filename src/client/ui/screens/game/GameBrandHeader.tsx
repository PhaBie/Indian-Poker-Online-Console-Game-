import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import {
  calculateShimmerColor,
  isAnimationEnabled,
} from '../../components/ShimmeringHeader';
import { UI_COLORS } from '../../theme/colors';

const SHIMMER_INTERVAL_MS = 55;
const SHIMMER_REST_STEPS = 20;
const IDLE_WAVE_POSITION = -999;
const BRAND_NAME = 'TEEN PATTI';

function useBrandShimmer(): number {
  const isAnimationActive = isAnimationEnabled();
  const sweepSteps = BRAND_NAME.length + 7;
  const totalCycleSteps = sweepSteps + SHIMMER_REST_STEPS;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isAnimationActive) return;
    const timer = setInterval(() => {
      setStepIndex((currentStep) => (currentStep + 1) % totalCycleSteps);
    }, SHIMMER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isAnimationActive, totalCycleSteps]);

  return stepIndex < sweepSteps ? stepIndex - 3 : IDLE_WAVE_POSITION;
}

export function getHostTableLabel(hostName: string | undefined): string {
  const name = hostName?.trim();
  if (!name) return 'Private Table';
  return /s$/i.test(name) ? `${name}' Table` : `${name}'s Table`;
}

interface GameBrandHeaderProps {
  readonly hostName?: string;
  readonly roomId: string;
  readonly width: number;
}

export function GameBrandHeader({ hostName, roomId, width }: GameBrandHeaderProps) {
  const wavePosition = useBrandShimmer();

  return (
    <Box
      width={width}
      borderStyle="round"
      borderColor="yellow"
      justifyContent="space-between"
      paddingX={2}
    >
      <Box>
        <Text bold>
          {Array.from(BRAND_NAME).map((character, index) => (
            <Text
              key={`${character}-${index}`}
              color={calculateShimmerColor(index, wavePosition, UI_COLORS.goldHighlight)}
            >
              {character}
            </Text>
          ))}
        </Text>
        <Text color="gray"> | </Text>
        <Text color="gray">{getHostTableLabel(hostName)}</Text>
      </Box>
      <Box gap={2}>
        <Text color="cyanBright" bold>
          ● LIVE
        </Text>
        <Text color="gray">ROOM #{roomId.slice(0, 6).toUpperCase()}</Text>
      </Box>
    </Box>
  );
}
