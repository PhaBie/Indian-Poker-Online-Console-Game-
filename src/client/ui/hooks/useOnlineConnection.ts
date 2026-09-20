import { useEffect, useState } from 'react';
import type { SocketClient } from '../../network/socketClient';
import { prepareConnectionUrl } from '../../../shared/networkMode';
import type { ActiveScreen } from './useAppNavigation';

interface OnlineConnectionParams {
  screen: ActiveScreen;
  intent: 'create' | 'join' | null;
  playerName: string;
  serverUrl: string;
  socketClient: SocketClient;
  setScreen: (screen: ActiveScreen) => void;
  setCurrentServerUrl: (url: string) => void;
  maxPlayers: 2 | 3 | 4;
}

export function useOnlineConnection({
  screen,
  intent,
  playerName,
  serverUrl,
  socketClient,
  setScreen,
  setCurrentServerUrl,
  maxPlayers,
}: OnlineConnectionParams) {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (screen !== 'onlineConnection') return;
    let isCancelled = false;
    let isFinished = false;
    setError(null);
    const connect = async () => {
      try {
        const url = prepareConnectionUrl(serverUrl, 'INTERNET');
        const isConnected = await socketClient.connectWithTimeout(url, 5000);
        if (isCancelled) return;
        if (!isConnected) throw new Error('Unable to connect. Please try again.');
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
        isFinished = true;
      } catch (failure) {
        if (!isCancelled)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Unable to connect. Please try again.',
          );
      }
    };
    void connect();
    return () => {
      isCancelled = true;
      if (!isFinished) socketClient.disconnect();
    };
  }, [
    screen,
    intent,
    playerName,
    serverUrl,
    socketClient,
    setScreen,
    setCurrentServerUrl,
    maxPlayers,
  ]);
  return { onlineError: error };
}
