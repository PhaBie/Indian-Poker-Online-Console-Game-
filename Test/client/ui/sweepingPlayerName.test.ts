import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { PassThrough, Writable } from 'stream';
import { render } from 'ink';
import {
  calculateCharacterGlowColor,
  SweepingPlayerName,
} from '../../../src/client/ui/screens/game/SweepingPlayerName';

describe('SweepingPlayerName', () => {
  test('calculateCharacterGlowColor returns peak white bold when beam matches character index', () => {
    const result = calculateCharacterGlowColor(2, 2);
    expect(result.color).toBe('white');
    expect(result.isBold).toBe(true);
  });

  test('calculateCharacterGlowColor returns cyanBright bold for adjacent characters', () => {
    const leftAdjacent = calculateCharacterGlowColor(1, 2);
    expect(leftAdjacent.color).toBe('cyanBright');
    expect(leftAdjacent.isBold).toBe(true);

    const rightAdjacent = calculateCharacterGlowColor(3, 2);
    expect(rightAdjacent.color).toBe('cyanBright');
    expect(rightAdjacent.isBold).toBe(true);
  });

  test('calculateCharacterGlowColor returns cyan for distance of two characters', () => {
    const leftDistanceTwo = calculateCharacterGlowColor(0, 2);
    expect(leftDistanceTwo.color).toBe('cyan');
    expect(leftDistanceTwo.isBold).toBe(false);

    const rightDistanceTwo = calculateCharacterGlowColor(4, 2);
    expect(rightDistanceTwo.color).toBe('cyan');
    expect(rightDistanceTwo.isBold).toBe(false);
  });

  test('calculateCharacterGlowColor returns gray for distant characters', () => {
    const distant = calculateCharacterGlowColor(10, 2);
    expect(distant.color).toBe('gray');
    expect(distant.isBold).toBe(false);
  });

  test('SweepingPlayerName renders name successfully without throwing', () => {
    const outputStream = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });

    const inkInstance = render(
      createElement(SweepingPlayerName, {
        name: 'BRAVO',
        elapsedMs: 600,
        durationMs: 1200,
      }),
      {
        stdout: outputStream as unknown as NodeJS.WriteStream,
        stderr: outputStream as unknown as NodeJS.WriteStream,
        stdin: new PassThrough() as unknown as NodeJS.ReadStream,
        exitOnCtrlC: false,
        patchConsole: false,
      },
    );

    expect(inkInstance).toBeDefined();
    inkInstance.unmount();
  });
});
