import { Text } from 'ink';

export interface SweepingPlayerNameProps {
  readonly name: string;
  readonly elapsedMs: number;
  readonly durationMs?: number;
}

export const DEFAULT_NAME_SWEEP_DURATION_MS = 1200;

export function calculateCharacterGlowColor(
  characterIndex: number,
  activeBeamIndex: number,
): { readonly color: string; readonly isBold: boolean } {
  const distance = Math.abs(characterIndex - activeBeamIndex);
  if (distance === 0) {
    return { color: 'white', isBold: true };
  }
  if (distance === 1) {
    return { color: 'cyanBright', isBold: true };
  }
  if (distance === 2) {
    return { color: 'cyan', isBold: false };
  }
  return { color: 'gray', isBold: false };
}

export function SweepingPlayerName({
  name,
  elapsedMs,
  durationMs = DEFAULT_NAME_SWEEP_DURATION_MS,
}: SweepingPlayerNameProps) {
  const characters = Array.from(name);
  const totalSteps = characters.length + 2;
  const progress = Math.min(1, Math.max(0, elapsedMs / durationMs));
  const activeBeamIndex = Math.floor(progress * totalSteps) - 1;

  return (
    <Text>
      {characters.map((character, index) => {
        const { color, isBold } = calculateCharacterGlowColor(index, activeBeamIndex);
        return (
          <Text key={`${character}-${index}`} color={color} bold={isBold}>
            {character}
          </Text>
        );
      })}
    </Text>
  );
}
