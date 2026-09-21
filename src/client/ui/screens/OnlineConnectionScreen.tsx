import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';
import { ShimmeringHeader } from '../components/ShimmeringHeader';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { getGameContainerWidth } from './MainMenuScreen';
import { UI_COLORS } from '../theme/colors';

interface OnlineConnectionScreenProps {
  error: string | null;
  initialUrl: string;
  isConnecting: boolean;
  onConnect: (url: string) => Promise<boolean>;
  onBack: () => void;
}

export function OnlineConnectionScreen({
  error,
  initialUrl,
  isConnecting,
  onConnect,
  onBack,
}: OnlineConnectionScreenProps) {
  const { columns, rows } = useTerminalSize();
  const width = getGameContainerWidth(columns);
  const [url, setUrl] = useState(initialUrl);
  useInput((_, key) => {
    if (key.escape && !isConnecting) onBack();
  });
  return (
    <Box
      height={rows}
      width="100%"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
    >
      <Box width={width} flexDirection="column">
        <ShimmeringHeader containerWidth={width} pageTitle="ONLINE / NGROK" />
        <Box
          borderStyle="round"
          borderColor={UI_COLORS.goldBorder}
          paddingX={3}
          paddingY={1}
          flexDirection="column"
        >
          <Text color={UI_COLORS.primaryText} bold>
            {isConnecting ? 'CONNECTING TO ONLINE LOBBY…' : 'PASTE HOST NGROK URL'}
          </Text>
          <Box marginTop={1}>
            <Text color={UI_COLORS.mutedText}>URL: </Text>
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
              {error ??
                'Use the HTTPS URL printed by the host. It will connect securely as WSS.'}
            </Text>
          </Box>
        </Box>
        <Box marginTop={1} justifyContent="center">
          <Text color={UI_COLORS.mutedText}>ENTER Connect • ESC Back</Text>
        </Box>
      </Box>
    </Box>
  );
}
