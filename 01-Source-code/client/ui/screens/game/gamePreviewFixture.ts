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

/** จำลองเซสชันเกมแบบโลคัลสมบูรณ์ โดยใช้คลาสและกติกาเดียวกันกับฝั่งเซิร์ฟเวอร์ */
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
      myCards: this.players[0].isBlind ? [] : this.players[0].privateCards,
      pendingSideshow: this.gameState.pendingSideshow,
      // ปฏิบัติตามกฎความเป็นส่วนตัวของเซิร์ฟเวอร์หลัก: ข้อมูลไพ่ที่เปรียบเทียบใน Sideshow
      // จะส่งให้เฉพาะผู้ท้าชิงและผู้ถูกท้าชิงเท่านั้น
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

  public hasActiveSideshow(): boolean {
    return Boolean(this.gameState.lastSideshow || this.gameState.lastSideshowNotice);
  }

  /** ล้างผลลัพธ์การแสดงผล Sideshow ชั่วคราวบนหน้าจอ UI หลังจากแสดงผลตามระยะเวลาที่กำหนดแล้ว */
  public clearSideshowPresentation(): void {
    this.gameState.clearSideshowResult();
    this.gameState.lastSideshowNotice = null;
  }

  /** ดำเนินการเล่นเทิร์นของบอทหนึ่งเทิร์น โดย UI จะเรียกผ่านตัวนับเวลาสั้น ๆ เพื่อให้เห็นการเคลื่อนไหวของบอท */
  public playNextBot(): boolean {
    if (this.hasActiveSideshow()) return false;

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

    // บอททุกตัวจะเปิดดูไพ่ก่อน จากนั้นจึงสลับเล่นแอคชันต่าง ๆ เสมือนผู้เล่นจริง
    // การเคลื่อนไหวแรกของ Alpha คือการขอประลอง (Sideshow) เพื่อทดสอบขั้นตอนตอบรับ/ปฏิเสธในโหมดดูตัวอย่าง
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
      // ผู้เล่นที่เปิดดูไพ่แล้วต้องจ่ายเงินเดิมพันสองเท่า ซึ่งเป็นยอดเดิมพัน (BET) ขั้นต่ำตามกติกา
      this.play(currentPlayer.id, 'BET', this.gameState.currentStake * 2);
      return true;
    }

    // รักษารอบการเล่นช่วงแรกไว้เพื่อให้ผู้เล่นทุกคนมีโอกาสขอ Sideshow ตามกติกา ก่อนที่บอทจะเริ่มหมอบไพ่ลง
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
   * บอทที่ถูกท้าประลองจะรับรู้เฉพาะไพ่ของตนเองเสมือนผู้เล่นจริง
   * โดยจะยอมรับการดวลเฉพาะเมื่อถือไพ่ที่แข็งแกร่ง และปฏิเสธหากไพ่ต่ำ แทนที่จะยอมรับทุกคำขอ
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
