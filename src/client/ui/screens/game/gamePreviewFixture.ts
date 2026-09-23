import type { ClientEvent, GameActionType, ServerEvent } from '../../../../shared/types';
import { evaluateHand } from '../../../../server/core/gameLogic';
import { GameState } from '../../../../server/domain/models/GameState';
import { Player } from '../../../../server/domain/models/Player';
import type { GameStatePayload } from './types';

export const GAME_PREVIEW_PLAYER_ID = 'preview-player';

export type GamePreviewPlayerCount = 2 | 3 | 4;

const PREVIEW_PLAYER_NAMES = ['YOU', 'ALPHA', 'BRAVO', 'CHARLIE'] as const;
const PREVIEW_BET = 50;
type GameResultPayload = Extract<ServerEvent, { type: 'GAME_RESULT' }>['payload'];

export function shuffleOpponentNames(
  opponentNames: readonly string[],
): readonly string[] {
  if (opponentNames.length <= 1) {
    return opponentNames;
  }
  const shuffledNames = [...opponentNames];
  for (let currentIndex = shuffledNames.length - 1; currentIndex > 0; currentIndex--) {
    const targetSwapIndex = Math.floor(Math.random() * (currentIndex + 1));
    const currentName = shuffledNames[currentIndex];
    shuffledNames[currentIndex] = shuffledNames[targetSwapIndex];
    shuffledNames[targetSwapIndex] = currentName;
  }
  const isIdenticalToOriginal = shuffledNames.every(
    (name, index) => name === opponentNames[index],
  );
  if (isIdenticalToOriginal) {
    return [...shuffledNames.slice(1), shuffledNames[0]];
  }
  return shuffledNames;
}

function createPlayers(playerCount: GamePreviewPlayerCount): Player[] {
  const humanPlayer = new Player(GAME_PREVIEW_PLAYER_ID, 'YOU');
  humanPlayer.chips = 10_000;

  const rawOpponentNames = PREVIEW_PLAYER_NAMES.slice(1, playerCount);
  const resolvedOpponentNames =
    playerCount > 2 ? shuffleOpponentNames(rawOpponentNames) : rawOpponentNames;

  const botOpponents = resolvedOpponentNames.map((opponentName) => {
    const botPlayer = new Player(`preview-${opponentName.toLowerCase()}`, opponentName);
    botPlayer.chips = 10_000;
    return botPlayer;
  });

  return [humanPlayer, ...botOpponents];
}

/** Runs a fully local game using the same rule classes as the server. */
export class GamePreviewSession {
  private readonly players: Player[];
  private gameState: GameState;
  private roundResult: GameResultPayload | null = null;
  private roundStartChips: Record<string, number> = {};
  private readonly botDecisions = new Map<string, number>();

  public constructor(playerCount: GamePreviewPlayerCount) {
    this.players = createPlayers(playerCount);
    this.gameState = this.createRound();
  }

  public getState(): GameStatePayload {
    const sideshowResult = this.gameState.lastSideshow;
    const isSideshowParticipant = Boolean(
      sideshowResult &&
      (sideshowResult.challengerId === GAME_PREVIEW_PLAYER_ID ||
        sideshowResult.targetId === GAME_PREVIEW_PLAYER_ID),
    );

    return {
      roomId: 'local-preview',
      phase: 'PLAYING',
      hostId: GAME_PREVIEW_PLAYER_ID,
      maxPlayers: this.players.length,
      pot: this.gameState.pot,
      currentStake: this.gameState.currentStake,
      currentTurnPlayerId:
        this.gameState.activePlayers[this.gameState.currentPlayerIndex]?.id ?? null,
      turnEndTime: null,
      players: this.players.map(({ id, name, chips, bet, status, isBlind }) => ({
        id,
        name,
        chips,
        bet,
        status,
        isBlind,
      })),
      myCards: this.players[0].privateCards,
      pendingSideshow: this.gameState.pendingSideshow,
      // Match the authoritative server's privacy rule: the comparison cards
      // exist only in the challenger and target's client payloads.
      sideshowResult: isSideshowParticipant ? sideshowResult : null,
      sideshowNotice: this.gameState.lastSideshowNotice,
      showdownCards: this.gameState.pendingShow?.cards ?? null,
      roundResult: this.roundResult,
    };
  }

  public handleEvent(event: ClientEvent): void {
    if (event.type !== 'PLAYER_ACTION') return;
    this.play(GAME_PREVIEW_PLAYER_ID, event.payload.action, event.payload.amount);
  }

  public getRoundResult(): GameResultPayload | null {
    return this.roundResult;
  }

  public resolveShowdown(): boolean {
    if (!this.gameState.pendingShow) return false;
    this.roundResult = this.gameState.endGame(true);
    return this.roundResult !== null;
  }

  public getRoundStartChips(): Readonly<Record<string, number>> {
    return this.roundStartChips;
  }

  public startNextRound(): void {
    if (!this.roundResult) return;
    this.roundResult = null;
    this.gameState = this.createRound();
  }

  /** Clears a completed Sideshow's short-lived UI snapshot after its pause. */
  public clearSideshowPresentation(): void {
    this.gameState.lastSideshow = null;
    this.gameState.lastSideshowNotice = null;
  }

  /** Plays one bot turn. The UI calls this on a short timer so bot moves are visible. */
  public playNextBot(): boolean {
    const pending = this.gameState.pendingSideshow;
    if (pending) {
      if (pending.targetId === GAME_PREVIEW_PLAYER_ID) return false;
      this.play(
        pending.targetId,
        this.shouldAcceptSideshow(pending.targetId)
          ? 'ACCEPT_SIDESHOW'
          : 'REJECT_SIDESHOW',
      );
      return true;
    }

    const currentPlayer = this.gameState.activePlayers[this.gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id === GAME_PREVIEW_PLAYER_ID) return false;

    const activePlayers = this.gameState.activePlayers.filter(
      (player) => player.status === 'ACTIVE',
    );
    if (activePlayers.length === 2) {
      const opponent = activePlayers.find((player) => player !== currentPlayer);
      if (currentPlayer.isBlind || !opponent?.isBlind) {
        this.play(currentPlayer.id, 'SHOW');
        return true;
      }
    }

    // Every bot first looks at its cards, then mixes in the same actions a
    // human can choose. Alpha's first move is a duel, which exposes the
    // accept/decline flow in Preview as well.
    if (currentPlayer.isBlind) {
      this.play(currentPlayer.id, 'SEEN');
      return true;
    }

    const decision = this.botDecisions.get(currentPlayer.id) ?? 0;
    this.botDecisions.set(currentPlayer.id, decision + 1);
    const botIndex = this.players.indexOf(currentPlayer);

    const isEveryActivePlayerSeen = activePlayers.every((player) => !player.isBlind);
    if (
      activePlayers.length > 2 &&
      isEveryActivePlayerSeen &&
      (botIndex + decision) % 3 === 1
    ) {
      this.play(currentPlayer.id, 'SIDESHOW');
      return true;
    }

    if ((botIndex + decision) % 3 === 2) {
      // A seen player pays double; this is the legal minimum BET amount.
      this.play(currentPlayer.id, 'BET', this.gameState.currentStake * 2);
      return true;
    }

    // Keep the first several circuits intact so every player can reach a
    // Pagat-legal Sideshow before bots begin folding the table down.
    const foldThreshold = PREVIEW_BET * this.players.length * 10;
    this.play(currentPlayer.id, this.gameState.pot >= foldThreshold ? 'FOLD' : 'CALL');
    return true;
  }

  private createRound(): GameState {
    this.botDecisions.clear();
    for (const player of this.players) player.resetForNewRound();
    this.roundStartChips = Object.fromEntries(
      this.players.map((player) => [player.id, player.chips]),
    );
    const round = new GameState(this.players, PREVIEW_BET, true);
    round.startGame();
    return round;
  }

  /**
   * A challenged bot only knows its own cards, just like a real player. It
   * protects strong made hands and declines weak ones instead of accepting
   * every bot's first Sideshow request.
   */
  private shouldAcceptSideshow(playerId: string): boolean {
    const player = this.players.find((candidate) => candidate.id === playerId);
    if (!player) return false;

    const hand = evaluateHand(player.privateCards);
    if (
      hand.rank === 'TRAIL' ||
      hand.rank === 'PURE_SEQUENCE' ||
      hand.rank === 'SEQUENCE' ||
      hand.rank === 'COLOR'
    ) {
      return true;
    }

    if (hand.rank === 'PAIR') return hand.rankValue >= 10;
    return hand.rankValue >= 13;
  }

  private play(playerId: string, action: GameActionType, amount?: number): void {
    const isGameOver = this.gameState.processAction(playerId, action, amount);
    if (isGameOver) {
      this.roundResult = this.gameState.endGame(true);
      return;
    }

    if (action !== 'SEEN' && action !== 'SIDESHOW' && action !== 'SHOW') {
      this.gameState.nextTurn();
    }
  }
}

export function createGamePreviewState(
  playerCount: GamePreviewPlayerCount,
): GameStatePayload {
  return new GamePreviewSession(playerCount).getState();
}

export function parsePreviewPlayerCount(
  value: string | undefined,
): GamePreviewPlayerCount {
  if (value === '3') return 3;
  if (value === '4') return 4;
  return 2;
}

export const GAME_PREVIEW_STATE = createGamePreviewState(2);
