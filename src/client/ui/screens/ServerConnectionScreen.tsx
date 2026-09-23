import { Box } from 'ink';
import { ShimmeringHeader } from '../shared/components/ShimmeringHeader';
import { useTerminalSize } from '../shared/hooks/useTerminalSize';
import { getGameContainerWidth } from '../shared/layout/gameContainerLayout';
import {
  getTerminalSizeStatus,
  TerminalOutOfRangeScreen,
} from '../shared/components/ScreenSizeGuard';
import type { ServerConnectionScreenProps } from './server/types';
import { useServerConnectionController } from './server/useServerConnectionController';
import { ServerConnectionCard } from './server/ServerConnectionCard';
import { ServerHelpFooter } from './server/ServerHelpFooter';

export function ServerConnectionScreen(props: ServerConnectionScreenProps) {
  const { columns, rows } = useTerminalSize();
  const { mode, isConnecting, ipInput, setIpInput, handleIpSubmit, isConnected } =
    useServerConnectionController(props);

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
        <ShimmeringHeader containerWidth={containerWidth} pageTitle="SERVER SETUP" />
        <ServerConnectionCard
          mode={mode}
          serverUrl={props.serverUrl}
          isConnected={isConnected}
          isConnecting={isConnecting}
          ipInput={ipInput}
          onIpChange={setIpInput}
          onIpSubmit={handleIpSubmit}
          paddingX={paddingX}
        />
        <ServerHelpFooter mode={mode} />
      </Box>
    </Box>
  );
}
