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
  getEntranceMilestones,
} from '../../../src/client/ui/screens/game/useTableEntranceAnimation';

interface EntranceHarnessState {
  currentResult: ReturnType<typeof useTableEntranceAnimation> | null;
  updatePot: (newPot: number) => void;
}

function mountEntranceAnimationHarness(initialPot: number, playerCount: number = 4) {
  const harnessState: EntranceHarnessState = {
    currentResult: null,
    updatePot: () => {},
  };

  function useHarnessComponent() {
    const [currentPot, setCurrentPot] = useState(initialPot);
    harnessState.updatePot = setCurrentPot;
    harnessState.currentResult = useTableEntranceAnimation(currentPot, playerCount, true);
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
  const milestones4P = getEntranceMilestones(4);
  const milestones2P = getEntranceMilestones(2);

  test('getEntranceMilestones gives 8.0s profile for 2 players and 12.0s profile for 4 players', () => {
    expect(milestones2P.totalDurationMs).toBe(8000);
    expect(milestones2P.cardGlowStartMs).toBe(4000);
    expect(milestones2P.cardGlowEndMs).toBe(5200);
    expect(milestones2P.seatSpinStartMs).toBe(5200);
    expect(milestones2P.seatSpinEndMs).toBe(5200);
    expect(milestones2P.nameGlowStartMs).toBe(5200);
    expect(milestones2P.nameGlowEndMs).toBe(6000);
    expect(milestones2P.potStartMs).toBe(6000);
    expect(milestones2P.potCountDoneMs).toBe(7000);

    expect(milestones4P.totalDurationMs).toBe(12000);
    expect(milestones4P.cardGlowStartMs).toBe(4000);
    expect(milestones4P.cardGlowEndMs).toBe(5200);
    expect(milestones4P.seatSpinStartMs).toBe(5200);
    expect(milestones4P.seatSpinEndMs).toBe(9200);
    expect(milestones4P.nameGlowStartMs).toBe(9200);
    expect(milestones4P.nameGlowEndMs).toBe(10000);
    expect(milestones4P.potStartMs).toBe(10000);
    expect(milestones4P.potCountDoneMs).toBe(11000);
  });

  test('calculateEntranceTimeline advances cards, card glow, seat spin, name sweep, and pot for 4 players', () => {
    const stepZero = calculateEntranceTimeline(0, milestones4P);
    expect(stepZero.visibleCardCount).toBe(0);
    expect(stepZero.isDeckPhase).toBe(true);
    expect(stepZero.isEntranceComplete).toBe(false);

    const stepOne = calculateEntranceTimeline(milestones4P.card1Ms + 10, milestones4P);
    expect(stepOne.visibleCardCount).toBe(1);
    expect(stepOne.isDeckPhase).toBe(true);

    const stepTwo = calculateEntranceTimeline(milestones4P.card2Ms + 10, milestones4P);
    expect(stepTwo.visibleCardCount).toBe(2);
    expect(stepTwo.isDeckPhase).toBe(true);

    const stepThree = calculateEntranceTimeline(milestones4P.card3Ms + 10, milestones4P);
    expect(stepThree.visibleCardCount).toBe(3);
    expect(stepThree.isDeckPhase).toBe(true);

    const stepCardGlow = calculateEntranceTimeline(
      milestones4P.cardGlowStartMs + 50,
      milestones4P,
    );
    expect(stepCardGlow.isCardGlowPhase).toBe(true);
    expect(stepCardGlow.isDeckPhase).toBe(false);
    expect(stepCardGlow.isSeatSpinning).toBe(false);
    expect(stepCardGlow.isPlayersSeated).toBe(false);

    const stepSpin = calculateEntranceTimeline(
      milestones4P.seatSpinStartMs + 50,
      milestones4P,
    );
    expect(stepSpin.isSeatSpinning).toBe(true);
    expect(stepSpin.isDeckPhase).toBe(false);
    expect(stepSpin.isPlayersSeated).toBe(false);

    const stepNameGlow = calculateEntranceTimeline(
      milestones4P.nameGlowStartMs + 50,
      milestones4P,
    );
    expect(stepNameGlow.isNameGlowPhase).toBe(true);
    expect(stepNameGlow.isPlayersSeated).toBe(true);

    const stepPot = calculateEntranceTimeline(milestones4P.potStartMs + 50, milestones4P);
    expect(stepPot.isPotCountUpPhase).toBe(true);
    expect(stepPot.isDeckPhase).toBe(false);

    const stepBlink = calculateEntranceTimeline(
      milestones4P.potCountDoneMs + 50,
      milestones4P,
    );
    expect(stepBlink.isPotBlinkingPhase).toBe(true);

    const stepDone = calculateEntranceTimeline(
      milestones4P.totalDurationMs + 10,
      milestones4P,
    );
    expect(stepDone.visibleCardCount).toBe(3);
    expect(stepDone.isEntranceComplete).toBe(true);
  });

  test('calculateEntranceTimeline bypasses seat spin and plays name sweep directly after card glow for 2 players', () => {
    const stepCardGlow2P = calculateEntranceTimeline(
      milestones2P.cardGlowStartMs + 50,
      milestones2P,
    );
    expect(stepCardGlow2P.isCardGlowPhase).toBe(true);
    expect(stepCardGlow2P.isSeatSpinning).toBe(false);

    const stepNameGlow2P = calculateEntranceTimeline(
      milestones2P.nameGlowStartMs + 50,
      milestones2P,
    );
    expect(stepNameGlow2P.isSeatSpinning).toBe(false);
    expect(stepNameGlow2P.isNameGlowPhase).toBe(true);
    expect(stepNameGlow2P.isPlayersSeated).toBe(true);

    const stepPot2P = calculateEntranceTimeline(
      milestones2P.potStartMs + 50,
      milestones2P,
    );
    expect(stepPot2P.isPotCountUpPhase).toBe(true);
  });

  test('calculateEntrancePot counts up pot proportionally after boot step until pot count done', () => {
    expect(calculateEntrancePot(0, 100, milestones4P)).toBe(0);
    expect(calculateEntrancePot(milestones4P.potStartMs - 50, 100, milestones4P)).toBe(0);
    expect(calculateEntrancePot(milestones4P.potStartMs, 100, milestones4P)).toBe(0);

    const midElapsedMs =
      milestones4P.potStartMs +
      (milestones4P.potCountDoneMs - milestones4P.potStartMs) / 2;
    expect(calculateEntrancePot(midElapsedMs, 100, milestones4P)).toBe(50);
    expect(calculateEntrancePot(milestones4P.potCountDoneMs, 100, milestones4P)).toBe(
      100,
    );
    expect(calculateEntrancePot(milestones4P.totalDurationMs, 100, milestones4P)).toBe(
      100,
    );
  });

  test('calculateJustDealtCardIndex identifies landing card by timing window', () => {
    expect(calculateJustDealtCardIndex(500)).toBe(-1);
    expect(calculateJustDealtCardIndex(1100)).toBe(0);
    expect(calculateJustDealtCardIndex(2100)).toBe(1);
    expect(calculateJustDealtCardIndex(3100)).toBe(2);
    expect(calculateJustDealtCardIndex(4500)).toBe(-1);
  });

  test('calculateEntrancePhaseDescription returns descriptive status for each stage in 4-player game', () => {
    expect(calculateEntrancePhaseDescription(500, milestones4P)).toContain('Shuffling');
    expect(calculateEntrancePhaseDescription(1500, milestones4P)).toContain('card 1');
    expect(calculateEntrancePhaseDescription(2500, milestones4P)).toContain('card 2');
    expect(calculateEntrancePhaseDescription(3500, milestones4P)).toContain('card 3');
    expect(calculateEntrancePhaseDescription(4500, milestones4P)).toContain(
      'border glow',
    );
    expect(calculateEntrancePhaseDescription(6500, milestones4P)).toContain(
      'Randomizing',
    );
    expect(calculateEntrancePhaseDescription(9500, milestones4P)).toContain('Welcoming');
    expect(calculateEntrancePhaseDescription(10500, milestones4P)).toContain('ante boot');
    expect(calculateEntrancePhaseDescription(11500, milestones4P)).toContain(
      'first turn',
    );
  });

  test('calculateEntrancePhaseDescription returns descriptive status for 2-player game without randomization', () => {
    expect(calculateEntrancePhaseDescription(4500, milestones2P)).toContain(
      'border glow',
    );
    expect(calculateEntrancePhaseDescription(5500, milestones2P)).toContain('Welcoming');
    expect(calculateEntrancePhaseDescription(6500, milestones2P)).toContain('ante boot');
  });

  test('resolveEntranceState yields final values when complete is true', () => {
    const resolved = resolveEntranceState(true, 0, 200, milestones4P);
    expect(resolved.displayedPot).toBe(200);
    expect(resolved.timeline.visibleCardCount).toBe(3);
    expect(resolved.timeline.isEntranceComplete).toBe(true);
    expect(resolved.justDealtCardIndex).toBe(-1);
    expect(resolved.phaseDescription).toBe('Round ready');
  });

  test('harness mounts and provides entrance animation progression', () => {
    const harness = mountEntranceAnimationHarness(100, 4);
    const result = harness.getResult();

    expect(result).not.toBeNull();
    expect(typeof result.isEntranceActive).toBe('boolean');
    expect(typeof result.visibleCardCount).toBe('number');
    expect(typeof result.phaseDescription).toBe('string');

    harness.unmount();
  });
});
