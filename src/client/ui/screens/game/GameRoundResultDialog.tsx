import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';
import type { ServerEvent } from '../../../../shared/types';
import type { GameStatePayload } from './types';

interface GameRoundResultDialogProps {
  readonly result: Extract<ServerEvent, { type: 'GAME_RESULT' }>['payload'];
  readonly gameState: GameStatePayload;
  readonly roundStartChips: Readonly<Record<string, number>>;
  readonly showAutoNextRound?: boolean;
  readonly autoAdvanceLabel?: string;
  readonly onNextRound?: () => void;
}

type ResultPlayer = Pick<
  GameStatePayload['players'][number],
  'id' | 'name' | 'chips' | 'bet'
>;
type GameResult = Extract<ServerEvent, { type: 'GAME_RESULT' }>['payload'];

export function getWinningHandLabel(result: GameResult): string {
  return Object.keys(result.exposedCards).length === 0
    ? 'WON BY FOLD'
    : result.winningHand;
}

export function sortPlayersForResult(
  players: readonly ResultPlayer[],
  result: GameResult,
  roundStartChips: Readonly<Record<string, number>>,
): ResultPlayer[] {
  const winnerPositions = new Map(result.winnerIds.map((id, index) => [id, index]));
  const getNet = (player: ResultPlayer) =>
    player.chips -
    (roundStartChips[player.id] ??
      player.chips - (result.payouts[player.id] ?? 0) + player.bet);

  return [...players].sort((first, second) => {
    const firstWinnerPosition = winnerPositions.get(first.id);
    const secondWinnerPosition = winnerPositions.get(second.id);
    if (firstWinnerPosition !== undefined || secondWinnerPosition !== undefined) {
      return (
        (firstWinnerPosition ?? Number.MAX_SAFE_INTEGER) -
        (secondWinnerPosition ?? Number.MAX_SAFE_INTEGER)
      );
    }
    return (
      second.chips - first.chips ||
      getNet(second) - getNet(first) ||
      first.name.localeCompare(second.name)
    );
  });
}

function WinnerName({ children }: { readonly children: string }) {
  const [lightPosition, setLightPosition] = useState(0);

  useEffect(() => {
    const timer = setTimeout(
      () => setLightPosition((position) => (position + 1) % children.length),
      130,
    );
    return () => clearTimeout(timer);
  }, [children.length, lightPosition]);

  return (
    <Text bold>
      {Array.from(children).map((character, index) => (
        <Text
          key={`${character}-${index}`}
          color={index === lightPosition ? 'white' : 'greenBright'}
          bold={index === lightPosition}
        >
          {character}
        </Text>
      ))}
    </Text>
  );
}

function ResultTableCell({
  children,
  width,
  color,
  bold = false,
  align = 'end',
}: {
  readonly children: React.ReactNode;
  readonly width: number;
  readonly color: string;
  readonly bold?: boolean;
  readonly align?: 'center' | 'end';
}) {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      width={width}
      height={3}
      paddingX={1}
      justifyContent={align === 'center' ? 'center' : 'flex-end'}
      alignItems="center"
    >
      <Text color={color} bold={bold} wrap="truncate">
        {children}
      </Text>
    </Box>
  );
}

export function GameRoundResultDialog({
  result,
  gameState,
  roundStartChips,
  showAutoNextRound = false,
  autoAdvanceLabel,
  onNextRound,
}: GameRoundResultDialogProps) {
  const winners = result.winnerIds
    .map((id) => gameState.players.find((player) => player.id === id)?.name ?? 'UNKNOWN')
    .join(', ');
  const resultPlayers = sortPlayersForResult(gameState.players, result, roundStartChips);
  const winningHandLabel = getWinningHandLabel(result);

  useInput((_, key) => {
    if (!showAutoNextRound && key.return && onNextRound) onNextRound();
  });

  return (
    <Box
      position="absolute"
      top={7}
      left={35}
      width={74}
      height={27}
      borderStyle="double"
      borderColor="yellowBright"
      backgroundColor="black"
      paddingX={3}
      paddingY={1}
      flexDirection="column"
    >
      <Box justifyContent="center">
        <Text color="yellowBright" bold>
          ROUND COMPLETE
        </Text>
      </Box>
      <Box marginTop={1} justifyContent="center">
        <Text color="gray">WINNER </Text>
        <Text color="greenBright" bold>
          {winners}
        </Text>
        <Text color="gray"> · {winningHandLabel}</Text>
      </Box>
      <Box marginTop={2} flexDirection="column" width={66}>
        <Box>
          <ResultTableCell width={16} color="yellow" bold align="center">
            PLAYER
          </ResultTableCell>
          <ResultTableCell width={10} color="yellow" bold align="center">
            START
          </ResultTableCell>
          <ResultTableCell width={9} color="yellow" bold align="center">
            BET
          </ResultTableCell>
          <ResultTableCell width={11} color="yellow" bold align="center">
            PAYOUT
          </ResultTableCell>
          <ResultTableCell width={10} color="yellow" bold align="center">
            END
          </ResultTableCell>
          <ResultTableCell width={10} color="yellow" bold align="center">
            NET
          </ResultTableCell>
        </Box>
        {resultPlayers.map((player) => {
          const payout = result.payouts[player.id] ?? 0;
          const startChips =
            roundStartChips[player.id] ?? player.chips - payout + player.bet;
          const net = player.chips - startChips;
          const isWinner = result.winnerIds.includes(player.id);
          return (
            <Box key={player.id}>
              <ResultTableCell
                width={16}
                color={
                  isWinner
                    ? 'greenBright'
                    : player.id === gameState.hostId
                      ? 'cyanBright'
                      : 'white'
                }
                align="center"
              >
                {isWinner ? <WinnerName>{player.name}</WinnerName> : player.name}
              </ResultTableCell>
              <ResultTableCell width={10} color="gray">
                ${startChips}
              </ResultTableCell>
              <ResultTableCell width={9} color="redBright">
                -${player.bet}
              </ResultTableCell>
              <ResultTableCell width={11} color={payout > 0 ? 'greenBright' : 'gray'}>
                {payout > 0 ? `+$${payout}` : '—'}
              </ResultTableCell>
              <ResultTableCell width={10} color="white">
                ${player.chips}
              </ResultTableCell>
              <ResultTableCell width={10} color={net >= 0 ? 'greenBright' : 'redBright'}>
                {net >= 0 ? '+' : ''}${net}
              </ResultTableCell>
            </Box>
          );
        })}
      </Box>
      <Box flexGrow={1} />
      {showAutoNextRound && (
        <Box justifyContent="center">
          <Text color="yellow" bold>
            {autoAdvanceLabel ?? 'AUTO NEXT ROUND'}{' '}
          </Text>
          <Text color="white">IN 6 SECONDS</Text>
        </Box>
      )}
      {!showAutoNextRound && onNextRound && (
        <Box justifyContent="center">
          <Text color="yellow" bold>
            ENTER{' '}
          </Text>
          <Text color="gray">NEXT DEAL</Text>
        </Box>
      )}
    </Box>
  );
}
