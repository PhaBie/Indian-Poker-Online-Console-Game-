import { Box, Text, useInput } from 'ink';
import { UI_COLORS } from '../theme/colors';
import {
  GAMEPLAY_WIDTH,
  GAMEPLAY_HEIGHT,
  MAX_TERMINAL_COLUMNS,
  MAX_TERMINAL_ROWS,
} from '../layout/terminalRequirements';

export const MIN_TERMINAL_COLUMNS = GAMEPLAY_WIDTH;
export const MIN_TERMINAL_ROWS = GAMEPLAY_HEIGHT;
export { MAX_TERMINAL_COLUMNS, MAX_TERMINAL_ROWS } from '../layout/terminalRequirements';

export type TerminalSizeStatus = 'OPTIMAL' | 'TOO_SMALL' | 'TOO_LARGE';

export function isTerminalSizeSufficient(columns: number, rows: number): boolean {
  return columns >= MIN_TERMINAL_COLUMNS && rows >= MIN_TERMINAL_ROWS;
}

export function isTerminalSizeOptimal(columns: number, rows: number): boolean {
  return (
    columns >= MIN_TERMINAL_COLUMNS &&
    columns <= MAX_TERMINAL_COLUMNS &&
    rows >= MIN_TERMINAL_ROWS &&
    rows <= MAX_TERMINAL_ROWS
  );
}

export function getTerminalSizeStatus(columns: number, rows: number): TerminalSizeStatus {
  if (columns < MIN_TERMINAL_COLUMNS || rows < MIN_TERMINAL_ROWS) {
    return 'TOO_SMALL';
  }
  if (columns > MAX_TERMINAL_COLUMNS || rows > MAX_TERMINAL_ROWS) {
    return 'TOO_LARGE';
  }
  return 'OPTIMAL';
}

export interface TerminalOutOfRangeProps {
  readonly currentColumns: number;
  readonly currentRows: number;
  readonly status: 'TOO_SMALL' | 'TOO_LARGE';
  readonly minimumColumns?: number;
  readonly minimumRows?: number;
  readonly onExit?: () => void;
}

interface OutOfRangeContentProps {
  readonly currentColumns: number;
  readonly currentRows: number;
  readonly status: 'TOO_SMALL' | 'TOO_LARGE';
  readonly minimumColumns: number;
  readonly minimumRows: number;
}

function TerminalOutOfRangeContent({
  currentColumns,
  currentRows,
  status,
  minimumColumns,
  minimumRows,
}: OutOfRangeContentProps) {
  const isTooSmall = status === 'TOO_SMALL';
  const headerText = isTooSmall
    ? '[!] TERMINAL WINDOW TOO SMALL (ZOOMED IN)'
    : '[!] TERMINAL WINDOW TOO LARGE (ZOOMED OUT)';
  const tipText = isTooSmall
    ? 'Please zoom out (Ctrl -) or expand your terminal window.'
    : 'Please zoom in (Ctrl +) or reduce your terminal window size.';
  const limitText = isTooSmall
    ? `Minimum required: ${minimumColumns} x ${minimumRows} (Columns x Rows)`
    : `Maximum recommended: ${MAX_TERMINAL_COLUMNS} x ${MAX_TERMINAL_ROWS} (Columns x Rows)`;

  return (
    <Box
      borderStyle="single"
      borderColor={UI_COLORS.errorRed}
      flexDirection="column"
      paddingX={4}
      paddingY={1}
      alignItems="center"
    >
      <Text bold color={UI_COLORS.errorRed}>
        {headerText}
      </Text>
      <Box marginY={1} flexDirection="column" alignItems="center">
        <Text color={UI_COLORS.white}>{tipText}</Text>
        <Text color={UI_COLORS.dimText}>{limitText}</Text>
        <Text color={UI_COLORS.warningYellow}>
          Current size: {currentColumns} x {currentRows}
        </Text>
      </Box>
      <Text color={UI_COLORS.goldHighlight}>
        Tip: Press Ctrl+0 to reset terminal zoom to default (100%)
      </Text>
      <Text color={UI_COLORS.mutedText}>
        Resize now to continue automatically. Press ESC to exit.
      </Text>
    </Box>
  );
}

export function TerminalOutOfRangeScreen({
  currentColumns,
  currentRows,
  status,
  onExit,
  minimumColumns = MIN_TERMINAL_COLUMNS,
  minimumRows = MIN_TERMINAL_ROWS,
}: TerminalOutOfRangeProps) {
  useInput((_, key) => {
    if (key.escape && onExit) {
      onExit();
    }
  });

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width={Math.min(currentColumns, MAX_TERMINAL_COLUMNS)}
      height={Math.min(currentRows, MAX_TERMINAL_ROWS)}
    >
      <TerminalOutOfRangeContent
        currentColumns={currentColumns}
        currentRows={currentRows}
        status={status}
        minimumColumns={minimumColumns}
        minimumRows={minimumRows}
      />
    </Box>
  );
}

export interface TerminalTooSmallProps {
  readonly currentColumns: number;
  readonly currentRows: number;
}

export function TerminalTooSmallScreen({
  currentColumns,
  currentRows,
}: TerminalTooSmallProps) {
  return (
    <TerminalOutOfRangeScreen
      currentColumns={currentColumns}
      currentRows={currentRows}
      status="TOO_SMALL"
    />
  );
}
