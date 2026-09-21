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
  setPlayerCount: (count: number) => void;
}

function mountDealSequenceHarness(
  initialEnded: boolean = false,
  initialPlayerCount: number = 2,
) {
  const harnessState: HarnessState = {
    currentInfo: null,
    setEnded: () => {},
    setPlayerCount: () => {},
  };

  function useHarnessComponent() {
    const [isEnded, setIsEnded] = useState(initialEnded);
    const [playerCount, setPlayerCount] = useState(initialPlayerCount);
    harnessState.setEnded = setIsEnded;
    harnessState.setPlayerCount = setPlayerCount;
    harnessState.currentInfo = useDealSequenceTracker(isEnded, playerCount);
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
    setPlayerCount: (nextCount: number) => harnessState.setPlayerCount(nextCount),
    unmount: () => inkInstance.unmount(),
  };
}

describe('useDealSequenceTracker', () => {
  test('starts at dealSequence 1 and isSubsequentRound false on first round', () => {
    const harness = mountDealSequenceHarness(false, 2);
    expect(harness.getInfo().dealSequence).toBe(1);
    expect(harness.getInfo().isSubsequentRound).toBe(false);
    expect(harness.getInfo().isPlayerCountChanged).toBe(false);
    harness.unmount();
  });

  test('keeps dealSequence 1 while round is ended and increments to 2 when next round starts', async () => {
    const harness = mountDealSequenceHarness(false, 2);
    expect(harness.getInfo().dealSequence).toBe(1);

    harness.setEnded(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(harness.getInfo().dealSequence).toBe(1);

    harness.setEnded(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(harness.getInfo().dealSequence).toBe(2);
    expect(harness.getInfo().isSubsequentRound).toBe(true);
    expect(harness.getInfo().isPlayerCountChanged).toBe(false);

    harness.unmount();
  });

  test('increments dealSequence on subsequent round transitions', async () => {
    const harness = mountDealSequenceHarness(false, 2);

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

  test('flags isPlayerCountChanged as true when player count increases on next deal', async () => {
    const harness = mountDealSequenceHarness(false, 2);

    harness.setEnded(true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    harness.setPlayerCount(3);
    await new Promise((resolve) => setTimeout(resolve, 30));
    harness.setEnded(false);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(harness.getInfo().dealSequence).toBe(2);
    expect(harness.getInfo().isPlayerCountChanged).toBe(true);

    harness.setEnded(true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    harness.setEnded(false);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(harness.getInfo().dealSequence).toBe(3);
    expect(harness.getInfo().isPlayerCountChanged).toBe(false);

    harness.unmount();
  });
});
