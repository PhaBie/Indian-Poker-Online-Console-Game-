import { Text } from 'ink';
import { useEffect, useState } from 'react';

const TURN_BADGE_BLINK_INTERVAL_MS = 600;
const TURN_BADGE_LABEL = '[TURN]';
const TURN_BADGE_BLANK_PLACEHOLDER = '      ';

export interface PlayerBadgeIndicatorProps {
  readonly label: string | null;
  readonly color: string;
  readonly isThisPlayerTurn: boolean;
}

export function PlayerBadgeIndicator({
  label,
  color,
  isThisPlayerTurn,
}: PlayerBadgeIndicatorProps) {
  const [isTurnBlinkVisible, setIsTurnBlinkVisible] = useState(true);

  useEffect(() => {
    if (!isThisPlayerTurn || label !== TURN_BADGE_LABEL) {
      setIsTurnBlinkVisible(true);
      return;
    }

    const blinkTimer = setInterval(() => {
      setIsTurnBlinkVisible((previousVisibility) => !previousVisibility);
    }, TURN_BADGE_BLINK_INTERVAL_MS);

    return () => clearInterval(blinkTimer);
  }, [isThisPlayerTurn, label]);

  if (!label) {
    return <Text color="gray">ACTIVE</Text>;
  }

  if (label === TURN_BADGE_LABEL && isThisPlayerTurn) {
    return (
      <Text color={color} bold>
        {isTurnBlinkVisible ? TURN_BADGE_LABEL : TURN_BADGE_BLANK_PLACEHOLDER}
      </Text>
    );
  }

  return <Text color={color}>{label}</Text>;
}
