import { useCallback } from 'react';
import type { SocketClient } from '../../network/socketClient';
import type { ActiveScreen } from './useAppNavigation';
import { executeUserSubmission } from './navigationActions';

interface UseNavigationHandlersParams {
  readonly socketClient: SocketClient;
  readonly playerName: string;
  readonly intent: 'create' | 'join' | null;
  readonly networkMode: 'LAN' | 'INTERNET';
  readonly pendingTarget: string;
  readonly setPlayerName: (name: string) => void;
  readonly setScreen: (screen: ActiveScreen) => void;
  readonly setCurrentServerUrl: (url: string) => void;
  readonly onClearState: () => void;
}

export function useNavigationHandlers({
  socketClient,
  playerName,
  intent,
  networkMode,
  pendingTarget,
  setPlayerName,
  setScreen,
  setCurrentServerUrl,
  onClearState,
}: UseNavigationHandlersParams) {
  const handleConnectServer = useCallback(
    async (newUrl: string): Promise<boolean> => {
      onClearState();
      setCurrentServerUrl(newUrl);
      return socketClient.connectWithTimeout(newUrl, 3000);
    },
    [onClearState, setCurrentServerUrl, socketClient],
  );

  const handleConnectedSuccess = useCallback(() => {
    if (!playerName) {
      setScreen('enterName');
    } else if (intent === 'create') {
      executeUserSubmission('create', playerName, 'LAN', '', socketClient);
    } else {
      setScreen('tableLounge');
      socketClient.send({ type: 'GET_ROOMS' });
    }
  }, [playerName, intent, socketClient, setScreen]);

  const handleUsernameSubmit = useCallback(
    (name: string) => {
      setPlayerName(name);
      if (intent === 'join' && networkMode === 'LAN') {
        setScreen('tableLounge');
        socketClient.send({ type: 'GET_ROOMS' });
      } else {
        executeUserSubmission(intent, name, networkMode, pendingTarget, socketClient);
      }
    },
    [intent, networkMode, pendingTarget, socketClient, setPlayerName, setScreen],
  );

  return { handleConnectServer, handleConnectedSuccess, handleUsernameSubmit };
}
