import { describe, expect, test } from 'bun:test';
import { requestPlayableTerminalSize } from '../../../src/client/ui/shared/hooks/useTerminalSize';

describe('terminal startup', () => {
  test('requests the full game size when the terminal starts too small', () => {
    const writes: string[] = [];
    const output = {
      isTTY: true,
      columns: 120,
      rows: 30,
      write: (value: string) => writes.push(value),
    };

    expect(requestPlayableTerminalSize(output)).toBe(true);
    expect(writes).toEqual(['\x1b[8;41;150t']);
  });

  test('does not resize a playable terminal or write to a pipe', () => {
    const writes: string[] = [];
    const write = (value: string) => writes.push(value);

    expect(
      requestPlayableTerminalSize({ isTTY: true, columns: 160, rows: 45, write }),
    ).toBe(false);
    expect(
      requestPlayableTerminalSize({ isTTY: false, columns: 80, rows: 24, write }),
    ).toBe(false);
    expect(writes).toEqual([]);
  });

  test('requests a playable size when a terminal is too large', () => {
    const writes: string[] = [];
    expect(
      requestPlayableTerminalSize({
        isTTY: true,
        columns: 240,
        rows: 60,
        write: (value) => writes.push(value),
      }),
    ).toBe(true);
    expect(writes).toEqual(['\x1b[8;41;150t']);
  });
});
