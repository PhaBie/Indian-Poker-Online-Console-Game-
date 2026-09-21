import { describe, expect, test } from 'bun:test';
import { createElement, useState } from 'react';
import { PassThrough, Writable } from 'stream';
import { render } from 'ink';
import {
  usePotPaymentAnimation,
  POT_COUNT_UP_TOTAL_STEPS,
  POT_COUNT_UP_INTERVAL_MS,
  POT_FLASH_PULSE_DURATION_MS,
  POT_FLASH_TOTAL_STEPS,
} from '../../../src/client/ui/screens/game/usePotPaymentAnimation';

interface AnimationHarnessState {
  currentResult: ReturnType<typeof usePotPaymentAnimation> | null;
  updatePot: (newPotAmount: number) => void;
  updateTurn: (newTurnPlayerId: string | null) => void;
}

function mountPotAnimationHarness(
  initialPotAmount: number,
  initialTurnPlayerId: string | null,
) {
  const harnessState: AnimationHarnessState = {
    currentResult: null,
    updatePot: () => {},
    updateTurn: () => {},
  };

  function useAnimationHarness() {
    const [potAmount, setPotAmount] = useState(initialPotAmount);
    const [turnPlayerId, setTurnPlayerId] = useState(initialTurnPlayerId);
    harnessState.updatePot = setPotAmount;
    harnessState.updateTurn = setTurnPlayerId;
    harnessState.currentResult = usePotPaymentAnimation(potAmount, turnPlayerId);
    return null;
  }

  const outputStream = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });

  const inkInstance = render(createElement(useAnimationHarness), {
    stdout: outputStream as unknown as NodeJS.WriteStream,
    stderr: outputStream as unknown as NodeJS.WriteStream,
    stdin: new PassThrough() as unknown as NodeJS.ReadStream,
    exitOnCtrlC: false,
    patchConsole: false,
  });

  return {
    getResult: () => harnessState.currentResult!,
    updatePot: (nextPotAmount: number) => harnessState.updatePot(nextPotAmount),
    updateTurn: (nextTurnPlayerId: string | null) =>
      harnessState.updateTurn(nextTurnPlayerId),
    unmount: () => inkInstance.unmount(),
  };
}

describe('usePotPaymentAnimation', () => {
  test('initializes in non-blinking state with amount visible and incoming turn player', () => {
    const harness = mountPotAnimationHarness(150, 'player_alpha');
    const result = harness.getResult();

    expect(result.isPotBlinking).toBe(false);
    expect(result.isAmountVisible).toBe(true);
    expect(result.displayedPotAmount).toBe(150);
    expect(result.effectiveTurnPlayerId).toBe('player_alpha');

    harness.unmount();
  });

  test('suppresses incoming turn synchronously in initial render when pot increases', async () => {
    const harness = mountPotAnimationHarness(150, 'player_alpha');
    harness.updateTurn('player_next');
    harness.updatePot(200);
    await Bun.sleep(10);

    const result = harness.getResult();
    expect(result.isPotBlinking).toBe(true);
    expect(result.effectiveTurnPlayerId).toBeNull();

    harness.unmount();
  });

  test('activates count up state and holds effective turn as null when pot increases', async () => {
    const harness = mountPotAnimationHarness(150, 'player_next');
    harness.updatePot(200);
    await Bun.sleep(10);

    const result = harness.getResult();
    expect(result.isPotBlinking).toBe(true);
    expect(result.isAmountVisible).toBe(true);
    expect(result.effectiveTurnPlayerId).toBeNull();
    expect(result.displayedPotAmount).toBeGreaterThanOrEqual(150);
    expect(result.displayedPotAmount).toBeLessThanOrEqual(200);

    harness.unmount();
  });

  test('toggles amount visibility during pulses while holding turn as null', async () => {
    const harness = mountPotAnimationHarness(150, 'player_next');
    harness.updatePot(200);
    await Bun.sleep(10);

    expect(harness.getResult().isAmountVisible).toBe(true);
    expect(harness.getResult().effectiveTurnPlayerId).toBeNull();

    await Bun.sleep(
      POT_COUNT_UP_INTERVAL_MS * POT_COUNT_UP_TOTAL_STEPS +
        POT_FLASH_PULSE_DURATION_MS +
        80,
    );
    expect(harness.getResult().isAmountVisible).toBe(false);
    expect(harness.getResult().effectiveTurnPlayerId).toBeNull();

    await Bun.sleep(POT_FLASH_PULSE_DURATION_MS);
    expect(harness.getResult().isAmountVisible).toBe(true);
    expect(harness.getResult().effectiveTurnPlayerId).toBeNull();

    await Bun.sleep(POT_FLASH_PULSE_DURATION_MS);
    expect(harness.getResult().isAmountVisible).toBe(false);
    expect(harness.getResult().effectiveTurnPlayerId).toBeNull();

    harness.unmount();
  });

  test('does not blink or hold turn when pot decreases or resets', async () => {
    const harness = mountPotAnimationHarness(500, 'player_alpha');
    harness.updatePot(150);
    await Bun.sleep(10);

    const result = harness.getResult();
    expect(result.isPotBlinking).toBe(false);
    expect(result.isAmountVisible).toBe(true);
    expect(result.displayedPotAmount).toBe(150);
    expect(result.effectiveTurnPlayerId).toBe('player_alpha');

    harness.unmount();
  });

  test('restores effective turn player and solid amount visibility when blinking completes', async () => {
    const harness = mountPotAnimationHarness(150, 'player_next');
    harness.updatePot(200);
    await Bun.sleep(10);

    expect(harness.getResult().isPotBlinking).toBe(true);
    expect(harness.getResult().effectiveTurnPlayerId).toBeNull();

    await Bun.sleep(
      POT_COUNT_UP_INTERVAL_MS * POT_COUNT_UP_TOTAL_STEPS +
        POT_FLASH_PULSE_DURATION_MS * POT_FLASH_TOTAL_STEPS +
        80,
    );

    const result = harness.getResult();
    expect(result.isPotBlinking).toBe(false);
    expect(result.isAmountVisible).toBe(true);
    expect(result.displayedPotAmount).toBe(200);
    expect(result.effectiveTurnPlayerId).toBe('player_next');

    harness.unmount();
  });
});
