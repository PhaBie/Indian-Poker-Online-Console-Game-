import { Box } from 'ink';
import { ShimmeringHeader } from '../shared/components/ShimmeringHeader';
import { useTerminalSize } from '../shared/hooks/useTerminalSize';
import { getGameContainerWidth } from '../shared/layout/gameContainerLayout';
import {
  getTerminalSizeStatus,
  TerminalOutOfRangeScreen,
} from '../shared/components/ScreenSizeGuard';
import type { CreateRoomScreenProps } from './createRoom/types';
import { useCreateRoomController } from './createRoom/useCreateRoomController';
import { CreateRoomCard, CreateRoomHelpFooter } from './createRoom/CreateRoomCard';

export type { CreateRoomScreenProps } from './createRoom/types';

export function CreateRoomScreen({
  socketClient,
  onBack,
  playerName = 'Host',
  initialMode = 'LAN',
  onModeSelect,
}: CreateRoomScreenProps) {
  const { columns, rows } = useTerminalSize();
  const { maxPlayers, selectedMode, step, isSubmitting } = useCreateRoomController({
    socketClient,
    playerName,
    initialMode,
    onBack,
    onModeSelect,
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
  const isWideMode = containerWidth >= 88;
  const paddingX = isWideMode ? 5 : 3;

  return (
    <Box
      flexDirection="column"
      width="100%"
      height={rows}
      alignItems="center"
      justifyContent="center"
    >
      <Box width={containerWidth} flexDirection="column">
        <ShimmeringHeader
          containerWidth={containerWidth}
          pageTitle={step === 'mode' ? 'CREATE ROOM' : 'ROOM SETTINGS'}
        />
        <CreateRoomCard
          step={step}
          selectedMode={selectedMode}
          maxPlayers={maxPlayers}
          isSubmitting={isSubmitting}
          paddingX={paddingX}
        />
        <CreateRoomHelpFooter />
      </Box>
    </Box>
  );
}
