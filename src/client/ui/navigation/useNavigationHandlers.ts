import { useCallback } from 'react';
import type { SocketClient } from '../../network/socketClient';
import type { ActiveScreen } from './useAppNavigation';
import { executeUserSubmission } from './navigationActions';
import { prepareConnectionUrl } from '../../../shared/networkMode';
import type { RoomMaxPlayers } from '../screens/createRoom/types';

interface UseNavigationHandlersParams {
  readonly socketClient: SocketClient;
  readonly playerName: string;
  readonly intent: 'create' | 'join' | null;
  readonly networkMode: 'LAN' | 'INTERNET';
  readonly pendingTarget: string;
  readonly pendingMaxPlayers: RoomMaxPlayers;
  readonly setPlayerName: (name: string) => void;
  readonly setScreen: (screen: ActiveScreen) => void;
  readonly setCurrentServerUrl: (url: string) => void;
  readonly currentServerUrl: string;
  readonly onClearState: () => void;
  readonly onSetSessionInfo: (name: string, url: string) => void;
}

export function useNavigationHandlers({
  socketClient,
  playerName,
  intent,
  networkMode,
  pendingTarget,
  pendingMaxPlayers,
  setPlayerName,
  setScreen,
  setCurrentServerUrl,
  currentServerUrl,
  onClearState,
  onSetSessionInfo,
}: UseNavigationHandlersParams) {
  const handleConnectServer = useCallback(
    async (newUrl: string): Promise<boolean> => {
      try {
        const url = prepareConnectionUrl(newUrl, 'LAN');
        onClearState();
        setCurrentServerUrl(url);
        return await socketClient.connectWithTimeout(url, 3000);
      } catch {
        return false;
      }
    },
    [onClearState, setCurrentServerUrl, socketClient],
  );

  const handleConnectedSuccess = useCallback(
    (urlToSave: string) => {
      onSetSessionInfo(playerName, urlToSave);
      if (!playerName) {
        setScreen('enterName');
      } else if (intent === 'create') {
        executeUserSubmission(
          'create',
          playerName,
          'LAN',
          '',
          socketClient,
          pendingMaxPlayers,
        );
      } else {
        setScreen('tableLounge');
        socketClient.send({ type: 'GET_ROOMS' });
      }
    },
    [pendingMaxPlayers, playerName, intent, socketClient, setScreen, onSetSessionInfo],
  );

  const handleUsernameSubmit = useCallback(
    (name: string) => {
      setPlayerName(name);
      onSetSessionInfo(name, currentServerUrl);
      if (intent === 'join') {
        setScreen('tableLounge');
        socketClient.send({ type: 'GET_ROOMS' });
      } else {
        executeUserSubmission(
          intent,
          name,
          networkMode,
          pendingTarget,
          socketClient,
          pendingMaxPlayers,
        );
      }
    },
    [
      intent,
      networkMode,
      pendingMaxPlayers,
      pendingTarget,
      socketClient,
      setPlayerName,
      setScreen,
      onSetSessionInfo,
      currentServerUrl,
    ],
  );

  const handleInitialUsernameSubmit = useCallback(
    (name: string) => {
      setPlayerName(name);
      setScreen('mainMenu');
    },
    [setPlayerName, setScreen],
  );

  return {
    handleConnectServer,
    handleConnectedSuccess,
    handleUsernameSubmit,
    handleInitialUsernameSubmit,
  };
}
