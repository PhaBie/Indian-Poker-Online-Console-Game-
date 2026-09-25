export const CONTAINER_BREAKPOINTS = {
  small: { maxColumns: 120, baseWidth: 66 },
  medium: { maxColumns: 160, baseWidth: 66, growthRate: 0.1 },
  large: { maxColumns: 200, baseWidth: 70, growthRate: 0.45 },
  extraLarge: { baseWidth: 88, growthRate: 0.2, maxWidth: 92 },
} as const;

export function getGameContainerWidth(terminalColumns: number): number {
  const { small, medium, large, extraLarge } = CONTAINER_BREAKPOINTS;
  if (terminalColumns <= small.maxColumns) {
    return small.baseWidth;
  }
  if (terminalColumns <= medium.maxColumns) {
    return Math.round(
      medium.baseWidth + (terminalColumns - small.maxColumns) * medium.growthRate,
    );
  }
  if (terminalColumns <= large.maxColumns) {
    return Math.round(
      large.baseWidth + (terminalColumns - medium.maxColumns) * large.growthRate,
    );
  }
  return Math.min(
    extraLarge.maxWidth,
    Math.round(
      extraLarge.baseWidth + (terminalColumns - large.maxColumns) * extraLarge.growthRate,
    ),
  );
}
