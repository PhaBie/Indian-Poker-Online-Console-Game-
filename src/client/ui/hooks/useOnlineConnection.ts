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
}

export function useOnlineConnection({
  screen,
  intent,
  playerName,
  serverUrl,
  socketClient,
  setScreen,
  setCurrentServerUrl,
}: OnlineConnectionParams) {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
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
            payload: { playerName, bootAmount: 50, maxPlayers: 4 },
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
    attempt,
  ]);
  return { onlineError: error, retryOnline: () => setAttempt((value) => value + 1) };
}
