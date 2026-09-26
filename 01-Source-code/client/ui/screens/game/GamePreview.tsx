import { useApp } from 'ink';
import { useEffect, useMemo, useState } from 'react';
import { SocketClient } from '../../../network/socketClient';
import type { Transport } from '../../../network/socketClient';
import { GameScreen } from './GameScreen';
import {
  GAME_PREVIEW_PLAYER_ID,
  GamePreviewSession,
  type GamePreviewPlayerCount,
} from './gamePreviewFixture';
import type { ServerEvent } from '../../../../shared/types';
import type { GameStatePayload } from './types';

type GameResultPayload = Extract<ServerEvent, { type: 'GAME_RESULT' }>['payload'];
// Keep every bot action visible: seeing cards, calling, betting, folding, and
// a new turn are all deliberately separated in Preview.
const BOT_ACTION_DELAY_MS = 6_000;
const SIDESHOW_CARDS_REVEAL_DELAY_MS = 2_000;
const SIDESHOW_RESULT_DELAY_MS = 4_000;
const SIDESHOW_DECLINED_DELAY_MS = 4_000;
export const HIDDEN_SIDESHOW_PAUSE_MS = 1_200;
const SHOWDOWN_REVEAL_DELAY_MS = 4_000;
const ROUND_RESULT_DELAY_MS = 6_000;

export function scheduleSideshowResume(
  session: GamePreviewSession,
  gameState: GameStatePayload,
  onResolved: (
    nextState: GameStatePayload,
    nextRoundResult: GameResultPayload | null,
  ) => void,
): () => void {
  const pauseDuration = gameState.sideshowResult
    ? SIDESHOW_CARDS_REVEAL_DELAY_MS + SIDESHOW_RESULT_DELAY_MS
    : gameState.sideshowNotice
      ? SIDESHOW_DECLINED_DELAY_MS
      : HIDDEN_SIDESHOW_PAUSE_MS;

  const timer = setTimeout(() => {
    session.clearSideshowPresentation();
    session.playNextBot();
    onResolved(session.getState(), session.getRoundResult());
  }, pauseDuration);

  return () => clearTimeout(timer);
}

interface GamePreviewProps {
  readonly playerCount: GamePreviewPlayerCount;
}

export function GamePreview({ playerCount }: GamePreviewProps) {
  const { exit } = useApp();
  const [session] = useState(() => new GamePreviewSession(playerCount));
  const [gameState, setGameState] = useState(() => session.getState());
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [roundResult, setRoundResult] = useState<GameResultPayload | null>(null);
  const [roundStartChips, setRoundStartChips] = useState(() =>
    session.getRoundStartChips(),
  );
  // The session owns the result. Reading it here is a defensive fallback so a
  // completed round cannot be left on the table if a UI state update is missed.
  const resolvedRoundResult = roundResult ?? session.getRoundResult();
  const previewSocket = useMemo(() => {
    const socket = new SocketClient();
    const transport: Transport = {
      onOpen: null,
      send: (data) => {
        try {
          session.handleEvent(JSON.parse(data));
          setPreviewError(null);
          setGameState(session.getState());
          setRoundResult(session.getRoundResult());
        } catch (error) {
          setPreviewError(error instanceof Error ? error.message : 'คำสั่งไม่ถูกต้อง');
        }
      },
    };
    socket.connect('ws://game-preview', transport);
    transport.onOpen?.();
    return socket;
  }, [session]);

  useEffect(() => {
    if (!session.hasActiveSideshow()) return;

    return scheduleSideshowResume(session, gameState, (nextState, nextRoundResult) => {
      setGameState(nextState);
      setRoundResult(nextRoundResult);
    });
  }, [gameState, session]);

  useEffect(() => {
    if (!gameState.showdownCards || resolvedRoundResult) return;

    const timer = setTimeout(() => {
      session.resolveShowdown();
      setGameState(session.getState());
      setRoundResult(session.getRoundResult());
    }, SHOWDOWN_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [gameState.showdownCards, resolvedRoundResult, session]);

  useEffect(() => {
    if (resolvedRoundResult) return;
    if (gameState.showdownCards) return;
    if (session.hasActiveSideshow()) return;
    const pendingSideshow = gameState.pendingSideshow;
    if (
      pendingSideshow?.targetId === GAME_PREVIEW_PLAYER_ID ||
      (!pendingSideshow && gameState.currentTurnPlayerId === GAME_PREVIEW_PLAYER_ID)
    ) {
      return;
    }

    const timer = setTimeout(() => {
      session.playNextBot();
      setGameState(session.getState());
      setRoundResult(session.getRoundResult());
    }, BOT_ACTION_DELAY_MS);
    return () => clearTimeout(timer);
  }, [gameState, resolvedRoundResult, session]);

  useEffect(() => {
    if (!resolvedRoundResult) return;
    const timer = setTimeout(() => {
      session.startNextRound();
      setRoundResult(null);
      setRoundStartChips(session.getRoundStartChips());
      setGameState(session.getState());
    }, ROUND_RESULT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [resolvedRoundResult, session]);

  const handleNextRound = () => {
    session.startNextRound();
    setRoundResult(null);
    setRoundStartChips(session.getRoundStartChips());
    setGameState(session.getState());
  };

  return (
    <GameScreen
      gameState={gameState}
      myPlayerId={GAME_PREVIEW_PLAYER_ID}
      socketClient={previewSocket}
      serverError={previewError}
      roundResult={resolvedRoundResult}
      roundStartChips={roundStartChips}
      onNextGame={handleNextRound}
      onEndGame={handleNextRound}
      onLeave={exit}
    />
  );
}
