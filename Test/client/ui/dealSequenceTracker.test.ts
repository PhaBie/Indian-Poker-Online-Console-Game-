import { describe, expect, test } from 'bun:test';
import { createElement, useState } from 'react';
import { PassThrough, Writable } from 'stream';
import { render } from 'ink';
import {
  useDealSequenceTracker,
  type DealSequenceInfo,
} from '../../../src/client/ui/screens/game/useDealSequenceTracker';

interface HarnessState {
  currentInfo: DealSequenceInfo | null;
  setEnded: (ended: boolean) => void;
}

function mountDealSequenceHarness(initialEnded: boolean = false) {
  const harnessState: HarnessState = {
    currentInfo: null,
    setEnded: () => {},
  };

  function useHarnessComponent() {
    const [isEnded, setIsEnded] = useState(initialEnded);
    harnessState.setEnded = setIsEnded;
    harnessState.currentInfo = useDealSequenceTracker(isEnded);
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
    getInfo: () => harnessState.currentInfo!,
    setEnded: (nextEnded: boolean) => harnessState.setEnded(nextEnded),
    unmount: () => inkInstance.unmount(),
  };
}

describe('useDealSequenceTracker', () => {
  test('starts at dealSequence 1 and isSubsequentRound false on first round', () => {
    const harness = mountDealSequenceHarness(false);
    expect(harness.getInfo().dealSequence).toBe(1);
    expect(harness.getInfo().isSubsequentRound).toBe(false);
    harness.unmount();
  });

  test('keeps dealSequence 1 while round is ended and increments to 2 when next round starts', async () => {
    const harness = mountDealSequenceHarness(false);
    expect(harness.getInfo().dealSequence).toBe(1);

    harness.setEnded(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(harness.getInfo().dealSequence).toBe(1);

    harness.setEnded(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(harness.getInfo().dealSequence).toBe(2);
    expect(harness.getInfo().isSubsequentRound).toBe(true);

    harness.unmount();
  });

  test('increments dealSequence on subsequent round transitions', async () => {
    const harness = mountDealSequenceHarness(false);

    harness.setEnded(true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    harness.setEnded(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(harness.getInfo().dealSequence).toBe(2);

    harness.setEnded(true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    harness.setEnded(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(harness.getInfo().dealSequence).toBe(3);
    expect(harness.getInfo().isSubsequentRound).toBe(true);

    harness.unmount();
  });
});
