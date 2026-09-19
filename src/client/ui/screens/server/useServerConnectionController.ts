import { useState, useCallback } from 'react';
import { useInput } from 'ink';
import type { ServerConnectionMode, ServerConnectionScreenProps } from './types';

export function useServerConnectionController({
  serverUrl,
  isConnected,
  onConnect,
  onConnectedSuccess,
  onBack,
}: ServerConnectionScreenProps) {
  const [mode, setMode] = useState<ServerConnectionMode>('SELECT_ACTION');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [ipInput, setIpInput] = useState<string>('');

  const attemptConnect = useCallback(
    async (targetUrl: string) => {
      setIsConnecting(true);
      const isSuccess = await onConnect(targetUrl);
      setIsConnecting(false);
      if (isSuccess) {
        onConnectedSuccess();
      }
    },
    [onConnect, onConnectedSuccess],
  );

  const handleIpSubmit = useCallback(() => {
    const trimmed = ipInput.trim();
    if (!trimmed) return;
    const formattedUrl =
      trimmed.startsWith('ws://') || trimmed.startsWith('wss://')
        ? trimmed
        : `ws://${trimmed}${trimmed.includes(':') ? '' : ':8080'}`;
    attemptConnect(formattedUrl);
  }, [ipInput, attemptConnect]);

  useInput((input, key) => {
    if (isConnecting) return;
    if (key.escape) {
      if (mode === 'INPUT_IP') {
        setMode('SELECT_ACTION');
      } else {
        onBack();
      }
      return;
    }
    if (mode === 'SELECT_ACTION') {
      if (input === '1') setMode('INPUT_IP');
      if (input === '2' || input.toLowerCase() === 'r') attemptConnect(serverUrl);
    }
  });

  return { mode, isConnecting, ipInput, setIpInput, handleIpSubmit, isConnected };
}
