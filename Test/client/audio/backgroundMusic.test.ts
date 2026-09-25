import { describe, expect, test } from 'bun:test';
import { getMusicVolume } from '../../../src/client/audio/backgroundMusic';

describe('background music volume', () => {
  test('keeps the configured volume within the audio player range', () => {
    expect(getMusicVolume('invalid')).toBe(20);
    expect(getMusicVolume('0')).toBe(0);
    expect(getMusicVolume('200')).toBe(100);
  });
});
