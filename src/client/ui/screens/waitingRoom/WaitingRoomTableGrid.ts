export const WAITING_ROOM_COLUMN_WIDTHS = {
  seat: 5,
  player: 22,
  role: 13,
  status: 17,
} as const;

export const WAITING_ROOM_TABLE_WIDTH =
  Object.values(WAITING_ROOM_COLUMN_WIDTHS).reduce((total, width) => total + width, 0) + 5;

function isWideTerminalCharacter(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1faff)
  );
}

export function getTerminalTextWidth(value: string): number {
  let width = 0;
  for (const character of Array.from(value)) {
    if (/\p{Mark}/u.test(character)) continue;
    width += isWideTerminalCharacter(character.codePointAt(0) ?? 0) ? 2 : 1;
  }
  return width;
}

function truncateToTerminalWidth(value: string, maxWidth: number): string {
  let width = 0;
  let result = '';
  for (const character of Array.from(value)) {
    const characterWidth = /\p{Mark}/u.test(character)
      ? 0
      : isWideTerminalCharacter(character.codePointAt(0) ?? 0)
        ? 2
        : 1;
    if (width + characterWidth > maxWidth) break;
    result += character;
    width += characterWidth;
  }
  return result;
}

export function formatWaitingRoomCell(
  value: string,
  width: number,
  alignment: 'left' | 'center' = 'left',
): string {
  const availableWidth = Math.max(0, width - 2);
  const truncated = truncateToTerminalWidth(value, availableWidth);
  const remaining = availableWidth - getTerminalTextWidth(truncated);

  if (alignment === 'center') {
    const leftPadding = Math.floor(remaining / 2);
    return ` ${' '.repeat(leftPadding)}${truncated}${' '.repeat(remaining - leftPadding)} `;
  }

  return ` ${truncated}${' '.repeat(remaining)} `;
}

export function buildWaitingRoomBorder(left: string, junction: string, right: string): string {
  const segments = Object.values(WAITING_ROOM_COLUMN_WIDTHS).map((width) => '─'.repeat(width));
  return `${left}${segments.join(junction)}${right}`;
}
