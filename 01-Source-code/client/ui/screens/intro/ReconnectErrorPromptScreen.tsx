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

interface ReconnectErrorPromptScreenProps {
  errorMsg: string;
  onAcknowledge: () => void;
}

/**
 * หน้าจอแสดงข้อผิดพลาดเมื่อพยายามเชื่อมต่อกลับไปห้องเดิมแล้วล้มเหลว (Session Reconnect Failed)
 * เช่น โดนเตะออกเพราะหลุดนานเกินไป หรือห้องถูกปิดไปแล้ว
 */
export function ReconnectErrorPromptScreen({
  errorMsg,
  onAcknowledge,
}: ReconnectErrorPromptScreenProps) {
  const { columns, rows } = useTerminalSize();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useInput((_, key) => {
    if (isSubmitting) return;

    if (key.return) {
      setIsSubmitting(true);
      setTimeout(onAcknowledge, 300);
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
          borderColor={UI_COLORS.activeRed}
          paddingX={4}
          paddingY={2}
          marginTop={2}
          alignItems="center"
        >
          <Text color={UI_COLORS.activeRed} bold>
            ⚠️ RECONNECTION FAILED
          </Text>

          <Box marginY={1}>
            <Text>
              <Text color={UI_COLORS.activeRed}>
                {errorMsg || 'Connection timed out. Cannot connect to the room.'}
              </Text>
            </Text>
          </Box>

          <Box flexDirection="row" marginTop={1}>
            <Box borderStyle="single" borderColor={UI_COLORS.activeGreen} paddingX={2}>
              <Text color={UI_COLORS.activeGreen} bold>
                [ENTER] Ok
              </Text>
            </Box>
          </Box>

          {isSubmitting && (
            <Box marginTop={1}>
              <Text color={UI_COLORS.mutedText}>- Returning to Main Menu...</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
