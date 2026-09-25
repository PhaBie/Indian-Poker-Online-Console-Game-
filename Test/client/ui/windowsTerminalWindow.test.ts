import { expect, test } from 'bun:test';
import { buildDecreaseFontInput } from '../../../src/client/ui/shared/windows/windowsTerminalWindow';

test('Windows font shortcut releases both keys after Ctrl+Minus', () => {
  const input = buildDecreaseFontInput();
  const view = new DataView(input.buffer);
  const keys = [0x11, 0xbd, 0xbd, 0x11];
  const flags = [0, 0, 2, 2];

  for (let index = 0; index < 4; index++) {
    const offset = index * 40;
    expect(view.getUint32(offset, true)).toBe(1);
    expect(view.getUint16(offset + 8, true)).toBe(keys[index]);
    expect(view.getUint32(offset + 12, true)).toBe(flags[index]);
  }
});
