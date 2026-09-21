import { describe, expect, test } from 'bun:test';
import { createElement, useState } from 'react';
import { PassThrough, Writable } from 'stream';
import { render } from 'ink';
import {
  calculateEntranceBorderGlowColors,
  calculatePeriodicBorderGlowColors,
  useCardBorderGlow,
  CARD_BORDER_GLOW_ACTIVE_FRAMES,
  DEFAULT_CARD_BORDER_COLORS,
} from '../../../src/client/ui/screens/game/useCardBorderGlow';
import {
  ENTRANCE_STEP_CARD_GLOW_START_MS,
  ENTRANCE_STEP_CARD_GLOW_END_MS,
  ENTRANCE_TOTAL_DURATION_MS,
} from '../../../src/client/ui/screens/game/useTableEntranceAnimation';

interface GlowHarnessState {
  currentColors: ReturnType<typeof useCardBorderGlow> | null;
  updateEntranceState: (isEntranceActive: boolean, elapsedMs: number) => void;
}

function mountCardBorderGlowHarness(
  initialEntranceActive: boolean,
  initialElapsedMs: number,
) {
  const harnessState: GlowHarnessState = {
    currentColors: null,
    updateEntranceState: () => {},
  };

  function useHarnessComponent() {
    const [isEntranceActive, setIsEntranceActive] = useState(initialEntranceActive);
    const [elapsedMs, setElapsedMs] = useState(initialElapsedMs);
    harnessState.updateEntranceState = (nextEntranceActive, nextElapsedMs) => {
      setIsEntranceActive(nextEntranceActive);
      setElapsedMs(nextElapsedMs);
    };
    harnessState.currentColors = useCardBorderGlow(isEntranceActive, elapsedMs);
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
    getColors: () => harnessState.currentColors!,
    updateEntranceState: (nextEntranceActive: boolean, nextElapsedMs: number) =>
      harnessState.updateEntranceState(nextEntranceActive, nextElapsedMs),
    unmount: () => inkInstance.unmount(),
  };
}

describe('useCardBorderGlow', () => {
  test('calculateEntranceBorderGlowColors returns default colors before dealing cards finishes', () => {
    expect(calculateEntranceBorderGlowColors(0)).toEqual(DEFAULT_CARD_BORDER_COLORS);
    expect(calculateEntranceBorderGlowColors(1000)).toEqual(DEFAULT_CARD_BORDER_COLORS);
    expect(calculateEntranceBorderGlowColors(3500)).toEqual(DEFAULT_CARD_BORDER_COLORS);
    expect(
      calculateEntranceBorderGlowColors(ENTRANCE_STEP_CARD_GLOW_START_MS - 10),
    ).toEqual(DEFAULT_CARD_BORDER_COLORS);
  });

  test('calculateEntranceBorderGlowColors plays active glow frames sequentially right after card dealing finishes', () => {
    expect(calculateEntranceBorderGlowColors(ENTRANCE_STEP_CARD_GLOW_START_MS)).toEqual(
      CARD_BORDER_GLOW_ACTIVE_FRAMES[0],
    );

    expect(
      calculateEntranceBorderGlowColors(ENTRANCE_STEP_CARD_GLOW_START_MS + 90),
    ).toEqual(CARD_BORDER_GLOW_ACTIVE_FRAMES[1]);

    expect(
      calculateEntranceBorderGlowColors(ENTRANCE_STEP_CARD_GLOW_START_MS + 180),
    ).toEqual(CARD_BORDER_GLOW_ACTIVE_FRAMES[2]);

    expect(
      calculateEntranceBorderGlowColors(ENTRANCE_STEP_CARD_GLOW_START_MS + 540),
    ).toEqual(CARD_BORDER_GLOW_ACTIVE_FRAMES[6]);
  });

  test('calculateEntranceBorderGlowColors returns default colors during seat spin and pot payment stages', () => {
    expect(
      calculateEntranceBorderGlowColors(ENTRANCE_STEP_CARD_GLOW_START_MS + 650),
    ).toEqual(DEFAULT_CARD_BORDER_COLORS);

    expect(calculateEntranceBorderGlowColors(ENTRANCE_STEP_CARD_GLOW_END_MS)).toEqual(
      DEFAULT_CARD_BORDER_COLORS,
    );

    expect(calculateEntranceBorderGlowColors(6000)).toEqual(DEFAULT_CARD_BORDER_COLORS);
    expect(calculateEntranceBorderGlowColors(11000)).toEqual(DEFAULT_CARD_BORDER_COLORS);

    expect(calculateEntranceBorderGlowColors(ENTRANCE_TOTAL_DURATION_MS)).toEqual(
      DEFAULT_CARD_BORDER_COLORS,
    );
  });

  test('calculatePeriodicBorderGlowColors returns frame colors when index is within active frames', () => {
    expect(calculatePeriodicBorderGlowColors(0)).toEqual(
      CARD_BORDER_GLOW_ACTIVE_FRAMES[0],
    );
    expect(calculatePeriodicBorderGlowColors(3)).toEqual(
      CARD_BORDER_GLOW_ACTIVE_FRAMES[3],
    );
    expect(calculatePeriodicBorderGlowColors(6)).toEqual(
      CARD_BORDER_GLOW_ACTIVE_FRAMES[6],
    );
    expect(calculatePeriodicBorderGlowColors(7)).toEqual(DEFAULT_CARD_BORDER_COLORS);
    expect(calculatePeriodicBorderGlowColors(50)).toEqual(DEFAULT_CARD_BORDER_COLORS);
  });

  test('harness reflects entrance glow state synchronized with card deal completion timing', async () => {
    const harness = mountCardBorderGlowHarness(true, 1000);
    expect(harness.getColors()).toEqual(DEFAULT_CARD_BORDER_COLORS);

    harness.updateEntranceState(true, ENTRANCE_STEP_CARD_GLOW_START_MS + 40);
    await Bun.sleep(20);
    expect(harness.getColors()).toEqual(CARD_BORDER_GLOW_ACTIVE_FRAMES[0]);

    harness.unmount();
  });
});
