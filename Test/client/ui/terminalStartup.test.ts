import { describe, expect, test } from 'bun:test';
import {
  preparePlayableTerminal,
  requestPlayableTerminalSize,
} from '../../../src/client/ui/shared/hooks/useTerminalSize';
import { getTerminalSizeStatus } from '../../../src/client/ui/shared/components/ScreenSizeGuard';

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

  test('does not shrink a large terminal that already fits the game', () => {
    const writes: string[] = [];
    expect(
      requestPlayableTerminalSize({
        isTTY: true,
        columns: 1201,
        rows: 400,
        write: (value) => writes.push(value),
      }),
    ).toBe(false);
    expect(writes).toEqual([]);
  });

  test('maximizes the existing window and reduces its font if resizing alone cannot fit the game', async () => {
    const events: string[] = [];
    const output = {
      isTTY: true,
      columns: 80,
      rows: 24,
      write: (_value: string) => events.push('request'),
    };
    const controller = {
      maximize: () => {
        events.push('maximize');
        output.columns = 120;
        output.rows = 30;
        return true;
      },
      reduceFont: () => {
        events.push('reduceFont');
        output.columns = 150;
        output.rows = 41;
        return true;
      },
      close: () => {},
    };

    await preparePlayableTerminal(output, controller, async () => {});
    expect(events).toEqual(['request', 'maximize', 'reduceFont']);
    expect(getTerminalSizeStatus(output.columns, output.rows)).toBe('OPTIMAL');
  });

  test('stops font changes when the terminal ignores them', async () => {
    let fontAttempts = 0;
    let isClosed = false;
    await preparePlayableTerminal(
      { isTTY: true, columns: 80, rows: 24, write: () => {} },
      {
        maximize: () => true,
        reduceFont: () => {
          fontAttempts++;
          return true;
        },
        close: () => {
          isClosed = true;
        },
      },
      async () => {},
    );

    expect(fontAttempts).toBe(2);
    expect(isClosed).toBe(true);
  });
});
