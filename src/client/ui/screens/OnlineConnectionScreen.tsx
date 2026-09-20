import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { ShimmeringHeader } from '../components/ShimmeringHeader';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { getGameContainerWidth } from './MainMenuScreen';
import { UI_COLORS } from '../theme/colors';

interface OnlineConnectionScreenProps {
  error: string | null;
  onBack: () => void;
}

export function OnlineConnectionScreen({ error, onBack }: OnlineConnectionScreenProps) {
  const { columns, rows } = useTerminalSize();
  const width = getGameContainerWidth(columns);
  useInput((_, key) => {
    if (key.escape) onBack();
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
        <ShimmeringHeader containerWidth={width} pageTitle="ONLINE" />
        <Box
          borderStyle="round"
          borderColor={UI_COLORS.goldBorder}
          paddingX={3}
          paddingY={2}
          justifyContent="center"
        >
          <Text color={error ? UI_COLORS.errorRed : UI_COLORS.primaryText}>
            <Text color={UI_COLORS.errorRed}>
              <Spinner type="dots" />
            </Text>{' '}
            {error ?? 'Connecting to online lobby…'}
          </Text>
        </Box>
        <Box marginTop={1} justifyContent="center">
          <Text color={UI_COLORS.mutedText}>ESC Back</Text>
        </Box>
      </Box>
    </Box>
  );
}
