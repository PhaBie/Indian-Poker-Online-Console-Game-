import { useEffect, useState } from 'react';
import { useInput } from 'ink';
import { isAnimationEnabled } from '../../components/ShimmeringHeader';

export interface EntranceTimelineStep {
  readonly visibleCardCount: number;
  readonly isDeckPhase: boolean;
  readonly isPotCountUpPhase: boolean;
  readonly isEntranceComplete: boolean;
}

export const ENTRANCE_STEP_CARD_1_MS = 350;
export const ENTRANCE_STEP_CARD_2_MS = 650;
export const ENTRANCE_STEP_CARD_3_MS = 950;
export const ENTRANCE_STEP_BOOT_POT_MS = 1250;
export const ENTRANCE_TOTAL_DURATION_MS = 1700;

export function calculateEntranceTimeline(elapsedMs: number): EntranceTimelineStep {
  if (elapsedMs < ENTRANCE_STEP_CARD_1_MS) {
    return {
      visibleCardCount: 0,
      isDeckPhase: true,
      isPotCountUpPhase: false,
      isEntranceComplete: false,
    };
  }
  if (elapsedMs < ENTRANCE_STEP_CARD_2_MS) {
    return {
      visibleCardCount: 1,
      isDeckPhase: true,
      isPotCountUpPhase: false,
      isEntranceComplete: false,
    };
  }
  if (elapsedMs < ENTRANCE_STEP_CARD_3_MS) {
    return {
      visibleCardCount: 2,
      isDeckPhase: true,
      isPotCountUpPhase: false,
      isEntranceComplete: false,
    };
  }
  if (elapsedMs < ENTRANCE_STEP_BOOT_POT_MS) {
    return {
      visibleCardCount: 3,
      isDeckPhase: true,
      isPotCountUpPhase: false,
      isEntranceComplete: false,
    };
  }
  if (elapsedMs < ENTRANCE_TOTAL_DURATION_MS) {
    return {
      visibleCardCount: 3,
      isDeckPhase: false,
      isPotCountUpPhase: true,
      isEntranceComplete: false,
    };
  }
  return {
    visibleCardCount: 3,
    isDeckPhase: false,
    isPotCountUpPhase: false,
    isEntranceComplete: true,
  };
}

export function calculateEntrancePot(elapsedMs: number, finalPot: number): number {
  if (elapsedMs < ENTRANCE_STEP_BOOT_POT_MS) {
    return 0;
  }
  const countUpProgress =
    (elapsedMs - ENTRANCE_STEP_BOOT_POT_MS) /
    (ENTRANCE_TOTAL_DURATION_MS - ENTRANCE_STEP_BOOT_POT_MS);
  const clampedProgress = Math.min(1, Math.max(0, countUpProgress));
  return Math.round(finalPot * clampedProgress);
}

export function resolveEntranceState(
  isComplete: boolean,
  elapsedMs: number,
  finalPot: number,
) {
  const timeline = isComplete
    ? {
        visibleCardCount: 3,
        isDeckPhase: false,
        isPotCountUpPhase: false,
        isEntranceComplete: true,
      }
    : calculateEntranceTimeline(elapsedMs);

  const displayedPot = isComplete ? finalPot : calculateEntrancePot(elapsedMs, finalPot);

  return { timeline, displayedPot };
}

export interface TableEntranceAnimationResult {
  readonly isEntranceActive: boolean;
  readonly visibleCardCount: number;
  readonly isDeckPhase: boolean;
  readonly displayedPot: number;
  readonly elapsedMs: number;
}

function useEntranceTimer(isActive: boolean): number {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const intervalTimer = setInterval(() => {
      setElapsedMs((previousMs) => {
        if (previousMs >= ENTRANCE_TOTAL_DURATION_MS) {
          clearInterval(intervalTimer);
          return previousMs;
        }
        return previousMs + 40;
      });
    }, 40);

    return () => clearInterval(intervalTimer);
  }, [isActive]);

  return elapsedMs;
}

export function useTableEntranceAnimation(
  finalPot: number,
  initialActive: boolean = true,
): TableEntranceAnimationResult {
  const [isSkipped, setIsSkipped] = useState(false);
  const shouldAnimate = initialActive && !isSkipped && isAnimationEnabled();

  useInput(
    (input, key) => {
      if (key.return || input === ' ' || key.escape) {
        setIsSkipped(true);
      }
    },
    { isActive: shouldAnimate },
  );

  const elapsedMs = useEntranceTimer(shouldAnimate);
  const isComplete = !shouldAnimate || elapsedMs >= ENTRANCE_TOTAL_DURATION_MS;

  const { timeline, displayedPot } = resolveEntranceState(
    isComplete,
    elapsedMs,
    finalPot,
  );

  return {
    isEntranceActive: !isComplete,
    visibleCardCount: timeline.visibleCardCount,
    isDeckPhase: timeline.isDeckPhase,
    displayedPot,
    elapsedMs,
  };
}
