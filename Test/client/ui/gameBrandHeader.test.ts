import { describe, expect, test } from 'bun:test';
import { getHostTableLabel } from '../../../src/client/ui/screens/game/GameBrandHeader';

describe('getHostTableLabel', () => {
  test('labels a table with its host name', () => {
    expect(getHostTableLabel('Thanathon')).toBe("Thanathon's Table");
  });

  test('uses a natural possessive for a host name ending in s', () => {
    expect(getHostTableLabel('James')).toBe("James' Table");
  });

  test('uses a generic label when host details are unavailable', () => {
    expect(getHostTableLabel(undefined)).toBe('Private Table');
  });
});
