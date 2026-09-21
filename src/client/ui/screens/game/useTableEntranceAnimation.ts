import { useEffect, useState } from 'react';
import { useInput } from 'ink';
import { isAnimationEnabled } from '../../components/ShimmeringHeader';

export interface EntranceTimelineStep {
  readonly visibleCardCount: number;
  readonly isDeckPhase: boolean;
  readonly isPotCountUpPhase: boolean;
  readonly isEntranceComplete: boolean;
}

export const ENTRANCE_STEP_CARD_1_MS = 1000;
export const ENTRANCE_STEP_CARD_2_MS = 2000;
export const ENTRANCE_STEP_CARD_3_MS = 3000;
export const ENTRANCE_STEP_BOOT_POT_MS = 4000;
export const ENTRANCE_STEP_POT_COUNT_DONE_MS = 5200;
export const ENTRANCE_TOTAL_DURATION_MS = 6000;

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
      isPotCountUpPhase: elapsedMs < ENTRANCE_STEP_POT_COUNT_DONE_MS,
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

export function calculateJustDealtCardIndex(elapsedMs: number): number {
  if (elapsedMs >= 1000 && elapsedMs < 1500) {
    return 0;
  }
  if (elapsedMs >= 2000 && elapsedMs < 2500) {
    return 1;
  }
  if (elapsedMs >= 3000 && elapsedMs < 3500) {
    return 2;
  }
  return -1;
}

export function calculateEntrancePhaseDescription(elapsedMs: number): string {
  if (elapsedMs < 1000) {
    return 'Shuffling deck & preparing table...';
  }
  if (elapsedMs < 2000) {
    return 'Dealing card 1 of 3 to all players...';
  }
  if (elapsedMs < 3000) {
    return 'Dealing card 2 of 3 to all players...';
  }
  if (elapsedMs < 4000) {
    return 'Dealing card 3 of 3 to all players...';
  }
  if (elapsedMs < 5200) {
    return 'Collecting ante boot to pot...';
  }
  if (elapsedMs < 6000) {
    return 'Activating player cards...';
  }
  return 'Round ready';
}

export function calculateEntrancePot(elapsedMs: number, finalPot: number): number {
  if (elapsedMs < ENTRANCE_STEP_BOOT_POT_MS) {
    return 0;
  }
  if (elapsedMs >= ENTRANCE_STEP_POT_COUNT_DONE_MS) {
    return finalPot;
  }
  const countUpProgress =
    (elapsedMs - ENTRANCE_STEP_BOOT_POT_MS) /
    (ENTRANCE_STEP_POT_COUNT_DONE_MS - ENTRANCE_STEP_BOOT_POT_MS);
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
  const justDealtCardIndex = isComplete ? -1 : calculateJustDealtCardIndex(elapsedMs);
  const phaseDescription = isComplete
    ? 'Round ready'
    : calculateEntrancePhaseDescription(elapsedMs);

  return { timeline, displayedPot, justDealtCardIndex, phaseDescription };
}

export interface TableEntranceAnimationResult {
  readonly isEntranceActive: boolean;
  readonly visibleCardCount: number;
  readonly isDeckPhase: boolean;
  readonly displayedPot: number;
  readonly elapsedMs: number;
  readonly justDealtCardIndex: number;
  readonly phaseDescription: string;
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
    (_input, key) => {
      if (key.escape) {
        setIsSkipped(true);
      }
    },
    { isActive: shouldAnimate },
  );

  const elapsedMs = useEntranceTimer(shouldAnimate);
  const isComplete = !shouldAnimate || elapsedMs >= ENTRANCE_TOTAL_DURATION_MS;

  const { timeline, displayedPot, justDealtCardIndex, phaseDescription } =
    resolveEntranceState(isComplete, elapsedMs, finalPot);

  return {
    isEntranceActive: !isComplete,
    visibleCardCount: timeline.visibleCardCount,
    isDeckPhase: timeline.isDeckPhase,
    displayedPot,
    elapsedMs,
    justDealtCardIndex,
    phaseDescription,
  };
}
