import { useEffect, useState } from 'react';
import { useInput } from 'ink';
import { isAnimationEnabled } from '../../components/ShimmeringHeader';

// Leave a little more room between cards so the deal is readable without
// making the later seat and pot animations any slower.
const FIRST_CARD_DEAL_MS = 1_000;
const CARD_DEAL_INTERVAL_MS = 1_200;
const CARD_DEAL_HIGHLIGHT_MS = 500;
const SECOND_CARD_DEAL_MS = FIRST_CARD_DEAL_MS + CARD_DEAL_INTERVAL_MS;
const THIRD_CARD_DEAL_MS = SECOND_CARD_DEAL_MS + CARD_DEAL_INTERVAL_MS;
const CARD_GLOW_START_MS = THIRD_CARD_DEAL_MS + CARD_DEAL_INTERVAL_MS;

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

export function getEntranceMilestones(
  playerCount: number,
  isSubsequentRound: boolean = false,
  isPlayerCountChanged: boolean = false,
): EntranceMilestones {
  const shouldSkipSpinAndSweep =
    playerCount <= 2 || (isSubsequentRound && !isPlayerCountChanged);

  if (shouldSkipSpinAndSweep) {
    return {
      card1Ms: FIRST_CARD_DEAL_MS,
      card2Ms: SECOND_CARD_DEAL_MS,
      card3Ms: THIRD_CARD_DEAL_MS,
      cardGlowStartMs: CARD_GLOW_START_MS,
      cardGlowEndMs: 5800,
      seatSpinStartMs: 5800,
      seatSpinEndMs: 5800,
      nameGlowStartMs: 5800,
      nameGlowEndMs: 5800,
      potStartMs: 5800,
      potCountDoneMs: 6800,
      totalDurationMs: 7800,
    };
  }
  return {
    card1Ms: FIRST_CARD_DEAL_MS,
    card2Ms: SECOND_CARD_DEAL_MS,
    card3Ms: THIRD_CARD_DEAL_MS,
    cardGlowStartMs: CARD_GLOW_START_MS,
    cardGlowEndMs: 5800,
    seatSpinStartMs: 5800,
    seatSpinEndMs: 9800,
    nameGlowStartMs: 9800,
    nameGlowEndMs: 10600,
    potStartMs: 10600,
    potCountDoneMs: 11600,
    totalDurationMs: 12600,
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
  if (
    elapsedMs >= FIRST_CARD_DEAL_MS &&
    elapsedMs < FIRST_CARD_DEAL_MS + CARD_DEAL_HIGHLIGHT_MS
  ) {
    return 0;
  }
  if (
    elapsedMs >= SECOND_CARD_DEAL_MS &&
    elapsedMs < SECOND_CARD_DEAL_MS + CARD_DEAL_HIGHLIGHT_MS
  ) {
    return 1;
  }
  if (
    elapsedMs >= THIRD_CARD_DEAL_MS &&
    elapsedMs < THIRD_CARD_DEAL_MS + CARD_DEAL_HIGHLIGHT_MS
  ) {
    return 2;
  }
  return -1;
}

export function calculateEntrancePhaseDescription(
  elapsedMs: number,
  milestones: EntranceMilestones,
): string {
  if (elapsedMs < milestones.card1Ms) {
    return 'Shuffling deck & preparing table...';
  }
  if (elapsedMs < milestones.cardGlowStartMs) {
    const cardStep =
      Math.floor((elapsedMs - milestones.card1Ms) / CARD_DEAL_INTERVAL_MS) + 1;
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

function computeServerElapsed(roundStartedAt?: number | null): number | null {
  if (typeof roundStartedAt === 'number' && roundStartedAt > 0) {
    return Math.max(0, Date.now() - roundStartedAt);
  }
  return null;
}

function useEntranceTimer(
  isActive: boolean,
  totalDurationMs: number,
  dealSequence: number = 1,
  roundStartedAt?: number | null,
): number {
  const [elapsedMs, setElapsedMs] = useState(() => {
    const initialServerElapsed = computeServerElapsed(roundStartedAt);
    return initialServerElapsed ?? 0;
  });

  useEffect(() => {
    const updatedServerElapsed = computeServerElapsed(roundStartedAt);
    setElapsedMs(updatedServerElapsed ?? 0);
  }, [dealSequence, roundStartedAt]);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    const initialServerElapsed = computeServerElapsed(roundStartedAt);
    if (initialServerElapsed !== null && initialServerElapsed >= totalDurationMs) {
      setElapsedMs(initialServerElapsed);
      return;
    }
    const intervalTimer = setInterval(() => {
      setElapsedMs((previousElapsed) => {
        const liveServerElapsed = computeServerElapsed(roundStartedAt);
        const nextElapsed = liveServerElapsed ?? previousElapsed + 40;
        if (nextElapsed >= totalDurationMs) {
          clearInterval(intervalTimer);
          return nextElapsed;
        }
        return nextElapsed;
      });
    }, 40);
    return () => clearInterval(intervalTimer);
  }, [isActive, totalDurationMs, dealSequence, roundStartedAt]);

  return elapsedMs;
}

function useSkipOnEscape(dealSequence: number, isEscapeActive: boolean): boolean {
  const [isSkipped, setIsSkipped] = useState(false);

  useEffect(() => {
    setIsSkipped(false);
  }, [dealSequence]);

  useInput(
    (_input, key) => {
      if (key.escape) {
        setIsSkipped(true);
      }
    },
    { isActive: isEscapeActive && !isSkipped && Boolean(process.stdin?.isTTY) },
  );

  return isSkipped;
}

export function useTableEntranceAnimation(
  finalPot: number,
  playerCount: number = 4,
  isSubsequentRound: boolean = false,
  dealSequence: number = 1,
  isPlayerCountChanged: boolean = false,
  initialActive: boolean = true,
  roundStartedAt?: number | null,
): TableEntranceAnimationResult {
  const isEffectiveSubsequent = isSubsequentRound || dealSequence > 1;
  const milestones = getEntranceMilestones(
    playerCount,
    isEffectiveSubsequent,
    isPlayerCountChanged,
  );
  const isAnimationReady = initialActive && isAnimationEnabled();
  const isSkipped = useSkipOnEscape(dealSequence, isAnimationReady);
  const shouldAnimate = isAnimationReady && !isSkipped;
  const elapsedMs = useEntranceTimer(
    shouldAnimate,
    milestones.totalDurationMs,
    dealSequence,
    roundStartedAt,
  );
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
