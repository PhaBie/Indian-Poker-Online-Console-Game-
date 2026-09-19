import { Box } from 'ink';
import { ShimmeringHeader } from '../components/ShimmeringHeader';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { getGameContainerWidth } from './MainMenuScreen';
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

export function RoomBrowserScreen(props: RoomBrowserScreenProps) {
  const { columns, rows } = useTerminalSize();
  const { selectedIndex } = useRoomBrowserController(props);

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
        <ShimmeringHeader containerWidth={containerWidth} pageTitle="TABLE LOUNGE" />
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={UI_COLORS.goldBorder}
          paddingX={paddingX}
          paddingY={1}
          width="100%"
        >
          <RoomBrowserHeader
            serverUrl={props.serverUrl}
            playerName={props.playerName}
            lastError={props.lastError}
          />
          <RoomBrowserTable rooms={props.rooms} selectedIndex={selectedIndex} />
        </Box>
        <RoomBrowserHelpFooter />
      </Box>
    </Box>
  );
}
