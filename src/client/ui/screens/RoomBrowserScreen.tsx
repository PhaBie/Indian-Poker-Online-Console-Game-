import { Box } from 'ink';
import { useEffect, useState } from 'react';
import { ShimmeringHeader } from '../components/ShimmeringHeader';
import { useTerminalSize } from '../hooks/useTerminalSize';
import {
  getTerminalSizeStatus,
  TerminalOutOfRangeScreen,
} from '../components/ScreenSizeGuard';
import { UI_COLORS } from '../theme/colors';
import type { RoomBrowserScreenProps } from './roomBrowser/types';
import { useRoomBrowserController } from './roomBrowser/useRoomBrowserController';
import { RoomBrowserHeader } from './roomBrowser/RoomBrowserHeader';
import { RoomBrowserTable } from './roomBrowser/RoomBrowserTable';
import { RoomBrowserHelpFooter } from './roomBrowser/RoomBrowserHelpFooter';
import { RoomCodePrompt } from './roomBrowser/RoomCodePrompt';

function getLobbyContainerWidth(terminalColumns: number): number {
  if (terminalColumns <= 90) return 78;
  if (terminalColumns <= 140) return Math.round(78 + (terminalColumns - 90) * 0.3);
  return Math.min(98, Math.round(93 + (terminalColumns - 140) * 0.1));
}

function getMaxVisibleRoomRows(terminalRows: number, hasError: boolean): number {
  // Reserve header, footer and both scroll hints before allocating two lines per room.
  return Math.max(
    1,
    Math.min(6, Math.floor((terminalRows - 19 - (hasError ? 2 : 0)) / 2)),
  );
}

export function RoomBrowserScreen(props: RoomBrowserScreenProps) {
  const [isEnteringCode, setIsEnteringCode] = useState(
    props.initialEnteringCode ?? false,
  );
  const [roomCode, setRoomCode] = useState('');
  const { columns, rows } = useTerminalSize();

  useEffect(() => {
    if (props.initialEnteringCode) {
      setIsEnteringCode(true);
      props.onRoomCodeOpened?.();
    }
  }, [props.initialEnteringCode, props.onRoomCodeOpened]);
  const { selectedIndex } = useRoomBrowserController({
    ...props,
    isEnteringCode,
    onEnterRoomCode: () => {
      setRoomCode('');
      setIsEnteringCode(true);
    },
  });

  const sizeStatus = getTerminalSizeStatus(columns, rows);
  if (sizeStatus !== 'OPTIMAL') {
    return (
      <TerminalOutOfRangeScreen
        currentColumns={columns}
        currentRows={rows}
        status={sizeStatus}
        onExit={props.onBack}
      />
    );
  }

  const containerWidth = getLobbyContainerWidth(columns);

  return (
    <Box
      flexDirection="column"
      width="100%"
      height={rows}
      alignItems="center"
      justifyContent="center"
    >
      <Box width={containerWidth} flexDirection="column" flexShrink={0}>
        <ShimmeringHeader containerWidth={containerWidth} pageTitle="ROOM LOBBY" />
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={UI_COLORS.goldBorder}
          paddingX={3}
          paddingY={1}
          minHeight={18}
          width="100%"
        >
          <RoomBrowserHeader
            networkMode={props.networkMode}
            playerName={props.playerName}
            lastError={props.lastError}
          />
          {isEnteringCode ? (
            <RoomCodePrompt
              value={roomCode}
              onChange={setRoomCode}
              onSubmit={(value) => {
                const normalizedRoomId = value.trim().replace(/^#/, '');
                if (normalizedRoomId) props.onJoinRoomByCode(normalizedRoomId);
              }}
              onBack={() => setIsEnteringCode(false)}
              onChangeName={() => props.onChangeName('code')}
            />
          ) : (
            <RoomBrowserTable
              rooms={props.rooms}
              selectedIndex={selectedIndex}
              maxVisibleRows={getMaxVisibleRoomRows(rows, Boolean(props.lastError))}
              networkMode={props.networkMode}
              serverUrl={props.serverUrl}
            />
          )}
        </Box>
        <RoomBrowserHelpFooter isEnteringCode={isEnteringCode} />
      </Box>
    </Box>
  );
}
