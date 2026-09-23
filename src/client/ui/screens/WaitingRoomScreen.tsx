import { Box } from 'ink';
import { ShimmeringHeader } from '../shared/components/ShimmeringHeader';
import { useTerminalSize } from '../shared/hooks/useTerminalSize';
import { getGameContainerWidth } from '../shared/layout/gameContainerLayout';
import {
  getTerminalSizeStatus,
  TerminalOutOfRangeScreen,
} from '../shared/components/ScreenSizeGuard';
import type { WaitingRoomScreenProps } from './waitingRoom/types';
import { useWaitingRoomController } from './waitingRoom/useWaitingRoomController';
import { WaitingRoomCard } from './waitingRoom/WaitingRoomCard';
import { WaitingRoomHelpFooter } from './waitingRoom/WaitingRoomHelpFooter';

export type { WaitingRoomScreenProps } from './waitingRoom/types';

export function WaitingRoomScreen(props: WaitingRoomScreenProps) {
  const { columns, rows } = useTerminalSize();
  const isHost = Boolean(props.myPlayerId && props.myPlayerId === props.hostId);
  const { errorMessage } = useWaitingRoomController({
    isHost,
    onStart: props.onStart,
    onToggleReady: props.onToggleReady,
    onLeave: props.onLeave,
    serverError: props.serverError,
  });

  const sizeStatus = getTerminalSizeStatus(columns, rows);
  if (sizeStatus !== 'OPTIMAL') {
    return (
      <TerminalOutOfRangeScreen
        currentColumns={columns}
        currentRows={rows}
        status={sizeStatus}
        onExit={props.onLeave}
      />
    );
  }

  const containerWidth = getGameContainerWidth(columns);
  const paddingX = containerWidth >= 88 ? 4 : 2;

  return (
    <Box
      flexDirection="column"
      width="100%"
      height={rows}
      alignItems="center"
      justifyContent="center"
    >
      <Box width={containerWidth} flexDirection="column">
        <ShimmeringHeader containerWidth={containerWidth} pageTitle="WAITING ROOM" />
        <WaitingRoomCard props={props} paddingX={paddingX} errorMessage={errorMessage} />
        <WaitingRoomHelpFooter isHost={isHost} />
      </Box>
    </Box>
  );
}
