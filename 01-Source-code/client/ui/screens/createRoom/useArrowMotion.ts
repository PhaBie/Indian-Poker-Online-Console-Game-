import { useState, useEffect } from 'react';
import { isAnimationEnabled } from '../../shared/components/ShimmeringHeader';

export interface ArrowMotionState {
  readonly glyph: string;
  readonly isGliding: boolean;
}

const ARROW_SPARK_DURATION_MS = 45;
const ARROW_SETTLE_DURATION_MS = 105;

export function useArrowMotion(focusedIndex: number): ArrowMotionState {
  const isAnimationActive = isAnimationEnabled();
  const [motionState, setMotionState] = useState<ArrowMotionState>({
    glyph: '>',
    isGliding: false,
  });

  useEffect(() => {
    if (!isAnimationActive) {
      setMotionState({ glyph: '>', isGliding: false });
      return;
    }

    setMotionState({ glyph: '>', isGliding: true });

    const stepOneTimer = setTimeout(() => {
      setMotionState({ glyph: '>>', isGliding: false });
    }, ARROW_SPARK_DURATION_MS);

    const stepTwoTimer = setTimeout(() => {
      setMotionState({ glyph: '>', isGliding: false });
    }, ARROW_SETTLE_DURATION_MS);

    return () => {
      clearTimeout(stepOneTimer);
      clearTimeout(stepTwoTimer);
    };
  }, [focusedIndex, isAnimationActive]);

  return motionState;
}
