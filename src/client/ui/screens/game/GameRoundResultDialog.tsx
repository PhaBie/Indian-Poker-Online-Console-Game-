import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';
import type { ServerEvent } from '../../../../shared/types';
import type { GameStatePayload } from './types';
import { HAND_RANK_LABELS } from './gameLayoutHelpers';
import { GAME_TABLE_CANVAS_HEIGHT } from './layoutConstants';

export const ROUND_RESULT_DIALOG_HEIGHT = 30;
export const ROUND_RESULT_DIALOG_TOP = Math.max(
  1,
  Math.floor((GAME_TABLE_CANVAS_HEIGHT - ROUND_RESULT_DIALOG_HEIGHT) / 2),
);

interface GameRoundResultDialogProps {
  readonly result: Extract<ServerEvent, { type: 'GAME_RESULT' }>['payload'];
  readonly gameState: GameStatePayload;
  readonly roundStartChips: Readonly<Record<string, number>>;
  readonly myPlayerId: string | null;
  readonly onNextGame: () => void;
  readonly onEndGame: () => void;
}

type ResultPlayer = Pick<
  GameStatePayload['players'][number],
  'id' | 'name' | 'chips' | 'bet'
> & {
  readonly status?: string;
};
type GameResult = Extract<ServerEvent, { type: 'GAME_RESULT' }>['payload'];

export function getRoundParticipants<T extends { readonly status?: string }>(
  players: readonly T[],
): T[] {
  return players.filter((player) => player.status !== 'WAITING');
}

export function getWinningHandLabel(result: GameResult): string {
  if (result.winReason === 'LAST_PLAYER_STANDING') {
    return 'LAST PLAYER STANDING';
  }

  const handDescription = HAND_RANK_LABELS[result.winningHand] ?? result.winningHand;

  if (result.winReason === 'SHOW_TIE') {
    return `WON BY SHOW · ${handDescription} (TIE RULE — NON-REQUESTER WINS)`;
  }
  if (result.winReason === 'FORCED_SHOWDOWN') {
    return `FORCED SHOWDOWN · ${handDescription}`;
  }

  return `WON BY SHOW · ${handDescription}`;
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
  myPlayerId,
  onNextGame,
  onEndGame,
}: GameRoundResultDialogProps) {
  const winners = result.winnerIds
    .map((id) => gameState.players.find((player) => player.id === id)?.name ?? 'UNKNOWN')
    .join(', ');
  const resultPlayers = sortPlayersForResult(
    getRoundParticipants(gameState.players),
    result,
    roundStartChips,
  );
  const departedPlayers = result.departedPlayers ?? [];
  const winningHandLabel = getWinningHandLabel(result);

  const isHost = gameState.hostId === myPlayerId;
  const [secondsRemaining, setSecondsRemaining] = useState(5);

  useEffect(() => {
    if (!isHost) return;
    setSecondsRemaining(5);
    const interval = setInterval(
      () => setSecondsRemaining((seconds) => Math.max(0, seconds - 1)),
      1_000,
    );
    return () => clearInterval(interval);
  }, [isHost, result]);

  useInput((input) => {
    if (!isHost) return;
    if (input.toLowerCase() === 'n') onNextGame();
    if (input.toLowerCase() === 'e') onEndGame();
  });

  return (
    <Box
      position="absolute"
      top={ROUND_RESULT_DIALOG_TOP}
      left={35}
      width={74}
      height={ROUND_RESULT_DIALOG_HEIGHT}
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
          <ResultTableCell width={14} color="yellow" bold align="center">
            PLAYER
          </ResultTableCell>
          <ResultTableCell width={9} color="yellow" bold align="center">
            START
          </ResultTableCell>
          <ResultTableCell width={8} color="yellow" bold align="center">
            BET
          </ResultTableCell>
          <ResultTableCell width={10} color="yellow" bold align="center">
            PAYOUT
          </ResultTableCell>
          <ResultTableCell width={9} color="yellow" bold align="center">
            END
          </ResultTableCell>
          <ResultTableCell width={16} color="yellow" bold align="center">
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
                width={14}
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
              <ResultTableCell width={9} color="gray">
                ${startChips}
              </ResultTableCell>
              <ResultTableCell width={8} color="redBright">
                -${player.bet}
              </ResultTableCell>
              <ResultTableCell width={10} color={payout > 0 ? 'greenBright' : 'gray'}>
                {payout > 0 ? `+$${payout}` : '—'}
              </ResultTableCell>
              <ResultTableCell width={9} color="white">
                ${player.chips}
              </ResultTableCell>
              <ResultTableCell width={16} color={net >= 0 ? 'greenBright' : 'redBright'}>
                {net >= 0 ? '+' : ''}${net}
              </ResultTableCell>
            </Box>
          );
        })}
        {departedPlayers.map((player) => (
          <Box key={`departed-${player.id}`}>
            <ResultTableCell width={14} color="redBright" bold align="center">
              {player.name}
            </ResultTableCell>
            <ResultTableCell width={9} color="gray">
              —
            </ResultTableCell>
            <ResultTableCell width={8} color="gray">
              —
            </ResultTableCell>
            <ResultTableCell width={10} color="gray">
              —
            </ResultTableCell>
            <ResultTableCell width={9} color="gray">
              —
            </ResultTableCell>
            <ResultTableCell width={16} color="redBright" bold align="center">
              {player.status}
            </ResultTableCell>
          </Box>
        ))}
      </Box>
      <Box flexGrow={1} />
      <Box marginTop={1} flexDirection="column" alignItems="center">
        {isHost ? (
          <>
            <Text color="yellowBright" bold>
              HOST DECISION
            </Text>
            <Box marginTop={1} flexDirection="column" alignItems="center">
              <Text color="white">
                <Text color="yellow" bold>
                  [N]
                </Text>{' '}
                NEXT GAME
              </Text>
              <Text color="white">
                <Text color="yellow" bold>
                  [E]
                </Text>{' '}
                RETURN TO WAITING ROOM
              </Text>
            </Box>
            <Text color="gray">Auto-starting next game in {secondsRemaining}s</Text>
          </>
        ) : (
          <Text color="gray">Waiting for host decision...</Text>
        )}
      </Box>
    </Box>
  );
}
