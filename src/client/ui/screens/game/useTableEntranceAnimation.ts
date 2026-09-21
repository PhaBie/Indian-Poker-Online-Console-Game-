import { useEffect, useState } from 'react';
import { useInput } from 'ink';
import { isAnimationEnabled } from '../../components/ShimmeringHeader';

export interface EntranceTimelineStep {
  readonly visibleCardCount: number;
  readonly isDeckPhase: boolean;
  readonly isCardGlowPhase: boolean;
  readonly isSeatSpinning: boolean;
  readonly isNameGlowPhase: boolean;
  readonly isPlayersSeated: boolean;
  readonly isPotCountUpPhase: boolean;
  readonly isPotBlinkingPhase: boolean;
  readonly isEntranceComplete: boolean;
}

export interface EntranceMilestones {
  readonly card1Ms: number;
  readonly card2Ms: number;
  readonly card3Ms: number;
  readonly cardGlowStartMs: number;
  readonly cardGlowEndMs: number;
  readonly seatSpinStartMs: number;
  readonly seatSpinEndMs: number;
  readonly nameGlowStartMs: number;
  readonly nameGlowEndMs: number;
  readonly potStartMs: number;
  readonly potCountDoneMs: number;
  readonly totalDurationMs: number;
}

export function getEntranceMilestones(playerCount: number): EntranceMilestones {
  if (playerCount <= 2) {
    return {
      card1Ms: 1000,
      card2Ms: 2000,
      card3Ms: 3000,
      cardGlowStartMs: 4000,
      cardGlowEndMs: 5200,
      seatSpinStartMs: 5200,
      seatSpinEndMs: 5200,
      nameGlowStartMs: 5200,
      nameGlowEndMs: 5200,
      potStartMs: 5200,
      potCountDoneMs: 6200,
      totalDurationMs: 7200,
    };
  }
  return {
    card1Ms: 1000,
    card2Ms: 2000,
    card3Ms: 3000,
    cardGlowStartMs: 4000,
    cardGlowEndMs: 5200,
    seatSpinStartMs: 5200,
    seatSpinEndMs: 9200,
    nameGlowStartMs: 9200,
    nameGlowEndMs: 10000,
    potStartMs: 10000,
    potCountDoneMs: 11000,
    totalDurationMs: 12000,
  };
}

function resolveEarlyCardsTimeline(
  elapsedMs: number,
  milestones: EntranceMilestones,
): EntranceTimelineStep {
  const visibleCardCount =
    elapsedMs < milestones.card1Ms
      ? 0
      : elapsedMs < milestones.card2Ms
        ? 1
        : elapsedMs < milestones.card3Ms
          ? 2
          : 3;

  return {
    visibleCardCount,
    isDeckPhase: true,
    isCardGlowPhase: false,
    isSeatSpinning: false,
    isNameGlowPhase: false,
    isPlayersSeated: false,
    isPotCountUpPhase: false,
    isPotBlinkingPhase: false,
    isEntranceComplete: false,
  };
}

export function calculateEntranceTimeline(
  elapsedMs: number,
  milestones: EntranceMilestones,
): EntranceTimelineStep {
  if (elapsedMs < milestones.cardGlowStartMs) {
    return resolveEarlyCardsTimeline(elapsedMs, milestones);
  }
  return resolvePostDealTimeline(elapsedMs, milestones);
}

function resolvePostDealTimeline(
  elapsedMs: number,
  milestones: EntranceMilestones,
): EntranceTimelineStep {
  if (elapsedMs < milestones.cardGlowEndMs) {
    return {
      visibleCardCount: 3,
      isDeckPhase: false,
      isCardGlowPhase: true,
      isSeatSpinning: false,
      isNameGlowPhase: false,
      isPlayersSeated: false,
      isPotCountUpPhase: false,
      isPotBlinkingPhase: false,
      isEntranceComplete: false,
    };
  }
  if (elapsedMs < milestones.seatSpinEndMs) {
    return {
      visibleCardCount: 3,
      isDeckPhase: false,
      isCardGlowPhase: false,
      isSeatSpinning: true,
      isNameGlowPhase: false,
      isPlayersSeated: false,
      isPotCountUpPhase: false,
      isPotBlinkingPhase: false,
      isEntranceComplete: false,
    };
  }
  if (elapsedMs < milestones.nameGlowEndMs) {
    return {
      visibleCardCount: 3,
      isDeckPhase: false,
      isCardGlowPhase: false,
      isSeatSpinning: false,
      isNameGlowPhase: true,
      isPlayersSeated: true,
      isPotCountUpPhase: false,
      isPotBlinkingPhase: false,
      isEntranceComplete: false,
    };
  }
  return resolvePotTimeline(elapsedMs, milestones);
}

function resolvePotTimeline(
  elapsedMs: number,
  milestones: EntranceMilestones,
): EntranceTimelineStep {
  if (elapsedMs < milestones.potCountDoneMs) {
    return {
      visibleCardCount: 3,
      isDeckPhase: false,
      isCardGlowPhase: false,
      isSeatSpinning: false,
      isNameGlowPhase: false,
      isPlayersSeated: true,
      isPotCountUpPhase: true,
      isPotBlinkingPhase: false,
      isEntranceComplete: false,
    };
  }
  if (elapsedMs < milestones.totalDurationMs) {
    return {
      visibleCardCount: 3,
      isDeckPhase: false,
      isCardGlowPhase: false,
      isSeatSpinning: false,
      isNameGlowPhase: false,
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
    isNameGlowPhase: false,
    isPlayersSeated: true,
    isPotCountUpPhase: false,
    isPotBlinkingPhase: false,
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

export function calculateEntrancePhaseDescription(
  elapsedMs: number,
  milestones: EntranceMilestones,
): string {
  if (elapsedMs < 1000) {
    return 'Shuffling deck & preparing table...';
  }
  if (elapsedMs < 4000) {
    const cardStep = Math.floor((elapsedMs - 1000) / 1000) + 1;
    return `Dealing card ${cardStep} of 3 to player slots...`;
  }
  if (elapsedMs < milestones.cardGlowEndMs) {
    return 'Activating card slots with border glow...';
  }
  if (elapsedMs < milestones.seatSpinEndMs) {
    return 'Randomizing player seats around table...';
  }
  if (elapsedMs < milestones.nameGlowEndMs) {
    return 'Welcoming players to seated positions...';
  }
  if (elapsedMs < milestones.potCountDoneMs) {
    return 'Collecting ante boot to pot...';
  }
  if (elapsedMs < milestones.totalDurationMs) {
    return 'Confirming pot & preparing first turn...';
  }
  return 'Round ready';
}

export function calculateEntrancePot(
  elapsedMs: number,
  finalPot: number,
  milestones: EntranceMilestones,
): number {
  if (elapsedMs < milestones.potStartMs) {
    return 0;
  }
  if (elapsedMs >= milestones.potCountDoneMs) {
    return finalPot;
  }
  const countUpProgress =
    (elapsedMs - milestones.potStartMs) /
    (milestones.potCountDoneMs - milestones.potStartMs);
  const clampedProgress = Math.min(1, Math.max(0, countUpProgress));
  return Math.round(finalPot * clampedProgress);
}

export function calculateEntrancePotAmountVisible(
  elapsedMs: number,
  milestones: EntranceMilestones,
): boolean {
  if (elapsedMs < milestones.potCountDoneMs || elapsedMs >= milestones.totalDurationMs) {
    return true;
  }
  const blinkStep = Math.floor((elapsedMs - milestones.potCountDoneMs) / 166);
  return blinkStep % 2 === 0;
}

export function resolveEntranceState(
  isComplete: boolean,
  elapsedMs: number,
  finalPot: number,
  milestones: EntranceMilestones,
) {
  const timeline = isComplete
    ? {
        visibleCardCount: 3,
        isDeckPhase: false,
        isCardGlowPhase: false,
        isSeatSpinning: false,
        isNameGlowPhase: false,
        isPlayersSeated: true,
        isPotCountUpPhase: false,
        isPotBlinkingPhase: false,
        isEntranceComplete: true,
      }
    : calculateEntranceTimeline(elapsedMs, milestones);

  const displayedPot = isComplete
    ? finalPot
    : calculateEntrancePot(elapsedMs, finalPot, milestones);
  const isPotAmountVisible = isComplete
    ? true
    : calculateEntrancePotAmountVisible(elapsedMs, milestones);
  const justDealtCardIndex = isComplete ? -1 : calculateJustDealtCardIndex(elapsedMs);
  const phaseDescription = isComplete
    ? 'Round ready'
    : calculateEntrancePhaseDescription(elapsedMs, milestones);

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
  readonly isCardGlowPhase: boolean;
  readonly isSeatSpinning: boolean;
  readonly isNameGlowPhase: boolean;
  readonly isPlayersSeated: boolean;
  readonly displayedPot: number;
  readonly isPotAmountVisible: boolean;
  readonly elapsedMs: number;
  readonly justDealtCardIndex: number;
  readonly phaseDescription: string;
  readonly milestones: EntranceMilestones;
}

function useEntranceTimer(isActive: boolean, totalDurationMs: number): number {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const intervalTimer = setInterval(() => {
      setElapsedMs((previousMs) => {
        if (previousMs >= totalDurationMs) {
          clearInterval(intervalTimer);
          return previousMs;
        }
        return previousMs + 40;
      });
    }, 40);

    return () => clearInterval(intervalTimer);
  }, [isActive, totalDurationMs]);

  return elapsedMs;
}

export function useTableEntranceAnimation(
  finalPot: number,
  playerCount: number = 4,
  initialActive: boolean = true,
): TableEntranceAnimationResult {
  const milestones = getEntranceMilestones(playerCount);
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

  const elapsedMs = useEntranceTimer(shouldAnimate, milestones.totalDurationMs);
  const isComplete = !shouldAnimate || elapsedMs >= milestones.totalDurationMs;

  const {
    timeline,
    displayedPot,
    isPotAmountVisible,
    justDealtCardIndex,
    phaseDescription,
  } = resolveEntranceState(isComplete, elapsedMs, finalPot, milestones);

  return {
    isEntranceActive: !isComplete,
    visibleCardCount: timeline.visibleCardCount,
    isDeckPhase: timeline.isDeckPhase,
    isCardGlowPhase: timeline.isCardGlowPhase,
    isSeatSpinning: timeline.isSeatSpinning,
    isNameGlowPhase: timeline.isNameGlowPhase,
    isPlayersSeated: timeline.isPlayersSeated,
    displayedPot,
    isPotAmountVisible,
    elapsedMs,
    justDealtCardIndex,
    phaseDescription,
    milestones,
  };
}
