import { describe, expect, test } from 'bun:test';
import { createElement, useLayoutEffect } from 'react';
import { PassThrough, Writable } from 'stream';
import { render } from 'ink';
import {
  isMusicToggleInput,
  useGameMusic,
} from '../../../01-Source-code/client/ui/screens/game/useGameMusic';

describe('game music shortcut', () => {
  test('M toggles music in either letter case', () => {
    expect(isMusicToggleInput('m', { ctrl: false, meta: false })).toBe(true);
    expect(isMusicToggleInput('M', { ctrl: false, meta: false })).toBe(true);
  });

  test('other keys and modified M do not toggle music', () => {
    expect(isMusicToggleInput('n', { ctrl: false, meta: false })).toBe(false);
    expect(isMusicToggleInput('m', { ctrl: true, meta: false })).toBe(false);
    expect(isMusicToggleInput('m', { ctrl: false, meta: true })).toBe(false);
  });

  test('M toggles the mounted game music state without leaving the game', async () => {
    const previousVolume = process.env.POKER_MUSIC_VOLUME;
    process.env.POKER_MUSIC_VOLUME = '0';
    let isMuted = false;
    function useHarness() {
      const isCurrentMuted = useGameMusic();
      useLayoutEffect(() => {
        isMuted = isCurrentMuted;
      }, [isCurrentMuted]);
      return null;
    }
    const input = new PassThrough() as PassThrough & {
      isTTY: boolean;
      setRawMode: (mode: boolean) => void;
      ref: () => void;
      unref: () => void;
    };
    input.isTTY = true;
    input.setRawMode = () => {};
    input.ref = () => {};
    input.unref = () => {};
    const output = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });
    const instance = render(createElement(useHarness), {
      stdin: input as unknown as NodeJS.ReadStream,
      stdout: output as NodeJS.WriteStream,
      stderr: output as NodeJS.WriteStream,
      interactive: true,
      patchConsole: false,
    });

    try {
      input.write('m');
      await Bun.sleep(30);
      expect(isMuted).toBe(true);
      input.write('M');
      await Bun.sleep(30);
      expect(isMuted).toBe(false);
    } finally {
      instance.unmount();
      await instance.waitUntilExit();
      if (previousVolume === undefined) delete process.env.POKER_MUSIC_VOLUME;
      else process.env.POKER_MUSIC_VOLUME = previousVolume;
    }
  });
});
