import { useEffect, useState } from 'react';
import {
  ENTRANCE_STEP_CARD_GLOW_START_MS,
  ENTRANCE_STEP_CARD_GLOW_END_MS,
} from './useTableEntranceAnimation';

export type CardBorderColorTriple = readonly [string, string, string];

export const CARD_BORDER_GLOW_INTERVAL_MS = 90;
export const CARD_BORDER_GLOW_PAUSE_MS = 7_000;

export const CARD_BORDER_GLOW_ACTIVE_FRAMES: readonly CardBorderColorTriple[] = [
  ['magentaBright', 'magenta', 'magenta'],
  ['yellow', 'magentaBright', 'magenta'],
  ['yellowBright', 'yellow', 'magentaBright'],
  ['yellow', 'yellowBright', 'yellow'],
  ['magentaBright', 'yellow', 'yellowBright'],
  ['magenta', 'magentaBright', 'yellow'],
  ['magenta', 'magenta', 'magentaBright'],
];

export const CARD_BORDER_GLOW_PAUSE_FRAMES = Math.ceil(
  CARD_BORDER_GLOW_PAUSE_MS / CARD_BORDER_GLOW_INTERVAL_MS,
);

export const CARD_BORDER_GLOW_CYCLE_FRAMES =
  CARD_BORDER_GLOW_ACTIVE_FRAMES.length + CARD_BORDER_GLOW_PAUSE_FRAMES;

export const DEFAULT_CARD_BORDER_COLORS: CardBorderColorTriple = [
  'magenta',
  'magenta',
  'magenta',
];

export function calculateEntranceBorderGlowColors(
  elapsedMs: number,
): CardBorderColorTriple {
  if (
    elapsedMs < ENTRANCE_STEP_CARD_GLOW_START_MS ||
    elapsedMs >= ENTRANCE_STEP_CARD_GLOW_END_MS
  ) {
    return DEFAULT_CARD_BORDER_COLORS;
  }

  const frameIndex = Math.floor(
    (elapsedMs - ENTRANCE_STEP_CARD_GLOW_START_MS) / CARD_BORDER_GLOW_INTERVAL_MS,
  );

  if (frameIndex >= 0 && frameIndex < CARD_BORDER_GLOW_ACTIVE_FRAMES.length) {
    return CARD_BORDER_GLOW_ACTIVE_FRAMES[frameIndex];
  }

  return DEFAULT_CARD_BORDER_COLORS;
}

export function calculatePeriodicBorderGlowColors(
  cycleFrame: number,
): CardBorderColorTriple {
  if (cycleFrame >= 0 && cycleFrame < CARD_BORDER_GLOW_ACTIVE_FRAMES.length) {
    return CARD_BORDER_GLOW_ACTIVE_FRAMES[cycleFrame];
  }
  return DEFAULT_CARD_BORDER_COLORS;
}

export function useCardBorderGlow(
  isEntranceActive: boolean = false,
  entranceElapsedMs: number = 0,
): CardBorderColorTriple {
  const [frame, setFrame] = useState<number>(CARD_BORDER_GLOW_ACTIVE_FRAMES.length);

  useEffect(() => {
    if (isEntranceActive) {
      setFrame(CARD_BORDER_GLOW_ACTIVE_FRAMES.length);
      return;
    }

    const timer = setInterval(() => {
      setFrame((currentFrame) => (currentFrame + 1) % CARD_BORDER_GLOW_CYCLE_FRAMES);
    }, CARD_BORDER_GLOW_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isEntranceActive]);

  if (isEntranceActive) {
    return calculateEntranceBorderGlowColors(entranceElapsedMs);
  }

  return calculatePeriodicBorderGlowColors(frame);
}
