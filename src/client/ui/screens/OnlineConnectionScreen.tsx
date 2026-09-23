import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';
import Spinner from 'ink-spinner';
import { ShimmeringHeader } from '../shared/components/ShimmeringHeader';
import { useTerminalSize } from '../shared/hooks/useTerminalSize';
import { getGameContainerWidth } from '../shared/layout/gameContainerLayout';
import { UI_COLORS } from '../shared/theme/colors';
import {
  getTerminalSizeStatus,
  TerminalOutOfRangeScreen,
} from '../shared/components/ScreenSizeGuard';

interface OnlineConnectionScreenProps {
  readonly intent: 'create' | 'join' | null;
  error: string | null;
  initialUrl: string;
  isConnecting: boolean;
  onConnect: (url: string) => Promise<boolean>;
  onBack: () => void;
}

export function getOnlineConnectionLabel(intent: OnlineConnectionScreenProps['intent']) {
  return intent === 'create' ? 'CREATE ONLINE' : 'JOIN ONLINE';
}

export function OnlineConnectionScreen({
  intent,
  error,
  initialUrl,
  isConnecting,
  onConnect,
  onBack,
}: OnlineConnectionScreenProps) {
  const { columns, rows } = useTerminalSize();
  const width = getGameContainerWidth(columns);
  const [url, setUrl] = useState(initialUrl);
  const modeLabel = getOnlineConnectionLabel(intent);
  useInput((_, key) => {
    if (key.escape && !isConnecting) onBack();
  });

  const sizeStatus = getTerminalSizeStatus(columns, rows);
  if (sizeStatus !== 'OPTIMAL') {
    return (
      <TerminalOutOfRangeScreen
        currentColumns={columns}
        currentRows={rows}
        status={sizeStatus}
        onExit={onBack}
      />
    );
  }

  const borderColor = error
    ? UI_COLORS.errorRed
    : isConnecting
      ? UI_COLORS.activeBlue
      : UI_COLORS.goldBorder;

  return (
    <Box
      height={rows}
      width="100%"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
    >
      <Box width={width} flexDirection="column">
        <ShimmeringHeader containerWidth={width} pageTitle="ONLINE CONNECTION" />
        <Box
          borderStyle="round"
          borderColor={borderColor}
          paddingX={3}
          paddingY={2}
          flexDirection="column"
          width={72}
          alignSelf="center"
        >
          <Box justifyContent="space-between">
            <Text bold color={UI_COLORS.goldHighlight}>
              {modeLabel}
            </Text>
            <Text color={UI_COLORS.activeBlue}>[ NGROK / WSS ]</Text>
          </Box>

          <Box
            marginTop={1}
            borderStyle="single"
            borderColor={error ? UI_COLORS.errorRed : UI_COLORS.menuBorder}
            paddingX={1}
          >
            <Text bold color={UI_COLORS.activeBlue}>
              LINK ›{' '}
            </Text>
            <TextInput
              value={url}
              onChange={setUrl}
              onSubmit={() => void onConnect(url)}
              focus={!isConnecting}
              placeholder="https://xxxxx.ngrok-free.app"
            />
          </Box>

          <Box marginTop={1}>
            <Text color={error ? UI_COLORS.errorRed : UI_COLORS.mutedText}>
              {isConnecting ? (
                <>
                  <Spinner type="dots" /> CONNECTING…
                </>
              ) : (
                (error ?? 'PASTE SERVER LINK')
              )}
            </Text>
          </Box>
        </Box>
        <Box marginTop={1} justifyContent="center">
          <Text color={UI_COLORS.mutedText}>
            <Text color={UI_COLORS.goldHighlight}>ENTER</Text> CONNECT •{' '}
            <Text color={UI_COLORS.white}>ESC</Text> BACK
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
