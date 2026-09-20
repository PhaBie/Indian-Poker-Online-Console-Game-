import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ShimmeringHeader } from '../components/ShimmeringHeader';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { getGameContainerWidth } from './MainMenuScreen';
import {
  getTerminalSizeStatus,
  TerminalOutOfRangeScreen,
} from '../components/ScreenSizeGuard';
import { UI_COLORS } from '../theme/colors';

export interface JoinRoomScreenProps {
  onBack: () => void;
  onJoinSubmit: (method: 'LAN' | 'INTERNET', target: string) => void;
  serverError?: string | null;
}

interface JoinMethodOptionProps {
  readonly number: string;
  readonly title: string;
  readonly detail: string;
  readonly color: string;
  readonly isSelected: boolean;
}

function JoinMethodOption({
  number,
  title,
  detail,
  color,
  isSelected,
}: JoinMethodOptionProps) {
  return (
    <Box flexDirection="row" alignItems="center">
      <Box width={4}>
        <Text bold={isSelected} color={isSelected ? color : UI_COLORS.mutedText}>
          {isSelected ? '❯' : ' '}
        </Text>
      </Box>
      <Box width={18}>
        <Text bold={isSelected} color={isSelected ? color : UI_COLORS.inactiveTitle}>
          [{number}] {title}
        </Text>
      </Box>
      <Text color={isSelected ? UI_COLORS.primaryText : UI_COLORS.inactiveDesc}>
        {detail}
      </Text>
    </Box>
  );
}

function JoinMethodStep({ selectedNetwork }: { readonly selectedNetwork: 1 | 2 }) {
  return (
    <Box flexDirection="column" alignItems="center">
      <Box flexDirection="column" width={46} alignItems="center">
        <Text color={UI_COLORS.mutedText}>Select connection mode to join a room</Text>
        <Box flexDirection="column" marginTop={2} marginBottom={1} width={46}>
          <JoinMethodOption
            number="1"
            title="Join LAN"
            detail="Local WiFi (Host IPv4)"
            color={UI_COLORS.activeGreen}
            isSelected={selectedNetwork === 1}
          />
          <Box marginTop={1}>
            <JoinMethodOption
              number="2"
              title="Join Online"
              detail="Browse online rooms"
              color={UI_COLORS.activeBlue}
              isSelected={selectedNetwork === 2}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export function JoinRoomScreen({
  onBack,
  onJoinSubmit,
  serverError,
}: JoinRoomScreenProps) {
  const { columns, rows } = useTerminalSize();
  const [selectedNetwork, setSelectedNetwork] = useState<1 | 2>(1);
  useInput((inputKey, key) => {
    if (key.escape) {
      onBack();
    } else if (key.upArrow || key.downArrow) {
      setSelectedNetwork((previous) => (previous === 1 ? 2 : 1));
    } else if (key.return || inputKey === '1' || inputKey === '2') {
      const selected = inputKey === '2' ? 2 : inputKey === '1' ? 1 : selectedNetwork;
      onJoinSubmit(selected === 1 ? 'LAN' : 'INTERNET', '');
    }
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

  const containerWidth = getGameContainerWidth(columns);

  return (
    <Box
      flexDirection="column"
      width="100%"
      height={rows}
      alignItems="center"
      justifyContent="center"
    >
      <Box width={containerWidth} flexDirection="column">
        <ShimmeringHeader containerWidth={containerWidth} pageTitle="JOIN ROOM" />
        <Box
          width="100%"
          borderStyle="round"
          borderColor={UI_COLORS.goldBorder}
          flexDirection="column"
          justifyContent="center"
          paddingX={3}
          paddingY={1}
        >
          <JoinMethodStep selectedNetwork={selectedNetwork} />
          {serverError && <Text color={UI_COLORS.errorRed}>{serverError}</Text>}
        </Box>
        <Box justifyContent="center" marginTop={1}>
          <Text color={UI_COLORS.mutedText}>
            UP/DOWN Navigate • ENTER Select • ESC Back
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
