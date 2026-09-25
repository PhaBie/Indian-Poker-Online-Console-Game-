import { useCallback, useState } from 'react';
import type { SocketClient } from '../../../network/socketClient';
import { prepareConnectionUrl } from '../../../../shared/networkMode';
import type { ActiveScreen } from '../../navigation/useAppNavigation';

interface OnlineConnectionParams {
  intent: 'create' | 'join' | null;
  playerName: string;
  socketClient: SocketClient;
  setScreen: (screen: ActiveScreen) => void;
  setCurrentServerUrl: (url: string) => void;
  maxPlayers: 2 | 3 | 4;
}

export function useOnlineConnection({
  intent,
  playerName,
  socketClient,
  setScreen,
  setCurrentServerUrl,
  maxPlayers,
}: OnlineConnectionParams) {
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectToOnlineServer = useCallback(
    async (serverUrl: string): Promise<boolean> => {
      setIsConnecting(true);
      setError(null);
      try {
        const url = prepareConnectionUrl(serverUrl, 'INTERNET');
        const isConnected = await socketClient.connectWithTimeout(url, 5000);
        if (!isConnected)
          throw new Error('Unable to connect. Check the ngrok URL and try again.');
        setCurrentServerUrl(url);
        if (!playerName) {
          setScreen('enterName');
        } else if (intent === 'create') {
          socketClient.send({
            type: 'CREATE_ROOM',
            payload: { playerName, bootAmount: 50, maxPlayers },
          });
          setScreen('tableLounge');
        } else {
          socketClient.send({ type: 'GET_ROOMS' });
          setScreen('tableLounge');
        }
        return true;
      } catch (failure) {
        socketClient.disconnect();
        setError(
          failure instanceof Error
            ? failure.message
            : 'Unable to connect. Please try again.',
        );
        return false;
      } finally {
        setIsConnecting(false);
      }
    },
    [intent, maxPlayers, playerName, setCurrentServerUrl, setScreen, socketClient],
  );

  return { onlineError: error, isOnlineConnecting: isConnecting, connectToOnlineServer };
}
