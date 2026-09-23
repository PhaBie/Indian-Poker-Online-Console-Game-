import fs from 'fs';
import { useState, useEffect } from 'react';

export interface TerminalDimensions {
  readonly columns: number;
  readonly rows: number;
  readonly isWideScreen: boolean;
}

const WIDE_SCREEN_COLUMN_THRESHOLD = 85;

export const TERMINAL_CLEAR_SEQUENCE = '\x1b[2J\x1b[3J\x1b[H\x1b[0m';
export const HIDE_CURSOR_SEQUENCE = '\x1b[?25l';
export const SHOW_CURSOR_SEQUENCE = '\x1b[?25h';

function writeEscapeSequence(sequence: string): void {
  try {
    if (process.stdout.isTTY) {
      fs.writeSync(1, sequence);
      return;
    }
  } catch {
    // Fallback if fs.writeSync is unavailable
  }

  try {
    process.stdout.write(sequence);
  } catch {
    // Ignore if stream closed
  }
}

export function hideTerminalCursor(): void {
  writeEscapeSequence(HIDE_CURSOR_SEQUENCE);
}

export function showTerminalCursor(): void {
  writeEscapeSequence(SHOW_CURSOR_SEQUENCE);
}

export interface ClearTerminalOptions {
  readonly shouldRestoreCursor?: boolean;
}

export function clearTerminalScreen(options?: ClearTerminalOptions): void {
  const shouldRestoreCursor = options?.shouldRestoreCursor ?? false;
  const cursorSequence = shouldRestoreCursor
    ? SHOW_CURSOR_SEQUENCE
    : HIDE_CURSOR_SEQUENCE;
  writeEscapeSequence(`${TERMINAL_CLEAR_SEQUENCE}${cursorSequence}`);
}

export function getTerminalDimensions(): { columns: number; rows: number } {
  const terminalColumns = process.stdout.columns || 80;
  const terminalRows = process.stdout.rows || 24;
  return { columns: terminalColumns, rows: terminalRows };
}

export function useTerminalSize(): TerminalDimensions {
  const [dimensions, setDimensions] = useState(getTerminalDimensions);

  useEffect(() => {
    const handleTerminalResize = () => {
      setDimensions(getTerminalDimensions());
    };

    process.stdout.on('resize', handleTerminalResize);
    return () => {
      process.stdout.off('resize', handleTerminalResize);
    };
  }, []);

  const isWideScreen = dimensions.columns >= WIDE_SCREEN_COLUMN_THRESHOLD;

  return {
    columns: dimensions.columns,
    rows: dimensions.rows,
    isWideScreen,
  };
}
