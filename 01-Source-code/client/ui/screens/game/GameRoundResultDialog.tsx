import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';
import type { HandRank, RoundWinReason, ServerEvent } from '../../../../shared/types';
import { UI_COLORS } from '../../shared/theme/colors';
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
type DepartedResultPlayer = NonNullable<GameResult['departedPlayers']>[number];

interface RoundResultPresentation {
  readonly reasonLabel: string;
  readonly reasonColor: string;
  readonly handLabel: string | null;
  readonly handColor: string | null;
  readonly detailLabel: string | null;
  readonly detailColor: string | null;
}

const WIN_REASON_PRESENTATIONS: Readonly<
  Record<RoundWinReason, { readonly label: string; readonly color: string }>
> = {
  SHOW: { label: 'WON BY SHOW', color: UI_COLORS.roundResultShow },
  SHOW_TIE: { label: 'WON BY SHOW', color: UI_COLORS.roundResultShowTie },
  FORCED_SHOWDOWN: {
    label: 'FORCED SHOWDOWN',
    color: UI_COLORS.roundResultForcedShowdown,
  },
  LAST_PLAYER_STANDING: {
    label: 'LAST PLAYER STANDING',
    color: UI_COLORS.roundResultLastPlayerStanding,
  },
};

const HAND_RANK_COLORS: Readonly<Record<HandRank, string>> = {
  TRAIL: UI_COLORS.handRankTrail,
  PURE_SEQUENCE: UI_COLORS.handRankPureSequence,
  SEQUENCE: UI_COLORS.handRankSequence,
  COLOR: UI_COLORS.handRankColor,
  PAIR: UI_COLORS.handRankPair,
  HIGH_CARD: UI_COLORS.handRankHighCard,
};

export function getRoundParticipants<T extends { readonly status?: string }>(
  players: readonly T[],
): T[] {
  return players.filter((player) => player.status !== 'WAITING');
}

export function getWinningHandLabel(result: GameResult): string {
  const presentation = getRoundResultPresentation(result);
  const handLabel = presentation.handLabel ? ` · ${presentation.handLabel}` : '';
  const detailLabel = presentation.detailLabel ? ` (${presentation.detailLabel})` : '';
  return `${presentation.reasonLabel}${handLabel}${detailLabel}`;
}

export function getRoundResultPresentation(result: GameResult): RoundResultPresentation {
  const reason = WIN_REASON_PRESENTATIONS[result.winReason];
  if (result.winReason === 'LAST_PLAYER_STANDING') {
    return {
      reasonLabel: reason.label,
      reasonColor: reason.color,
      handLabel: null,
      handColor: null,
      detailLabel: null,
      detailColor: null,
    };
  }

  return {
    reasonLabel: reason.label,
    reasonColor: reason.color,
    handLabel: HAND_RANK_LABELS[result.winningHand],
    handColor: HAND_RANK_COLORS[result.winningHand],
    detailLabel: result.winReason === 'SHOW_TIE' ? 'TIE RULE — NON-REQUESTER WINS' : null,
    detailColor: result.winReason === 'SHOW_TIE' ? UI_COLORS.roundResultShowTie : null,
  };
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

const RESULT_TABLE_COLUMNS = [
  { key: 'player', label: 'PLAYER', width: 14 },
  { key: 'start', label: 'START', width: 9 },
  { key: 'bet', label: 'BET', width: 8 },
  { key: 'payout', label: 'PAYOUT', width: 10 },
  { key: 'end', label: 'END', width: 9 },
  { key: 'net', label: 'NET', width: 16 },
] as const;

interface RoundResultHeadlineProps {
  readonly winners: string;
  readonly resultPresentation: RoundResultPresentation;
}

function RoundResultHeadline({ winners, resultPresentation }: RoundResultHeadlineProps) {
  return (
    <>
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
        <Text color="gray"> · </Text>
        <Text color={resultPresentation.reasonColor} bold>
          {resultPresentation.reasonLabel}
        </Text>
        {resultPresentation.handLabel ? (
          <>
            <Text color="gray"> · </Text>
            <Text color={resultPresentation.handColor ?? UI_COLORS.white} bold>
              {resultPresentation.handLabel}
            </Text>
          </>
        ) : null}
        {resultPresentation.detailLabel ? (
          <Text color={resultPresentation.detailColor ?? UI_COLORS.white}>
            {' '}
            ({resultPresentation.detailLabel})
          </Text>
        ) : null}
      </Box>
    </>
  );
}

function ResultTableHeader() {
  return (
    <Box>
      {RESULT_TABLE_COLUMNS.map((column) => (
        <ResultTableCell
          key={column.key}
          width={column.width}
          color="yellow"
          bold
          align="center"
        >
          {column.label}
        </ResultTableCell>
      ))}
    </Box>
  );
}

interface ActivePlayerResultRowProps {
  readonly player: ResultPlayer;
  readonly result: GameResult;
  readonly roundStartChips: Readonly<Record<string, number>>;
  readonly hostId: string;
}

function ActivePlayerResultRow({
  player,
  result,
  roundStartChips,
  hostId,
}: ActivePlayerResultRowProps) {
  const payout = result.payouts[player.id] ?? 0;
  const startChips = roundStartChips[player.id] ?? player.chips - payout + player.bet;
  const net = player.chips - startChips;
  const isWinner = result.winnerIds.includes(player.id);
  const playerNameColor = isWinner
    ? 'greenBright'
    : player.id === hostId
      ? 'cyanBright'
      : 'white';

  return (
    <Box>
      <ResultTableCell width={14} color={playerNameColor} align="center">
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
}

interface DepartedPlayerResultRowProps {
  readonly player: DepartedResultPlayer;
}

function DepartedPlayerResultRow({ player }: DepartedPlayerResultRowProps) {
  return (
    <Box>
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
  );
}

interface RoundResultTableProps {
  readonly resultPlayers: readonly ResultPlayer[];
  readonly departedPlayers: readonly DepartedResultPlayer[];
  readonly result: GameResult;
  readonly roundStartChips: Readonly<Record<string, number>>;
  readonly hostId: string;
}

function RoundResultTable({
  resultPlayers,
  departedPlayers,
  result,
  roundStartChips,
  hostId,
}: RoundResultTableProps) {
  return (
    <Box marginTop={2} flexDirection="column" width={66}>
      <ResultTableHeader />
      {resultPlayers.map((player) => (
        <ActivePlayerResultRow
          key={player.id}
          player={player}
          result={result}
          roundStartChips={roundStartChips}
          hostId={hostId}
        />
      ))}
      {departedPlayers.map((player) => (
        <DepartedPlayerResultRow key={`departed-${player.id}`} player={player} />
      ))}
    </Box>
  );
}

interface HostDecisionPanelProps {
  readonly isHost: boolean;
  readonly secondsRemaining: number;
}

function HostDecisionPanel({ isHost, secondsRemaining }: HostDecisionPanelProps) {
  return (
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
  );
}

interface UseHostDecisionControlsOptions {
  readonly isHost: boolean;
  readonly result: GameResult;
  readonly onNextGame: () => void;
  readonly onEndGame: () => void;
}

function useHostDecisionControls({
  isHost,
  result,
  onNextGame,
  onEndGame,
}: UseHostDecisionControlsOptions) {
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

  return { secondsRemaining };
}

function getWinnerNames(
  winnerIds: readonly string[],
  players: readonly GameStatePayload['players'][number][],
): string {
  return winnerIds
    .map((id) => players.find((player) => player.id === id)?.name ?? 'UNKNOWN')
    .join(', ');
}

export function GameRoundResultDialog(props: GameRoundResultDialogProps) {
  const { result, gameState, roundStartChips, myPlayerId, onNextGame, onEndGame } = props;
  const isHost = gameState.hostId === myPlayerId;
  const { secondsRemaining } = useHostDecisionControls({
    isHost,
    result,
    onNextGame,
    onEndGame,
  });
  const winners = getWinnerNames(result.winnerIds, gameState.players);
  const resultPlayers = sortPlayersForResult(
    getRoundParticipants(gameState.players),
    result,
    roundStartChips,
  );

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
      <RoundResultHeadline
        winners={winners}
        resultPresentation={getRoundResultPresentation(result)}
      />
      <RoundResultTable
        resultPlayers={resultPlayers}
        departedPlayers={result.departedPlayers ?? []}
        result={result}
        roundStartChips={roundStartChips}
        hostId={gameState.hostId}
      />
      <Box flexGrow={1} />
      <HostDecisionPanel isHost={isHost} secondsRemaining={secondsRemaining} />
    </Box>
  );
}
