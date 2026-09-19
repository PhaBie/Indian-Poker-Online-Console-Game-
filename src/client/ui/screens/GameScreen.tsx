import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type { ServerEvent, Card, GameActionType } from '../../../shared/types';
import type { SocketClient } from '../../network/socketClient';

type GameStatePayload = Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>['payload'];

export interface GameScreenProps {
  gameState: GameStatePayload;
  myPlayerId: string | null;
  socketClient: SocketClient;
  serverError?: string | null;
}

export function GameScreen({
  gameState,
  myPlayerId,
  socketClient,
  serverError,
}: GameScreenProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  // UI States
  // 'menu' -> selecting action
  // 'input_bet' -> typing amount
  const [inputMode, setInputMode] = useState<'menu' | 'input_bet'>('menu');
  const [betAmount, setBetAmount] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<GameActionType | null>(null);

  const { players, pot, currentTurnPlayerId, myCards, roomId, pendingSideshow } =
    gameState;

  const isMyTurn = currentTurnPlayerId === myPlayerId && !pendingSideshow;
  const isPendingSideshowTarget = pendingSideshow?.targetId === myPlayerId;
  const isPendingSideshowChallenger = pendingSideshow?.challengerId === myPlayerId;

  // Options for normal turn
  const actionItems = [
    { label: 'Bet/Raise', value: 'BET' },
    { label: 'Call', value: 'CALL' },
    { label: 'Fold', value: 'FOLD' },
    { label: 'Seen (ดูไพ่)', value: 'SEEN' },
    { label: 'Sideshow (ดวล)', value: 'SIDESHOW' },
    { label: 'Show Hand', value: 'SHOW' },
  ];

  // Options for pending sideshow
  const sideshowItems = [
    { label: 'Accept Sideshow', value: 'ACCEPT_SIDESHOW' },
    { label: 'Reject Sideshow', value: 'REJECT_SIDESHOW' },
  ];

  const handleActionSelect = (item: { label: string; value: string }) => {
    setLocalError(null);
    const action = item.value as GameActionType;

    if (action === 'BET' || action === 'RAISE') {
      setSelectedAction(action);
      setInputMode('input_bet');
      setBetAmount('');
    } else {
      socketClient.send({ type: 'PLAYER_ACTION', payload: { action } });
    }
  };

  const handleBetSubmit = (value: string) => {
    const amount = parseInt(value, 10);
    if (isNaN(amount) || amount <= 0) {
      setLocalError('จำนวนเงินไม่ถูกต้อง');
      setInputMode('menu');
      return;
    }

    socketClient.send({
      type: 'PLAYER_ACTION',
      payload: { action: selectedAction || 'BET', amount },
    });

    setInputMode('menu');
  };

  const myIndex = players.findIndex((p) => p.id === myPlayerId);
  const orderedPlayers = [];

  if (myIndex !== -1) {
    for (let i = 0; i < players.length; i++) {
      orderedPlayers.push(players[(myIndex + i) % players.length]);
    }
  } else {
    orderedPlayers.push(...players); // Spectator view
  }

  // Layout positions
  const bottomPlayer = orderedPlayers[0];
  const leftPlayer = players.length >= 3 ? orderedPlayers[1] : undefined;
  const topPlayer =
    players.length === 2
      ? orderedPlayers[1]
      : players.length >= 4
        ? orderedPlayers[2]
        : undefined;
  const rightPlayer =
    players.length === 3
      ? orderedPlayers[2]
      : players.length === 4
        ? orderedPlayers[3]
        : undefined;

  const renderCard = (card?: Card, isHidden: boolean = false) => {
    if (isHidden) {
      return (
        <Box
          key={Math.random()}
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
          marginX={0.5}
          width={5}
          height={3}
          justifyContent="center"
          alignItems="center"
        >
          <Text color="gray">?</Text>
        </Box>
      );
    }
    if (!card) {
      return (
        <Box
          key={Math.random()}
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
          marginX={0.5}
          width={5}
          height={3}
        ></Box>
      );
    }
    const color = card.suit === 'HEARTS' || card.suit === 'DIAMONDS' ? 'red' : 'white';
    const suitSymbol = { SPADES: '♠', HEARTS: '♥', DIAMONDS: '♦', CLUBS: '♣' }[card.suit];
    const rankStr =
      card.rank === 11
        ? 'J'
        : card.rank === 12
          ? 'Q'
          : card.rank === 13
            ? 'K'
            : card.rank === 14
              ? 'A'
              : card.rank.toString();

    return (
      <Box
        key={Math.random()}
        borderStyle="single"
        borderColor={color}
        paddingX={0}
        marginX={0.5}
        width={5}
        height={3}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        <Text color={color}>
          {rankStr}
          {suitSymbol}
        </Text>
      </Box>
    );
  };

  const renderPlayerNode = (
    player: (typeof players)[0] | undefined,
    _position: 'top' | 'bottom' | 'left' | 'right',
  ) => {
    if (!player) return <Box width={30} height={8} />;

    const isThisPlayerTurn = player.id === currentTurnPlayerId && !pendingSideshow;
    const isMe = player.id === myPlayerId;
    const isPendingSideshowTargetNode = pendingSideshow?.targetId === player.id;
    const borderColor =
      isThisPlayerTurn || isPendingSideshowTargetNode ? 'cyanBright' : 'gray';
    const hasFolded = player.status === 'FOLDED';

    let cardsToRender: React.ReactNode[] = [];
    if (isMe) {
      if (player.isBlind && !hasFolded) {
        cardsToRender = [1, 2, 3].map(() => renderCard(undefined, true));
      } else {
        cardsToRender = [0, 1, 2].map((i) => renderCard(myCards[i], false));
      }
    } else {
      cardsToRender = [1, 2, 3].map(() => renderCard(undefined, true));
    }

    return (
      <Box flexDirection="column" alignItems="center" width={30}>
        <Text color={isMe ? 'cyanBright' : 'white'}>
          👤 {isMe ? 'YOU' : player.name} {player.isBlind ? '(Blind)' : ''}
        </Text>
        <Box
          borderStyle="round"
          borderColor={borderColor}
          width={28}
          height={9}
          flexDirection="column"
          paddingX={1}
        >
          <Box flexDirection="row" justifyContent="space-between">
            <Text color="yellowBright">Chips: ${player.chips}</Text>
            <Box flexDirection="column" alignItems="flex-end">
              <Text color="redBright">Bet: ${player.bet}</Text>
              {hasFolded ? (
                <Text color="gray">[FOLD]</Text>
              ) : isThisPlayerTurn ? (
                <Text color="cyanBright">[TURN]</Text>
              ) : isPendingSideshowTargetNode ? (
                <Text color="magentaBright">[SIDESHOW?]</Text>
              ) : null}
            </Box>
          </Box>
          <Box flexDirection="row" justifyContent="center" marginTop={1}>
            {cardsToRender}
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="row" width={100} height={30}>
      <Box
        borderStyle="round"
        borderColor="cyan"
        width={70}
        flexDirection="column"
        position="relative"
      >
        <Box justifyContent="space-between" paddingX={1}>
          <Text color="white">ROOM: #{roomId.substring(0, 6)}</Text>
          <Text color="greenBright" bold>
            PLAYING
          </Text>
        </Box>

        <Box
          flexGrow={1}
          flexDirection="column"
          justifyContent="space-between"
          paddingY={1}
        >
          <Box justifyContent="center" width="100%">
            <Box marginLeft={18}>{renderPlayerNode(topPlayer, 'top')}</Box>
          </Box>

          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            paddingX={2}
          >
            {renderPlayerNode(leftPlayer, 'left')}

            <Box
              borderStyle="round"
              borderColor="gray"
              paddingX={3}
              paddingY={1}
              flexDirection="column"
              alignItems="center"
            >
              <Text color="white">TOTAL POT</Text>
              <Text color="greenBright" bold>
                ${pot}
              </Text>
            </Box>

            {renderPlayerNode(rightPlayer, 'right')}
          </Box>

          <Box justifyContent="center" width="100%">
            <Box marginLeft={18}>{renderPlayerNode(bottomPlayer, 'bottom')}</Box>
          </Box>
        </Box>
      </Box>

      <Box flexDirection="column" width={28} marginLeft={1}>
        <Box
          borderStyle="round"
          borderColor="magentaBright"
          flexDirection="column"
          paddingX={1}
          height={14}
        >
          <Box justifyContent="center" marginBottom={1}>
            <Text color="magentaBright" bold>
              ACTIONS
            </Text>
          </Box>

          {isMyTurn && inputMode === 'menu' && (
            <SelectInput items={actionItems} onSelect={handleActionSelect} />
          )}

          {isMyTurn && inputMode === 'input_bet' && (
            <Box flexDirection="column">
              <Text color="cyanBright">จำนวนเงินที่จะ Bet:</Text>
              <Box flexDirection="row">
                <Text color="white">&gt; </Text>
                <TextInput
                  value={betAmount}
                  onChange={setBetAmount}
                  onSubmit={handleBetSubmit}
                />
              </Box>
              <Text color="gray">(กด Enter เพื่อยืนยัน)</Text>
            </Box>
          )}

          {isPendingSideshowTarget && (
            <Box flexDirection="column">
              <Text color="redBright">ผู้เล่นอื่นขอ Sideshow!</Text>
              <SelectInput items={sideshowItems} onSelect={handleActionSelect} />
            </Box>
          )}

          {!isMyTurn && !isPendingSideshowTarget && (
            <Box alignItems="center" justifyContent="center" flexGrow={1}>
              <Text color="gray">Waiting...</Text>
            </Box>
          )}
        </Box>

        <Box
          borderStyle="round"
          borderColor="blueBright"
          flexDirection="column"
          paddingX={1}
          flexGrow={1}
          marginTop={1}
        >
          <Box justifyContent="center" marginBottom={1}>
            <Text color="blueBright" bold>
              STATUS
            </Text>
          </Box>
          <Box flexGrow={1} flexDirection="column" justifyContent="flex-end">
            <Box
              borderStyle="single"
              borderBottom={false}
              borderLeft={false}
              borderRight={false}
              borderColor="gray"
              paddingTop={1}
              flexDirection="column"
              alignItems="center"
            >
              {localError && <Text color="red"> {localError}</Text>}
              {serverError && <Text color="redBright"> [Server]: {serverError}</Text>}

              {isMyTurn ? (
                <Text color="greenBright" bold>
                  Your turn!
                </Text>
              ) : isPendingSideshowTarget ? (
                <Text color="redBright" bold>
                  Action Required!
                </Text>
              ) : isPendingSideshowChallenger ? (
                <Text color="yellowBright">Waiting for target...</Text>
              ) : pendingSideshow ? (
                <Text color="gray">Sideshow pending...</Text>
              ) : (
                <Text color="white">Waiting for turn...</Text>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
