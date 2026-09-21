import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { PassThrough, Writable } from 'stream';
import { render } from 'ink';
import {
  calculateCharacterGlowColor,
  SweepingPlayerName,
} from '../../../src/client/ui/screens/game/SweepingPlayerName';

describe('SweepingPlayerName', () => {
  test('calculateCharacterGlowColor returns peak yellowBright bold when beam matches character index', () => {
    const result = calculateCharacterGlowColor(2, 2);
    expect(result.color).toBe('yellowBright');
    expect(result.isBold).toBe(true);
  });

  test('calculateCharacterGlowColor returns greenBright bold for adjacent characters', () => {
    const leftAdjacent = calculateCharacterGlowColor(1, 2);
    expect(leftAdjacent.color).toBe('greenBright');
    expect(leftAdjacent.isBold).toBe(true);

    const rightAdjacent = calculateCharacterGlowColor(3, 2);
    expect(rightAdjacent.color).toBe('greenBright');
    expect(rightAdjacent.isBold).toBe(true);
  });

  test('calculateCharacterGlowColor returns green bold for distance of two characters', () => {
    const leftDistanceTwo = calculateCharacterGlowColor(0, 2);
    expect(leftDistanceTwo.color).toBe('green');
    expect(leftDistanceTwo.isBold).toBe(true);

    const rightDistanceTwo = calculateCharacterGlowColor(4, 2);
    expect(rightDistanceTwo.color).toBe('green');
    expect(rightDistanceTwo.isBold).toBe(true);
  });

  test('calculateCharacterGlowColor returns white for distant characters to prevent dullness', () => {
    const distant = calculateCharacterGlowColor(10, 2);
    expect(distant.color).toBe('white');
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
        elapsedMs: 400,
        durationMs: 800,
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
