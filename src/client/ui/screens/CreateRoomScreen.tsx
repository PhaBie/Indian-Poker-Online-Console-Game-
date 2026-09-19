import { Box } from 'ink';
import { ShimmeringHeader } from '../components/ShimmeringHeader';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { getGameContainerWidth } from './MainMenuScreen';
import {
  getTerminalSizeStatus,
  TerminalOutOfRangeScreen,
} from '../components/ScreenSizeGuard';
import type { CreateRoomScreenProps } from './createRoom/types';
import { useCreateRoomController } from './createRoom/useCreateRoomController';
import { CreateRoomCard, CreateRoomHelpFooter } from './createRoom/CreateRoomCard';

export type { CreateRoomScreenProps } from './createRoom/types';

export function CreateRoomScreen({
  socketClient,
  onBack,
  playerName = 'Host',
  onModeSelect,
}: CreateRoomScreenProps) {
  const { columns, rows } = useTerminalSize();
  const { selectedMode, isSubmitting } = useCreateRoomController({
    socketClient,
    playerName,
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
        <ShimmeringHeader containerWidth={containerWidth} />
        <CreateRoomCard
          selectedMode={selectedMode}
          isSubmitting={isSubmitting}
          paddingX={paddingX}
        />
        <CreateRoomHelpFooter />
      </Box>
    </Box>
  );
}
