import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ServerEvent } from '../../../shared/types';
import type { SocketClient } from '../../network/socketClient';

type GameResultPayload = Extract<ServerEvent, { type: 'GAME_RESULT' }>['payload'];
type GameStatePayload = Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>['payload'];

export interface RoundResultScreenProps {
  result: GameResultPayload;
  gameState: GameStatePayload;
  socketClient: SocketClient;
  onLeave: () => void;
}

export function RoundResultScreen({
  result,
  gameState,
  socketClient,
  onLeave,
}: RoundResultScreenProps) {
  const [inputBuffer, setInputBuffer] = useState('');

  useInput((input, key) => {
    if (key.return) {
      handleCommand(inputBuffer);
      setInputBuffer('');
    } else if (key.backspace || key.delete) {
      setInputBuffer((prev) => prev.slice(0, -1));
    } else {
      setInputBuffer((prev) => prev + input);
    }
  });

  const handleCommand = (cmdStr: string) => {
    const cmd = cmdStr.trim().toLowerCase();
    if (cmd === 'next') {
      socketClient.send({ type: 'RESET_LOBBY' });
    } else if (cmd === 'leave') {
      onLeave();
    }
  };

  const { winnerIds, winningHand, payouts } = result;
  const { players } = gameState;

  const winnerNames = winnerIds
    .map((id) => players.find((p) => p.id === id)?.name || 'Unknown')
    .join(', ');

  return (
    <Box flexDirection="column" width={70} height={25}>
      <Box borderStyle="round" borderColor="yellow" justifyContent="center">
        <Text color="redBright">ROUND </Text>
        <Text color="greenBright">RESULT</Text>
      </Box>

      <Box
        borderStyle="round"
        borderColor="yellow"
        flexDirection="column"
        paddingX={2}
        paddingY={1}
        flexGrow={1}
        alignItems="center"
      >
        <Box marginBottom={1}>
          <Text color="yellowBright">🏆 Winner: </Text>
          <Text color="cyanBright">{winnerNames}</Text>
        </Box>
        <Box marginBottom={2}>
          <Text color="gray">Winning Hand: </Text>
          <Text color="white">{winningHand}</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="greenBright" bold>
            UPDATED CHIPS SCOREBOARD
          </Text>
        </Box>

        <Box flexDirection="column" width={50} marginTop={1}>
          <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
            <Box width={20}>
              <Text bold color="yellow">
                PLAYER
              </Text>
            </Box>
            <Box width={15} justifyContent="center">
              <Text bold color="yellow">
                TOTAL CHIPS
              </Text>
            </Box>
            <Box width={15} justifyContent="flex-end">
              <Text bold color="yellow">
                WIN / LOSS
              </Text>
            </Box>
          </Box>

          {players.map((p) => {
            const wonAmount = payouts[p.id];
            return (
              <Box key={p.id} flexDirection="row" justifyContent="space-between">
                <Box width={20}>
                  <Text color="cyan">{p.name}</Text>
                </Box>
                <Box width={15} justifyContent="center">
                  <Text color="white">{p.chips}</Text>
                </Box>
                <Box width={15} justifyContent="flex-end">
                  <Text color={wonAmount ? 'greenBright' : 'gray'}>
                    {wonAmount ? `+${wonAmount}` : '-'}
                  </Text>
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box flexGrow={1} />

        <Box justifyContent="center" marginTop={1}>
          <Text color="gray">Type 'next' to continue to Lobby, or 'leave' to quit</Text>
        </Box>
      </Box>

      <Box borderStyle="round" borderColor="yellow" paddingX={1}>
        <Text>&gt; {inputBuffer}</Text>
      </Box>
    </Box>
  );
}
