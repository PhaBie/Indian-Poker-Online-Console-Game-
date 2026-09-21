import { useEffect, useState } from 'react';
import { useInput } from 'ink';
import { isAnimationEnabled } from '../../components/ShimmeringHeader';

export interface EntranceTimelineStep {
  readonly visibleCardCount: number;
  readonly isDeckPhase: boolean;
  readonly isCardGlowPhase: boolean;
  readonly isSeatSpinning: boolean;
  readonly isPlayersSeated: boolean;
  readonly isPotCountUpPhase: boolean;
  readonly isPotBlinkingPhase: boolean;
  readonly isEntranceComplete: boolean;
}

export const ENTRANCE_STEP_CARD_1_MS = 1000;
export const ENTRANCE_STEP_CARD_2_MS = 2000;
export const ENTRANCE_STEP_CARD_3_MS = 3000;
export const ENTRANCE_STEP_CARD_GLOW_START_MS = 4000;
export const ENTRANCE_STEP_CARD_GLOW_END_MS = 4800;
export const ENTRANCE_STEP_SEAT_SPIN_START_MS = 4800;
export const ENTRANCE_STEP_SEAT_SETTLED_MS = 8800;
export const ENTRANCE_STEP_POT_START_MS = 10800;
export const ENTRANCE_STEP_POT_COUNT_DONE_MS = 11800;
export const ENTRANCE_TOTAL_DURATION_MS = 12800;

function resolveEarlyCardsTimeline(elapsedMs: number): EntranceTimelineStep {
  if (elapsedMs < ENTRANCE_STEP_CARD_1_MS) {
    return {
      visibleCardCount: 0,
      isDeckPhase: true,
      isCardGlowPhase: false,
      isSeatSpinning: false,
      isPlayersSeated: false,
      isPotCountUpPhase: false,
      isPotBlinkingPhase: false,
      isEntranceComplete: false,
    };
  }
  if (elapsedMs < ENTRANCE_STEP_CARD_2_MS) {
    return {
      visibleCardCount: 1,
      isDeckPhase: true,
      isCardGlowPhase: false,
      isSeatSpinning: false,
      isPlayersSeated: false,
      isPotCountUpPhase: false,
      isPotBlinkingPhase: false,
      isEntranceComplete: false,
    };
  }
  if (elapsedMs < ENTRANCE_STEP_CARD_3_MS) {
    return {
      visibleCardCount: 2,
      isDeckPhase: true,
      isCardGlowPhase: false,
      isSeatSpinning: false,
      isPlayersSeated: false,
      isPotCountUpPhase: false,
      isPotBlinkingPhase: false,
      isEntranceComplete: false,
    };
  }
  return {
    visibleCardCount: 3,
    isDeckPhase: true,
    isCardGlowPhase: false,
    isSeatSpinning: false,
    isPlayersSeated: false,
    isPotCountUpPhase: false,
    isPotBlinkingPhase: false,
    isEntranceComplete: false,
  };
}

function resolveMidEntranceTimeline(elapsedMs: number): EntranceTimelineStep {
  if (elapsedMs < ENTRANCE_STEP_SEAT_SPIN_START_MS) {
    return {
      visibleCardCount: 3,
      isDeckPhase: false,
      isCardGlowPhase: true,
      isSeatSpinning: false,
      isPlayersSeated: false,
      isPotCountUpPhase: false,
      isPotBlinkingPhase: false,
      isEntranceComplete: false,
    };
  }
  if (elapsedMs < ENTRANCE_STEP_SEAT_SETTLED_MS) {
    return {
      visibleCardCount: 3,
      isDeckPhase: false,
      isCardGlowPhase: false,
      isSeatSpinning: true,
      isPlayersSeated: false,
      isPotCountUpPhase: false,
      isPotBlinkingPhase: false,
      isEntranceComplete: false,
    };
  }
  return {
    visibleCardCount: 3,
    isDeckPhase: false,
    isCardGlowPhase: false,
    isSeatSpinning: false,
    isPlayersSeated: true,
    isPotCountUpPhase: false,
    isPotBlinkingPhase: false,
    isEntranceComplete: false,
  };
}

function resolvePotEntranceTimeline(elapsedMs: number): EntranceTimelineStep {
  if (elapsedMs < ENTRANCE_STEP_POT_COUNT_DONE_MS) {
    return {
      visibleCardCount: 3,
      isDeckPhase: false,
      isCardGlowPhase: false,
      isSeatSpinning: false,
      isPlayersSeated: true,
      isPotCountUpPhase: true,
      isPotBlinkingPhase: false,
      isEntranceComplete: false,
    };
  }
  if (elapsedMs < ENTRANCE_TOTAL_DURATION_MS) {
    return {
      visibleCardCount: 3,
      isDeckPhase: false,
      isCardGlowPhase: false,
      isSeatSpinning: false,
      isPlayersSeated: true,
      isPotCountUpPhase: false,
      isPotBlinkingPhase: true,
      isEntranceComplete: false,
    };
  }
  return {
    visibleCardCount: 3,
    isDeckPhase: false,
    isCardGlowPhase: false,
    isSeatSpinning: false,
    isPlayersSeated: true,
    isPotCountUpPhase: false,
    isPotBlinkingPhase: false,
    isEntranceComplete: true,
  };
}

export function calculateEntranceTimeline(elapsedMs: number): EntranceTimelineStep {
  if (elapsedMs < ENTRANCE_STEP_CARD_GLOW_START_MS) {
    return resolveEarlyCardsTimeline(elapsedMs);
  }
  if (elapsedMs < ENTRANCE_STEP_POT_START_MS) {
    return resolveMidEntranceTimeline(elapsedMs);
  }
  return resolvePotEntranceTimeline(elapsedMs);
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
  if (elapsedMs < 4000) {
    const cardStep = Math.floor((elapsedMs - 1000) / 1000) + 1;
    return `Dealing card ${cardStep} of 3 to all player slots...`;
  }
  if (elapsedMs < 4800) {
    return 'Activating card slots with border glow...';
  }
  if (elapsedMs < 8800) {
    return 'Randomizing player seats around table...';
  }
  if (elapsedMs < 10800) {
    return 'Players seated in randomized positions';
  }
  if (elapsedMs < 11800) {
    return 'Collecting ante boot to pot...';
  }
  if (elapsedMs < 12800) {
    return 'Confirming pot & preparing first turn...';
  }
  return 'Round ready';
}

export function calculateEntrancePot(elapsedMs: number, finalPot: number): number {
  if (elapsedMs < ENTRANCE_STEP_POT_START_MS) {
    return 0;
  }
  if (elapsedMs >= ENTRANCE_STEP_POT_COUNT_DONE_MS) {
    return finalPot;
  }
  const countUpProgress =
    (elapsedMs - ENTRANCE_STEP_POT_START_MS) /
    (ENTRANCE_STEP_POT_COUNT_DONE_MS - ENTRANCE_STEP_POT_START_MS);
  const clampedProgress = Math.min(1, Math.max(0, countUpProgress));
  return Math.round(finalPot * clampedProgress);
}

export function calculateEntrancePotAmountVisible(elapsedMs: number): boolean {
  if (
    elapsedMs < ENTRANCE_STEP_POT_COUNT_DONE_MS ||
    elapsedMs >= ENTRANCE_TOTAL_DURATION_MS
  ) {
    return true;
  }
  const blinkStep = Math.floor((elapsedMs - ENTRANCE_STEP_POT_COUNT_DONE_MS) / 166);
  return blinkStep % 2 === 0;
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
        isCardGlowPhase: false,
        isSeatSpinning: false,
        isPlayersSeated: true,
        isPotCountUpPhase: false,
        isPotBlinkingPhase: false,
        isEntranceComplete: true,
      }
    : calculateEntranceTimeline(elapsedMs);

  const displayedPot = isComplete ? finalPot : calculateEntrancePot(elapsedMs, finalPot);
  const isPotAmountVisible = isComplete
    ? true
    : calculateEntrancePotAmountVisible(elapsedMs);
  const justDealtCardIndex = isComplete ? -1 : calculateJustDealtCardIndex(elapsedMs);
  const phaseDescription = isComplete
    ? 'Round ready'
    : calculateEntrancePhaseDescription(elapsedMs);

  return {
    timeline,
    displayedPot,
    isPotAmountVisible,
    justDealtCardIndex,
    phaseDescription,
  };
}

export interface TableEntranceAnimationResult {
  readonly isEntranceActive: boolean;
  readonly visibleCardCount: number;
  readonly isDeckPhase: boolean;
  readonly isSeatSpinning: boolean;
  readonly isPlayersSeated: boolean;
  readonly displayedPot: number;
  readonly isPotAmountVisible: boolean;
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

  const {
    timeline,
    displayedPot,
    isPotAmountVisible,
    justDealtCardIndex,
    phaseDescription,
  } = resolveEntranceState(isComplete, elapsedMs, finalPot);

  return {
    isEntranceActive: !isComplete,
    visibleCardCount: timeline.visibleCardCount,
    isDeckPhase: timeline.isDeckPhase,
    isSeatSpinning: timeline.isSeatSpinning,
    isPlayersSeated: timeline.isPlayersSeated,
    displayedPot,
    isPotAmountVisible,
    elapsedMs,
    justDealtCardIndex,
    phaseDescription,
  };
}
