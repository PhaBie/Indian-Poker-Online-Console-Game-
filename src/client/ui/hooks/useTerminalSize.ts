import { useState, useEffect } from 'react';

export interface TerminalDimensions {
  readonly columns: number;
  readonly rows: number;
  readonly isWideScreen: boolean;
}

const WIDE_SCREEN_COLUMN_THRESHOLD = 85;

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
