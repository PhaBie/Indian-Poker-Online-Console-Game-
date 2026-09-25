import React from 'react';
import { describe, expect, test } from 'bun:test';
import { renderToString } from 'ink';
import { TerminalOutOfRangeScreen } from '../../../src/client/ui/shared/components/ScreenSizeGuard';

describe('terminal resize', () => {
  test('does not render a huge warning canvas after extreme zoom out', () => {
    const output = renderToString(
      <TerminalOutOfRangeScreen
        currentColumns={1000}
        currentRows={500}
        status="TOO_LARGE"
      />,
      { columns: 1000 },
    );

    expect(output).toContain('TERMINAL WINDOW TOO LARGE');
    expect(output.length).toBeLessThan(2500);
  });
});
