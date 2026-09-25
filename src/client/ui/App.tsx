import React from 'react';
import { Box } from 'ink';
import type { ClientState } from '../state/ClientState';
import { useClientState } from './hooks/useClientState';
import { ConnectScreen } from './screens/ConnectScreen';

export interface AppProps {
  clientState: ClientState;
  serverUrl: string;
}

export function App({ clientState, serverUrl }: AppProps) {
  const state = useClientState(clientState);

  return (
    <Box>
      <ConnectScreen playerId={state.myPlayerId} serverUrl={serverUrl} />
    </Box>
  );
}
