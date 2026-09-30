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

/**
 * หน้าจอสอบถามการกลับเข้าสู่ห้องเดิม (Session Reconnection Prompt)
 * ทำหน้าที่แจ้งเตือนเมื่อระบบตรวจพบข้อมูลเซสชันของห้องที่เคยเล่นค้างอยู่
 * พร้อมทั้งให้ผู้เล่นเลือกว่าจะเชื่อมต่อกลับเข้าห้องเดิม หรือปฏิเสธการต่อกลับและส่งต่อให้ผู้เรียกจัดการสถานะและนำทาง
 */
export function ReconnectPromptScreen({
  roomId,
  onAccept,
  onDecline,
}: ReconnectPromptScreenProps) {
  const { columns, rows } = useTerminalSize();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selection, setSelection] = useState<'Y' | 'N'>('Y');

  // ดักรับการกดปุ่มเพื่อเลือกคำตอบและการยืนยัน
  useInput((input, key) => {
    // ป้องกันการรับคำสั่งซ้ำระหว่างที่ระบบกำลังดำเนินการเปลี่ยนสถานะ
    if (isSubmitting) return;

    const lowerInput = input.toLowerCase();

    // เลื่อนสลับตัวเลือกระหว่าง Yes กับ No ด้วยปุ่มลูกศร
    if (key.leftArrow || key.rightArrow) {
      setSelection((prev) => (prev === 'Y' ? 'N' : 'Y'));
    } else if (lowerInput === 'y') {
      setSelection('Y');
      setIsSubmitting(true);
      // หน่วงเวลา 300ms เพื่อให้หน้าจอแสดงสถานะกำลังเชื่อมต่อก่อนนำทางต่อ
      setTimeout(onAccept, 300);
    } else if (lowerInput === 'n') {
      setSelection('N');
      setIsSubmitting(true);
      // หน่วงเวลา 300ms เพื่อแสดงผลตอบรับสถานะก่อนเรียก onDecline ให้ผู้เรียกจัดการสถานะและนำทาง
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

  // ตรวจสอบขนาดของหน้าต่างเทอร์มินัลให้มีพื้นที่เพียงพอตามเกณฑ์ที่ระบบต้องการ
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
