import { describe, expect, test } from 'bun:test';
import { createElement, useState } from 'react';
import { PassThrough, Writable } from 'stream';
import { render } from 'ink';
import {
  calculateEntranceTimeline,
  calculateEntrancePot,
  calculateJustDealtCardIndex,
  calculateEntrancePhaseDescription,
  resolveEntranceState,
  useTableEntranceAnimation,
  ENTRANCE_STEP_CARD_1_MS,
  ENTRANCE_STEP_CARD_2_MS,
  ENTRANCE_STEP_CARD_3_MS,
  ENTRANCE_STEP_BOOT_POT_MS,
  ENTRANCE_STEP_POT_COUNT_DONE_MS,
  ENTRANCE_TOTAL_DURATION_MS,
} from '../../../src/client/ui/screens/game/useTableEntranceAnimation';

interface EntranceHarnessState {
  currentResult: ReturnType<typeof useTableEntranceAnimation> | null;
  updatePot: (newPot: number) => void;
}

function mountEntranceAnimationHarness(initialPot: number) {
  const harnessState: EntranceHarnessState = {
    currentResult: null,
    updatePot: () => {},
  };

  function useHarnessComponent() {
    const [currentPot, setCurrentPot] = useState(initialPot);
    harnessState.updatePot = setCurrentPot;
    harnessState.currentResult = useTableEntranceAnimation(currentPot, true);
    return null;
  }

  const outputStream = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });

  const inkInstance = render(createElement(useHarnessComponent), {
    stdout: outputStream as unknown as NodeJS.WriteStream,
    stderr: outputStream as unknown as NodeJS.WriteStream,
    stdin: new PassThrough() as unknown as NodeJS.ReadStream,
    exitOnCtrlC: false,
    patchConsole: false,
  });

  return {
    getResult: () => harnessState.currentResult!,
    updatePot: (nextPot: number) => harnessState.updatePot(nextPot),
    unmount: () => inkInstance.unmount(),
  };
}

describe('useTableEntranceAnimation', () => {
  test('calculateEntranceTimeline advances cards and phases by elapsed milliseconds', () => {
    const stepZero = calculateEntranceTimeline(0);
    expect(stepZero.visibleCardCount).toBe(0);
    expect(stepZero.isDeckPhase).toBe(true);
    expect(stepZero.isEntranceComplete).toBe(false);

    const stepOne = calculateEntranceTimeline(ENTRANCE_STEP_CARD_1_MS + 10);
    expect(stepOne.visibleCardCount).toBe(1);
    expect(stepOne.isDeckPhase).toBe(true);

    const stepTwo = calculateEntranceTimeline(ENTRANCE_STEP_CARD_2_MS + 10);
    expect(stepTwo.visibleCardCount).toBe(2);
    expect(stepTwo.isDeckPhase).toBe(true);

    const stepThree = calculateEntranceTimeline(ENTRANCE_STEP_CARD_3_MS + 10);
    expect(stepThree.visibleCardCount).toBe(3);
    expect(stepThree.isDeckPhase).toBe(true);

    const stepBoot = calculateEntranceTimeline(ENTRANCE_STEP_BOOT_POT_MS + 50);
    expect(stepBoot.visibleCardCount).toBe(3);
    expect(stepBoot.isDeckPhase).toBe(false);
    expect(stepBoot.isPotCountUpPhase).toBe(true);

    const stepDone = calculateEntranceTimeline(ENTRANCE_TOTAL_DURATION_MS + 10);
    expect(stepDone.visibleCardCount).toBe(3);
    expect(stepDone.isEntranceComplete).toBe(true);
  });

  test('calculateEntrancePot counts up pot proportionally after boot step until pot count done', () => {
    expect(calculateEntrancePot(0, 100)).toBe(0);
    expect(calculateEntrancePot(ENTRANCE_STEP_BOOT_POT_MS - 50, 100)).toBe(0);
    expect(calculateEntrancePot(ENTRANCE_STEP_BOOT_POT_MS, 100)).toBe(0);

    const midElapsedMs =
      ENTRANCE_STEP_BOOT_POT_MS +
      (ENTRANCE_STEP_POT_COUNT_DONE_MS - ENTRANCE_STEP_BOOT_POT_MS) / 2;
    expect(calculateEntrancePot(midElapsedMs, 100)).toBe(50);
    expect(calculateEntrancePot(ENTRANCE_STEP_POT_COUNT_DONE_MS, 100)).toBe(100);
    expect(calculateEntrancePot(ENTRANCE_TOTAL_DURATION_MS, 100)).toBe(100);
  });

  test('calculateJustDealtCardIndex identifies landing card by timing window', () => {
    expect(calculateJustDealtCardIndex(500)).toBe(-1);
    expect(calculateJustDealtCardIndex(1100)).toBe(0);
    expect(calculateJustDealtCardIndex(2100)).toBe(1);
    expect(calculateJustDealtCardIndex(3100)).toBe(2);
    expect(calculateJustDealtCardIndex(4500)).toBe(-1);
  });

  test('calculateEntrancePhaseDescription returns descriptive status for each stage', () => {
    expect(calculateEntrancePhaseDescription(500)).toContain('Shuffling');
    expect(calculateEntrancePhaseDescription(1500)).toContain('card 1');
    expect(calculateEntrancePhaseDescription(2500)).toContain('card 2');
    expect(calculateEntrancePhaseDescription(3500)).toContain('card 3');
    expect(calculateEntrancePhaseDescription(4500)).toContain('ante boot');
    expect(calculateEntrancePhaseDescription(5500)).toContain('player cards');
  });

  test('resolveEntranceState yields final values when complete is true', () => {
    const resolved = resolveEntranceState(true, 0, 200);
    expect(resolved.displayedPot).toBe(200);
    expect(resolved.timeline.visibleCardCount).toBe(3);
    expect(resolved.timeline.isEntranceComplete).toBe(true);
    expect(resolved.justDealtCardIndex).toBe(-1);
    expect(resolved.phaseDescription).toBe('Round ready');
  });

  test('harness mounts and provides entrance animation progression', () => {
    const harness = mountEntranceAnimationHarness(100);
    const result = harness.getResult();

    expect(result).not.toBeNull();
    expect(typeof result.isEntranceActive).toBe('boolean');
    expect(typeof result.visibleCardCount).toBe('number');
    expect(typeof result.phaseDescription).toBe('string');

    harness.unmount();
  });
});
