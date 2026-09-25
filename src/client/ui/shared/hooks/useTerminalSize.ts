import fs from 'fs';
import { useState, useEffect } from 'react';
import {
  GAMEPLAY_WIDTH,
  GAMEPLAY_HEIGHT,
  MAX_TERMINAL_COLUMNS,
  MAX_TERMINAL_ROWS,
} from '../layout/terminalRequirements';

export interface TerminalDimensions {
  readonly columns: number;
  readonly rows: number;
  readonly isWideScreen: boolean;
}

const WIDE_SCREEN_COLUMN_THRESHOLD = 85;

export const TERMINAL_CLEAR_SEQUENCE = '\x1b[2J\x1b[3J\x1b[H\x1b[0m';
export const HIDE_CURSOR_SEQUENCE = '\x1b[?25l';
export const SHOW_CURSOR_SEQUENCE = '\x1b[?25h';

interface ResizableTerminalOutput {
  readonly isTTY?: boolean;
  readonly columns?: number;
  readonly rows?: number;
  write(value: string): unknown;
}

export function requestPlayableTerminalSize(
  output: ResizableTerminalOutput = process.stdout,
): boolean {
  if (!output.isTTY) {
    return false;
  }

  const columns = output.columns ?? 0;
  const rows = output.rows ?? 0;
  if (
    columns >= GAMEPLAY_WIDTH &&
    columns <= MAX_TERMINAL_COLUMNS &&
    rows >= GAMEPLAY_HEIGHT &&
    rows <= MAX_TERMINAL_ROWS
  ) {
    return false;
  }

  try {
    // XTWINOPS asks supported terminals to resize the window in character cells.
    output.write(`\x1b[8;${GAMEPLAY_HEIGHT};${GAMEPLAY_WIDTH}t`);
    return true;
  } catch {
    return false;
  }
}

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
