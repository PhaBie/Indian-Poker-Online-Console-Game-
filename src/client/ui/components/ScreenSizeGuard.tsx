import { Box, Text } from 'ink';
import { UI_COLORS } from '../theme/colors';

export const MIN_TERMINAL_COLUMNS = 80;
export const MIN_TERMINAL_ROWS = 24;

export function isTerminalSizeSufficient(columns: number, rows: number): boolean {
  return columns >= MIN_TERMINAL_COLUMNS && rows >= MIN_TERMINAL_ROWS;
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
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      paddingY={2}
    >
      <Box
        borderStyle="single"
        borderColor={UI_COLORS.errorRed}
        flexDirection="column"
        paddingX={4}
        paddingY={1}
        alignItems="center"
      >
        <Text bold color={UI_COLORS.errorRed}>
          [!] TERMINAL WINDOW TOO SMALL
        </Text>
        <Box marginY={1} flexDirection="column" alignItems="center">
          <Text color={UI_COLORS.white}>
            Please resize your terminal window for optimal display.
          </Text>
          <Text color={UI_COLORS.dimText}>
            Minimum required: {MIN_TERMINAL_COLUMNS} x {MIN_TERMINAL_ROWS} (Columns x
            Rows)
          </Text>
          <Text color={UI_COLORS.warningYellow}>
            Current size: {currentColumns} x {currentRows}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
