import { useEffect, useState } from 'react';

export const POT_COUNT_UP_TOTAL_STEPS = 4;
export const POT_COUNT_UP_INTERVAL_MS = 60;
export const POT_FLASH_PULSE_DURATION_MS = 250;
export const POT_FLASH_TOTAL_STEPS = 6;

export type PotAnimationPhase = 'IDLE' | 'COUNT_UP' | 'BLINKING';

export interface PotPaymentAnimationResult {
  readonly isPotBlinking: boolean;
  readonly isAmountVisible: boolean;
  readonly effectiveTurnPlayerId: string | null;
  readonly displayedPotAmount: number;
}

export interface PotAnimationState {
  readonly observedPot: number;
  readonly startPot: number;
  readonly targetPot: number;
  readonly phase: PotAnimationPhase;
  readonly countUpStep: number;
  readonly blinkStep: number;
}

export function resolveNextPotAnimationState(
  nextPot: number,
  currentState: PotAnimationState,
): PotAnimationState {
  if (nextPot === currentState.targetPot && currentState.phase !== 'IDLE') {
    return currentState;
  }
  if (nextPot === currentState.observedPot && currentState.phase === 'IDLE') {
    return currentState;
  }
  const isPotIncrease =
    currentState.observedPot > 0 && nextPot > currentState.observedPot;
  if (!isPotIncrease) {
    return {
      observedPot: nextPot,
      startPot: nextPot,
      targetPot: nextPot,
      phase: 'IDLE',
      countUpStep: 0,
      blinkStep: 0,
    };
  }
  return {
    observedPot: currentState.observedPot,
    startPot: currentState.observedPot,
    targetPot: nextPot,
    phase: 'COUNT_UP',
    countUpStep: 0,
    blinkStep: 0,
  };
}

export function advancePotAnimationStep(
  currentState: PotAnimationState,
): PotAnimationState {
  if (currentState.phase === 'COUNT_UP') {
    if (currentState.countUpStep + 1 < POT_COUNT_UP_TOTAL_STEPS) {
      return { ...currentState, countUpStep: currentState.countUpStep + 1 };
    }
    return { ...currentState, phase: 'BLINKING', blinkStep: 0 };
  }
  if (currentState.phase === 'BLINKING') {
    if (currentState.blinkStep + 1 < POT_FLASH_TOTAL_STEPS) {
      return { ...currentState, blinkStep: currentState.blinkStep + 1 };
    }
    return {
      ...currentState,
      phase: 'IDLE',
      countUpStep: 0,
      blinkStep: 0,
      observedPot: currentState.targetPot,
    };
  }
  return currentState;
}

export function calculateDisplayedPotAmount(state: PotAnimationState): number {
  if (state.phase === 'COUNT_UP') {
    const progress = (state.countUpStep + 1) / POT_COUNT_UP_TOTAL_STEPS;
    return Math.round(state.startPot + (state.targetPot - state.startPot) * progress);
  }
  return state.targetPot;
}

export function calculateIsAmountVisible(state: PotAnimationState): boolean {
  if (state.phase === 'BLINKING') {
    return state.blinkStep % 2 === 0;
  }
  return true;
}

export function usePotPaymentAnimation(
  pot: number,
  incomingTurnPlayerId: string | null,
): PotPaymentAnimationResult {
  const [animationState, setAnimationState] = useState<PotAnimationState>({
    observedPot: pot,
    startPot: pot,
    targetPot: pot,
    phase: 'IDLE',
    countUpStep: 0,
    blinkStep: 0,
  });

  const nextState = resolveNextPotAnimationState(pot, animationState);
  if (nextState !== animationState) {
    setAnimationState(nextState);
  }

  const isAnimating = animationState.phase !== 'IDLE';

  useEffect(() => {
    if (!isAnimating) {
      return;
    }

    const intervalMs =
      animationState.phase === 'COUNT_UP'
        ? POT_COUNT_UP_INTERVAL_MS
        : POT_FLASH_PULSE_DURATION_MS;

    const stepTimer = setInterval(() => {
      setAnimationState((currentState) => {
        const advancedState = advancePotAnimationStep(currentState);
        if (advancedState.phase === 'IDLE') {
          clearInterval(stepTimer);
        }
        return advancedState;
      });
    }, intervalMs);

    return () => clearInterval(stepTimer);
  }, [isAnimating, animationState.phase]);

  const isAmountVisible = calculateIsAmountVisible(animationState);
  const displayedPotAmount = calculateDisplayedPotAmount(animationState);

  return {
    isPotBlinking: isAnimating,
    isAmountVisible,
    effectiveTurnPlayerId: isAnimating ? null : incomingTurnPlayerId,
    displayedPotAmount,
  };
}
