import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ShimmeringHeader } from '../../shared/components/ShimmeringHeader';
import { useTerminalSize } from '../../shared/hooks/useTerminalSize';
import {
  getTerminalSizeStatus,
  TerminalOutOfRangeScreen,
} from '../../shared/components/ScreenSizeGuard';
import { UI_COLORS } from '../../shared/theme/colors';
import { getGameContainerWidth } from '../../shared/layout/gameContainerLayout';

interface ReconnectPromptScreenProps {
  roomId: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function ReconnectPromptScreen({
  roomId,
  onAccept,
  onDecline,
}: ReconnectPromptScreenProps) {
  const { columns, rows } = useTerminalSize();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selection, setSelection] = useState<'Y' | 'N'>('Y');

  useInput((input, key) => {
    if (isSubmitting) return;

    const lowerInput = input.toLowerCase();

    if (key.leftArrow || key.rightArrow) {
      setSelection((prev) => (prev === 'Y' ? 'N' : 'Y'));
    } else if (lowerInput === 'y') {
      setSelection('Y');
      setIsSubmitting(true);
      setTimeout(onAccept, 300);
    } else if (lowerInput === 'n') {
      setSelection('N');
      setIsSubmitting(true);
      setTimeout(onDecline, 300);
    } else if (key.return) {
      setIsSubmitting(true);
      if (selection === 'Y') {
        setTimeout(onAccept, 300);
      } else {
        setTimeout(onDecline, 300);
      }
    }
  });

  const sizeStatus = getTerminalSizeStatus(columns, rows);
  if (sizeStatus !== 'OPTIMAL') {
    return (
      <TerminalOutOfRangeScreen
        currentColumns={columns}
        currentRows={rows}
        status={sizeStatus}
      />
    );
  }

  const containerWidth = getGameContainerWidth(columns);

  return (
    <Box
      flexDirection="column"
      width="100%"
      height={rows}
      alignItems="center"
      justifyContent="center"
    >
      <Box width={containerWidth} flexDirection="column" alignItems="center">
        <ShimmeringHeader containerWidth={containerWidth} />

        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={UI_COLORS.goldBorder}
          paddingX={4}
          paddingY={2}
          marginTop={2}
          alignItems="center"
        >
          <Text color={UI_COLORS.activeGreen} bold>
            ⚠️ PREVIOUS SESSION DETECTED
          </Text>

          <Box marginY={1}>
            <Text>
              You have an ongoing game in room:{' '}
              <Text bold color={UI_COLORS.goldBorder}>
                #{roomId}
              </Text>
            </Text>
          </Box>

          <Box marginY={1}>
            <Text color={UI_COLORS.mutedText}>Do you want to reconnect?</Text>
          </Box>

          <Box flexDirection="row" marginTop={1}>
            <Box
              borderStyle="single"
              borderColor={
                selection === 'Y' ? UI_COLORS.activeGreen : UI_COLORS.mutedText
              }
              paddingX={2}
              marginRight={2}
            >
              <Text
                color={selection === 'Y' ? UI_COLORS.activeGreen : UI_COLORS.mutedText}
                bold={selection === 'Y'}
              >
                [Y] Yes
              </Text>
            </Box>
            <Box
              borderStyle="single"
              borderColor={selection === 'N' ? UI_COLORS.activeRed : UI_COLORS.mutedText}
              paddingX={2}
            >
              <Text
                color={selection === 'N' ? UI_COLORS.activeRed : UI_COLORS.mutedText}
                bold={selection === 'N'}
              >
                [N] No
              </Text>
            </Box>
          </Box>

          {isSubmitting && (
            <Box marginTop={1}>
              <Text color={UI_COLORS.mutedText}>
                {selection === 'Y'
                  ? '- Connecting to server...'
                  : '- Clearing session data...'}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
