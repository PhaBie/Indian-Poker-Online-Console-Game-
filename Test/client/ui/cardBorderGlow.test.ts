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
import { getEntranceMilestones } from '../../../src/client/ui/screens/game/useTableEntranceAnimation';

interface GlowHarnessState {
  currentColors: ReturnType<typeof useCardBorderGlow> | null;
  updateEntranceState: (isEntranceActive: boolean, elapsedMs: number) => void;
}

function mountCardBorderGlowHarness(
  initialEntranceActive: boolean,
  initialElapsedMs: number,
  glowStartMs?: number,
  glowEndMs?: number,
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
    harnessState.currentColors = useCardBorderGlow(
      isEntranceActive,
      elapsedMs,
      glowStartMs,
      glowEndMs,
    );
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
  const milestones4P = getEntranceMilestones(4);
  const milestones2P = getEntranceMilestones(2);

  test('calculateEntranceBorderGlowColors returns default colors before seated players honor milestone', () => {
    expect(
      calculateEntranceBorderGlowColors(
        0,
        milestones4P.cardGlowStartMs,
        milestones4P.cardGlowEndMs,
      ),
    ).toEqual(DEFAULT_CARD_BORDER_COLORS);
    expect(
      calculateEntranceBorderGlowColors(
        1000,
        milestones4P.cardGlowStartMs,
        milestones4P.cardGlowEndMs,
      ),
    ).toEqual(DEFAULT_CARD_BORDER_COLORS);
    expect(
      calculateEntranceBorderGlowColors(
        milestones4P.cardGlowStartMs - 10,
        milestones4P.cardGlowStartMs,
        milestones4P.cardGlowEndMs,
      ),
    ).toEqual(DEFAULT_CARD_BORDER_COLORS);
  });

  test('calculateEntranceBorderGlowColors plays active glow frames for 4 players when seats are locked', () => {
    expect(
      calculateEntranceBorderGlowColors(
        milestones4P.cardGlowStartMs,
        milestones4P.cardGlowStartMs,
        milestones4P.cardGlowEndMs,
      ),
    ).toEqual(CARD_BORDER_GLOW_ACTIVE_FRAMES[0]);

    expect(
      calculateEntranceBorderGlowColors(
        milestones4P.cardGlowStartMs + 140,
        milestones4P.cardGlowStartMs,
        milestones4P.cardGlowEndMs,
      ),
    ).toEqual(CARD_BORDER_GLOW_ACTIVE_FRAMES[1]);

    expect(
      calculateEntranceBorderGlowColors(
        milestones4P.cardGlowStartMs + 280,
        milestones4P.cardGlowStartMs,
        milestones4P.cardGlowEndMs,
      ),
    ).toEqual(CARD_BORDER_GLOW_ACTIVE_FRAMES[2]);
  });

  test('calculateEntranceBorderGlowColors plays active glow frames for 2 players directly after dealing cards', () => {
    expect(
      calculateEntranceBorderGlowColors(
        milestones2P.cardGlowStartMs,
        milestones2P.cardGlowStartMs,
        milestones2P.cardGlowEndMs,
      ),
    ).toEqual(CARD_BORDER_GLOW_ACTIVE_FRAMES[0]);

    expect(
      calculateEntranceBorderGlowColors(
        milestones2P.cardGlowStartMs + 140,
        milestones2P.cardGlowStartMs,
        milestones2P.cardGlowEndMs,
      ),
    ).toEqual(CARD_BORDER_GLOW_ACTIVE_FRAMES[1]);

    expect(
      calculateEntranceBorderGlowColors(
        milestones2P.cardGlowEndMs,
        milestones2P.cardGlowStartMs,
        milestones2P.cardGlowEndMs,
      ),
    ).toEqual(DEFAULT_CARD_BORDER_COLORS);
  });

  test('calculateEntranceBorderGlowColors returns default colors once sweep duration finishes', () => {
    expect(
      calculateEntranceBorderGlowColors(
        milestones4P.cardGlowEndMs,
        milestones4P.cardGlowStartMs,
        milestones4P.cardGlowEndMs,
      ),
    ).toEqual(DEFAULT_CARD_BORDER_COLORS);

    expect(
      calculateEntranceBorderGlowColors(
        milestones4P.totalDurationMs,
        milestones4P.cardGlowStartMs,
        milestones4P.cardGlowEndMs,
      ),
    ).toEqual(DEFAULT_CARD_BORDER_COLORS);
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

  test('harness reflects entrance glow state synchronized with seated players timing', async () => {
    const harness = mountCardBorderGlowHarness(
      true,
      1000,
      milestones4P.cardGlowStartMs,
      milestones4P.cardGlowEndMs,
    );
    expect(harness.getColors()).toEqual(DEFAULT_CARD_BORDER_COLORS);

    harness.updateEntranceState(true, milestones4P.cardGlowStartMs + 50);
    await Bun.sleep(20);
    expect(harness.getColors()).toEqual(CARD_BORDER_GLOW_ACTIVE_FRAMES[0]);

    harness.unmount();
  });
});
