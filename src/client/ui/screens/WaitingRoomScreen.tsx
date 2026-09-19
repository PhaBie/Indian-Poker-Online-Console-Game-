import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import type { PublicPlayerDTO } from '../../../shared/types';
import { getLocalIPv4 } from '../../index';

export interface WaitingRoomScreenProps {
  roomId: string | null;
  players: PublicPlayerDTO[];
  hostId: string | null;
  myPlayerId: string | null;
  onStart: () => void;
  onToggleReady: () => void;
  onLeave: () => void;
  networkMode?: string;
  maxPlayers?: number;
  serverUrl?: string;
}

export function WaitingRoomScreen({
  roomId,
  players,
  hostId,
  myPlayerId,
  onStart,
  onToggleReady,
  onLeave,
  networkMode = 'Internet',
  maxPlayers = 4,
  serverUrl,
}: WaitingRoomScreenProps) {
  const [error, setError] = useState('');

  const isHost = myPlayerId === hostId;

  useInput((input, key) => {
    if (key.escape || input.toLowerCase() === 'q' || input.toLowerCase() === 'l') {
      onLeave();
    } else if (input.toLowerCase() === 'r') {
      onToggleReady();
    } else if (input.toLowerCase() === 's') {
      if (isHost) {
        onStart();
      } else {
        setError('เฉพาะ Host เท่านั้นที่สามารถเริ่มเกมได้');
      }
    }
  });

  const renderPlayerRow = (index: number, player?: PublicPlayerDTO) => {
    if (!player) {
      return (
        <Text color="gray" key={index}>
          [{index + 1}] --- Empty Seat ---
        </Text>
      );
    }

    const isPlayerHost = player.id === hostId;
    const statusText = player.status;
    let statusColor = 'gray';
    if (player.status === 'READY') {
      statusColor = 'greenBright';
    }

    return (
      <Box key={player.id} flexDirection="row" justifyContent="space-between" width={50}>
        <Box width={20}>
          <Text color="cyanBright">[{index + 1}] </Text>
          <Text color="cyan">{player.name}</Text>
        </Box>
        <Box width={15} justifyContent="center">
          {isPlayerHost ? (
            <Text color="redBright">(HOST)</Text>
          ) : (
            <Text color="white">(PLAYER)</Text>
          )}
        </Box>
        <Box width={15} justifyContent="flex-end">
          <Text color={statusColor}>{statusText}</Text>
        </Box>
      </Box>
    );
  };

  const slots = [];
  for (let i = 0; i < maxPlayers; i++) {
    slots.push(renderPlayerRow(i, players[i]));
  }

  let roomDisplay;
  if (networkMode === 'LAN') {
    const ip = getLocalIPv4();
    const port = serverUrl ? new URL(serverUrl).port || '8080' : '8080';
    roomDisplay = `IP/PORT: ${ip}:${port}`;
  } else {
    roomDisplay = `Room: ${roomId || 'Unknown'} (Internet)`;
  }

  return (
    <Box flexDirection="column" width={80}>
      <Box borderStyle="round" borderColor="yellow" justifyContent="center">
        <Text color="yellowBright">WAITING </Text>
        <Text color="cyanBright">ROOM</Text>
      </Box>

      <Box
        borderStyle="round"
        borderColor="yellow"
        flexDirection="column"
        paddingY={1}
        paddingX={2}
        minHeight={15}
      >
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Text color="gray">{roomDisplay}</Text>
          <Box flexDirection="row">
            <Text color="magentaBright">
              <Spinner type="dots" /> Waiting for players...{' '}
            </Text>
            <Text color="cyanBright">
              ({players.length}/{maxPlayers})
            </Text>
          </Box>
        </Box>

        <Box flexDirection="column" flexGrow={1} marginTop={1} alignItems="center">
          <Box
            flexDirection="row"
            justifyContent="space-between"
            width={50}
            marginBottom={1}
          >
            <Box width={20}>
              <Text bold color="yellow">
                SEAT / NAME
              </Text>
            </Box>
            <Box width={15} justifyContent="center">
              <Text bold color="yellow">
                ROLE
              </Text>
            </Box>
            <Box width={15} justifyContent="flex-end">
              <Text bold color="yellow">
                STATUS
              </Text>
            </Box>
          </Box>
          {slots}
        </Box>

        <Box marginTop={1}>
          <Text color="gray">
            -------------------------------------------------------------------------
          </Text>
        </Box>

        <Box
          flexDirection="row"
          marginTop={1}
          justifyContent="space-between"
          alignItems="flex-end"
        >
          <Box flexDirection="column" width={50}>
            {isHost && <Text color="white"> [S] Start Game</Text>}
            <Text color="white"> [R] Ready / Unready</Text>
            <Text color="white"> [L/Q] Leave Game</Text>
            {error ? (
              <Box marginTop={1}>
                <Text color="red">{error}</Text>
              </Box>
            ) : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
