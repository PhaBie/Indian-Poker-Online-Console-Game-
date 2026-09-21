import { useEffect, useState } from 'react';

export const POT_FLASH_PULSE_DURATION_MS = 250;
export const POT_FLASH_TOTAL_STEPS = 6;

export interface PotPaymentAnimationResult {
  readonly isPotBlinking: boolean;
  readonly isAmountVisible: boolean;
  readonly effectiveTurnPlayerId: string | null;
}

export interface PotAnimationState {
  readonly observedPot: number;
  readonly step: number | null;
}

export function resolveNextPotAnimationState(
  nextPot: number,
  currentState: PotAnimationState,
): PotAnimationState {
  if (nextPot === currentState.observedPot) {
    return currentState;
  }
  const isPotIncrease =
    currentState.observedPot > 0 && nextPot > currentState.observedPot;
  return {
    observedPot: nextPot,
    step: isPotIncrease ? 0 : null,
  };
}

export function advancePotAnimationStep(
  currentState: PotAnimationState,
): PotAnimationState {
  if (currentState.step === null || currentState.step >= POT_FLASH_TOTAL_STEPS - 1) {
    return { ...currentState, step: null };
  }
  return { ...currentState, step: currentState.step + 1 };
}

export function usePotPaymentAnimation(
  pot: number,
  incomingTurnPlayerId: string | null,
): PotPaymentAnimationResult {
  const [animationState, setAnimationState] = useState<PotAnimationState>({
    observedPot: pot,
    step: null,
  });

  const nextState = resolveNextPotAnimationState(pot, animationState);
  if (nextState !== animationState) {
    setAnimationState(nextState);
  }

  const isPotBlinking = animationState.step !== null;

  useEffect(() => {
    if (!isPotBlinking) {
      return;
    }

    const stepTimer = setInterval(() => {
      setAnimationState((currentState) => {
        const advancedState = advancePotAnimationStep(currentState);
        if (advancedState.step === null) {
          clearInterval(stepTimer);
        }
        return advancedState;
      });
    }, POT_FLASH_PULSE_DURATION_MS);

    return () => clearInterval(stepTimer);
  }, [isPotBlinking]);

  const isAmountVisible = animationState.step === null || animationState.step % 2 === 0;

  return {
    isPotBlinking,
    isAmountVisible,
    effectiveTurnPlayerId: isPotBlinking ? null : incomingTurnPlayerId,
  };
}
