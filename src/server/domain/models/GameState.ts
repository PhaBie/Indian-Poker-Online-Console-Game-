import {
  calculateSplitPot,
  compareHands,
  createDeck,
  dealCards,
  evaluateHand,
  getWinners,
  shuffleDeck,
} from '../../core/gameLogic';
import type { Card, GameActionType, HandRank } from '../../../shared/types';
import {
  GameError,
  InvalidActionError,
  PlayerStateError,
  WrongTurnError,
} from '../errors/GameError';
import type { Player } from './Player';

type GameResult = {
  winnerIds: string[];
  winningHand: HandRank;
  payouts: Record<string, number>;
  exposedCards: Record<string, Card[]>;
};

export class GameState {
  public pot: number;
  public currentStake: number;
  public currentPlayerIndex: number;
  public deck: Card[];
  public activePlayers: Player[];
  public bootAmount: number;
  public maxPotLimit: number;
  public dealerIndex: number;
  public pendingSideshow: { challengerId: string; targetId: string } | null;
  public lastSideshow: {
    challengerId: string;
    targetId: string;
    winnerId: string;
    loserId: string;
    cards: Record<string, Card[]>;
  } | null;
  public lastSideshowNotice: {
    challengerId: string;
    targetId: string;
    outcome: 'DECLINED';
  } | null;
  public pendingShow: {
    requesterId: string;
    opponentId: string;
    cards: Record<string, Card[]>;
  } | null;
  public readonly deferShowSettlement: boolean;
  /** Keep the bankrupt seat visible briefly before this deal is settled. */
  public isRoundEnding: boolean;
  /** Settlement is idempotent: callers after SHOW receive this result, not null. */
  public lastGameResult: GameResult | null;
  /** Timestamp in milliseconds when this round was started on the server */
  public roundStartedAt: number | null;

  constructor(
    players: Player[],
    bootAmount: number = 50,
    maxPotLimit: number = 10000,
    deferShowSettlement: boolean = false,
  ) {
    this.pot = 0;
    this.currentStake = bootAmount;
    this.currentPlayerIndex = 0;
    this.deck = [];
    this.activePlayers = players;
    this.bootAmount = bootAmount;
    this.maxPotLimit = maxPotLimit;
    this.dealerIndex = 0;
    this.pendingSideshow = null;
    this.lastSideshow = null;
    this.lastSideshowNotice = null;
    this.pendingShow = null;
    this.deferShowSettlement = deferShowSettlement;
    this.isRoundEnding = false;
    this.lastGameResult = null;
    this.roundStartedAt = null;
  }

  public startGame(firstPlayerIndex: number = 0): void {
    this.lastGameResult = null;
    this.pendingShow = null;
    this.roundStartedAt = Date.now();
    // ตรวจชิปทุกคนก่อนเริ่มจ่าย เพื่อไม่ให้หักเงินไปบางส่วน
    if (this.activePlayers.some((player) => player.chips < this.bootAmount)) {
      throw new GameError('Insufficient chips to start game', 'INSUFFICIENT_CHIPS');
    }

    // ผู้เล่นทุกคนจ่ายเงินเริ่มเกมเข้า Pot
    for (const player of this.activePlayers) {
      player.payBet(this.bootAmount);
      this.pot += this.bootAmount;
      player.status = 'ACTIVE';
    }

    // สร้างไพ่ สับไพ่ และแจกไพ่คนละ 3 ใบ
    const result = dealCards(shuffleDeck(createDeck()), this.activePlayers.length, 3);
    this.deck = result.remainingDeck;

    for (let index = 0; index < this.activePlayers.length; index++) {
      this.activePlayers[index].receiveCards(result.hands[index]);
    }

    // Room chooses the player to the dealer's left. Keep index zero as the
    // default for direct GameState callers.
    this.currentPlayerIndex =
      firstPlayerIndex >= 0 && firstPlayerIndex < this.activePlayers.length
        ? firstPlayerIndex
        : 0;

    // A player who spends their last chip on the Boot has no later wager to
    // make, so this is their first required betting turn and they must fold.
    // For every later action, zero chips are handled only when the turn comes
    // back to that player (not immediately after they pay).
    const firstPlayer = this.activePlayers[this.currentPlayerIndex];
    if (firstPlayer?.chips === 0) {
      firstPlayer.fold();
      this.isRoundEnding = true;
    }
  }

  public nextTurn(): void {
    // ข้ามไปหาผู้เล่นคนถัดไปที่ยังเล่นอยู่
    if (this.activePlayers.length === 0) {
      return;
    }

    for (let count = 0; count < this.activePlayers.length; count++) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.activePlayers.length;

      const nextPlayer = this.activePlayers[this.currentPlayerIndex];
      if (nextPlayer.status !== 'ACTIVE') {
        continue;
      }

      // In Teen Patti a player pays to stay in. Spending the last chip is
      // therefore valid for the action already taken (including a Sideshow),
      // but the player must fold once their next betting turn arrives.
      if (nextPlayer.chips === 0) {
        nextPlayer.fold();
        continue;
      }

      return;
    }

    throw new PlayerStateError(
      this.activePlayers[this.currentPlayerIndex]?.id ?? '',
      this.activePlayers[this.currentPlayerIndex]?.status ?? 'UNKNOWN',
    );
  }

  public processAction(
    playerId: string,
    action: GameActionType,
    amount?: number,
  ): boolean {
    if (this.isRoundEnding) {
      throw new InvalidActionError(action);
    }
    if (this.lastSideshow) {
      throw new InvalidActionError(action);
    }
    if (this.pendingShow) {
      throw new InvalidActionError(action);
    }
    // ผลการเปรียบไพ่จะอยู่ให้ client คู่ดวลแสดงหนึ่ง state แล้วถูกล้างที่ action ถัดไป
    this.lastSideshow = null;
    this.lastSideshowNotice = null;
    // ต้องเป็นเทิร์นของผู้เล่นคนนี้ก่อนจึงจะเล่นได้
    const player = this.activePlayers.find(
      (activePlayer) => activePlayer.id === playerId,
    );

    if (player === undefined) {
      throw new GameError('Player not found', 'PLAYER_NOT_FOUND');
    }

    if (player.status === 'FOLDED') {
      throw new PlayerStateError(player.id, player.status);
    }

    if (player.status !== 'ACTIVE') {
      throw new InvalidActionError(action);
    }

    if (this.pendingSideshow) {
      if (action !== 'ACCEPT_SIDESHOW' && action !== 'REJECT_SIDESHOW') {
        throw new InvalidActionError(action);
      }
      if (playerId !== this.pendingSideshow.targetId) {
        throw new WrongTurnError(playerId);
      }

      if (action === 'ACCEPT_SIDESHOW') {
        this.executeSideshow(
          this.pendingSideshow.challengerId,
          this.pendingSideshow.targetId,
        );
      } else {
        this.lastSideshowNotice = {
          challengerId: this.pendingSideshow.challengerId,
          targetId: this.pendingSideshow.targetId,
          outcome: 'DECLINED',
        };
      }
      this.pendingSideshow = null;

      return this.checkLastManStanding() !== null || this.checkPotLimitReached();
    }

    if (player !== this.activePlayers[this.currentPlayerIndex]) {
      throw new WrongTurnError(playerId);
    }

    // คำนวณจำนวนเงินที่ต้องจ่าย แล้วทำ action ที่ผู้เล่นเลือก
    let payment = 0;

    switch (action) {
      case 'CALL':
        payment = player.isBlind ? this.currentStake : this.currentStake * 2;
        break;
      case 'BET':
      case 'RAISE':
        if (
          amount === undefined ||
          !Number.isInteger(amount) ||
          amount <= 0 ||
          amount > Number.MAX_SAFE_INTEGER
        ) {
          throw new GameError('Invalid amount', 'INVALID_AMOUNT');
        }

        {
          const minimumAmount = player.isBlind
            ? this.currentStake
            : this.currentStake * 2;
          const maximumAmount = player.isBlind
            ? this.currentStake * 2
            : this.currentStake * 4;
          const isBelowMinimum =
            action === 'RAISE' ? amount <= minimumAmount : amount < minimumAmount;

          if (
            isBelowMinimum ||
            amount > maximumAmount ||
            (!player.isBlind && amount % 2 !== 0)
          ) {
            throw new GameError('Invalid amount', 'INVALID_AMOUNT');
          }
        }
        payment = amount;
        break;
      case 'FOLD':
        player.fold();
        return this.checkLastManStanding() !== null || this.checkPotLimitReached();
      case 'SEEN':
        player.seeCards();
        return false;
      case 'SHOW':
        this.requestShow(playerId);
        return (
          !this.deferShowSettlement &&
          (this.checkLastManStanding() !== null || this.checkPotLimitReached())
        );
      case 'SIDESHOW':
        // Pagat: Sideshow ทำได้เมื่อยังเหลืออย่างน้อย 3 คน และทุกคนที่อยู่ใน
        // รอบเป็น Seen; ผู้ท้าจ่ายขั้นต่ำของ Seen แล้วท้าคนที่ลงก่อนหน้าตนเอง
        {
          const activePlayers = this.activePlayers.filter(
            (activePlayer) => activePlayer.status === 'ACTIVE',
          );
          if (
            activePlayers.length <= 2 ||
            activePlayers.some((activePlayer) => activePlayer.isBlind)
          ) {
            throw new InvalidActionError('SIDESHOW');
          }
        }
        payment = this.currentStake * 2;
        break;
      default:
        throw new InvalidActionError(action);
    }

    if (this.pot + payment > Number.MAX_SAFE_INTEGER) {
      throw new GameError('Pot exceeds max safe integer', 'INVALID_AMOUNT');
    }

    player.payBet(payment);
    this.pot += payment;

    if (action === 'BET' || action === 'RAISE') {
      this.currentStake = player.isBlind ? payment : payment / 2;
    }

    // Pagat Sideshow ท้าได้เฉพาะคนที่ลงเดิมพันก่อนหน้าซึ่งยัง ACTIVE อยู่
    if (action === 'SIDESHOW') {
      // หาผู้เล่นคนก่อนหน้าที่ยัง ACTIVE
      let targetPlayer: Player | undefined;
      for (let i = 1; i < this.activePlayers.length; i++) {
        const prevIndex =
          (this.currentPlayerIndex - i + this.activePlayers.length) %
          this.activePlayers.length;
        if (this.activePlayers[prevIndex].status === 'ACTIVE') {
          targetPlayer = this.activePlayers[prevIndex];
          break;
        }
      }

      if (!targetPlayer) {
        throw new InvalidActionError('SIDESHOW');
      }

      this.pendingSideshow = {
        challengerId: player.id,
        targetId: targetPlayer.id,
      };
    }

    // After action, check if only 1 player remains
    return this.checkLastManStanding() !== null || this.checkPotLimitReached();
  }

  public evaluateWinner(): GameResult | null {
    // ใช้เฉพาะผู้เล่นที่ยังไม่หมอบในการหาผู้ชนะ
    const players = this.activePlayers
      .filter((player) => player.status === 'ACTIVE')
      .map((player) => ({ id: player.id, cards: player.privateCards }));

    if (players.length === 0) {
      return null;
    }

    // หา ID ผู้ชนะ แล้วแบ่งเงินใน Pot ให้ผู้ชนะ
    const winnerIds = getWinners(players);
    const rewards = calculateSplitPot(this.pot, winnerIds);

    // Evaluate the winning hand (from the first winner since they have the same hand rank if tie)
    // In our simplified setup, we can just compute hand rank directly or just hardcode 'HIGH_CARD' for now if we don't have evaluateHand.
    // Actually getWinners uses compareHands which evaluates the hand internally but doesn't return the rank directly. Let's just say it's HIGH_CARD for now unless we import evaluateHand.
    // Wait, gameLogic.ts might export evaluateHand. I'll just use a generic 'HIGH_CARD' if evaluateHand is missing, but let's check gameLogic.ts later.
    const winningPlayer = players.find((player) => player.id === winnerIds[0]);
    const winningHand: HandRank = winningPlayer
      ? evaluateHand(winningPlayer.cards).rank
      : 'HIGH_CARD';

    for (const player of this.activePlayers) {
      const reward = rewards[player.id];
      if (reward !== undefined && player.chips + reward > Number.MAX_SAFE_INTEGER) {
        throw new GameError('Chips exceed max safe integer', 'INVALID_AMOUNT');
      }
    }

    for (const player of this.activePlayers) {
      const reward = rewards[player.id];
      if (reward !== undefined) {
        player.addChips(reward);
      }
    }

    // จ่าย Pot แล้ว จึงเริ่มเป็นศูนย์สำหรับรอบถัดไป
    this.pot = 0;

    // Collect exposed cards (all active players show their cards)
    const exposedCards: Record<string, Card[]> = {};
    for (const p of this.activePlayers) {
      if (p.status === 'ACTIVE') {
        exposedCards[p.id] = p.privateCards;
      }
    }

    return {
      winnerIds,
      winningHand,
      payouts: rewards,
      exposedCards,
    };
  }

  public endGame(forceShowdown: boolean = false): GameResult | null {
    // จบรอบซ้ำไม่ได้ เพราะ Pot ถูกจ่ายไปแล้ว
    if (this.pot === 0) {
      return this.lastGameResult;
    }

    const remainingPlayers = this.activePlayers.filter(
      (player) => player.status === 'ACTIVE',
    );

    // ถ้าไม่มีผู้เล่นที่ยังอยู่ในเกม ก็ไม่มีผู้รับ Pot
    if (remainingPlayers.length === 0) {
      return null;
    }

    // ถ้าเหลือคนเดียว ผู้เล่นคนนั้นชนะทันทีโดยไม่ต้องเปิดไพ่
    if (remainingPlayers.length === 1) {
      const winner = remainingPlayers[0];
      const payout = this.pot;
      winner.addChips(payout);
      this.pot = 0;

      const payouts: Record<string, number> = {};
      payouts[winner.id] = payout;

      const exposedCards = this.pendingShow?.cards ?? {};
      this.pendingShow = null;
      this.lastGameResult = {
        winnerIds: [winner.id],
        winningHand: 'HIGH_CARD', // Not shown on fold win
        payouts,
        exposedCards,
      };
      return this.lastGameResult;
    }

    // ถ้ายังเหลือหลายคน (กรณีเรียก Show หรือสุดรอบ) ต้อง evaluateWinner
    if (forceShowdown) {
      this.lastGameResult = this.evaluateWinner();
      return this.lastGameResult;
    }

    return null;
  }

  public executeSideshow(challengerId: string, targetId: string): void {
    const challenger = this.activePlayers.find((player) => player.id === challengerId);
    const target = this.activePlayers.find((player) => player.id === targetId);

    // ต้องมีผู้เล่นทั้งสองคน และทั้งคู่ต้องยังอยู่ในเกม
    if (challenger === undefined || target === undefined) {
      throw new InvalidActionError('SIDESHOW');
    }

    if (challenger.status !== 'ACTIVE') {
      throw new InvalidActionError('SIDESHOW');
    }

    if (target.status !== 'ACTIVE') {
      throw new InvalidActionError('SIDESHOW');
    }

    // เปรียบเทียบไพ่: ค่าบวกแปลว่าผู้ท้าชนะ ค่าลบแปลว่าเป้าหมายชนะ
    const result = compareHands(challenger.privateCards, target.privateCards);
    const loser = result <= 0 ? challenger : target;
    const winner = loser === challenger ? target : challenger;

    this.lastSideshow = {
      challengerId,
      targetId,
      winnerId: winner.id,
      loserId: loser.id,
      cards: {
        [challengerId]: challenger.privateCards,
        [targetId]: target.privateCards,
      },
    };

    // ถ้าเสมอ ผู้ท้าต้องเป็นฝ่ายหมอบ
    loser.fold();

    // ผู้เรียก processAction จะตรวจผู้เล่นที่เหลือและสรุป Pot เพียงครั้งเดียว
  }

  public clearSideshowResult(): void {
    this.lastSideshow = null;
  }

  public requestShow(playerId: string): void {
    const player = this.activePlayers.find(
      (activePlayer) => activePlayer.id === playerId,
    );
    const remainingPlayers = this.activePlayers.filter(
      (activePlayer) => activePlayer.status === 'ACTIVE',
    );

    // Show ทำได้เมื่อเหลือผู้เล่นที่ยังเล่นอยู่แค่ 2 คน (กติกามาตรฐาน Teen Patti)
    if (player === undefined || remainingPlayers.length !== 2) {
      throw new InvalidActionError('SHOW');
    }

    if (player !== this.activePlayers[this.currentPlayerIndex]) {
      throw new WrongTurnError(playerId);
    }

    const opponent = remainingPlayers.find((activePlayer) => activePlayer !== player);
    if (opponent === undefined) {
      throw new InvalidActionError('SHOW');
    }

    // ผู้เล่น Seen ห้ามขอ Show กับผู้เล่น Blind
    if (!player.isBlind && opponent.isBlind) {
      throw new InvalidActionError('SHOW');
    }

    // จ่ายค่า Show (Blind จ่าย 1 เท่า, Seen จ่าย 2 เท่า)
    const showCost = player.isBlind ? this.currentStake : this.currentStake * 2;
    player.payBet(showCost);
    this.pot += showCost;

    // ถ้าแต้มเสมอ ผู้ขอ Show เป็นฝ่ายแพ้
    if (compareHands(player.privateCards, opponent.privateCards) <= 0) {
      player.fold();
    } else {
      opponent.fold();
    }

    this.pendingShow = {
      requesterId: player.id,
      opponentId: opponent.id,
      cards: {
        [player.id]: player.showCards(),
        [opponent.id]: opponent.showCards(),
      },
    };

    if (!this.deferShowSettlement) {
      this.endGame();
    }
  }

  public canForceShow(): boolean {
    // บังคับ Show ได้เมื่อเหลือผู้เล่นที่ยังเล่นอยู่ 2 คน
    const remainingPlayers = this.activePlayers.filter(
      (player) => player.status === 'ACTIVE',
    );

    return remainingPlayers.length === 2;
  }

  public checkLastManStanding(): Player | null {
    // ค้นหาผู้เล่นที่ยังอยู่ในเกม
    const remainingPlayers = this.activePlayers.filter(
      (player) => player.status === 'ACTIVE',
    );

    // ถ้าเหลือผู้เล่นคนเดียว ให้คืนผู้เล่นคนนั้น
    if (remainingPlayers.length === 1) {
      return remainingPlayers[0];
    }

    // ถ้ายังไม่เหลือคนเดียว ให้คืน null
    return null;
  }

  public checkPotLimitReached(): boolean {
    // Pot ถึงหรือเกินจำนวนสูงสุดที่กำหนดแล้วหรือยัง
    return this.pot >= this.maxPotLimit;
  }

  public handleTie(winners: Player[]): void {
    // ถ้าไม่มีผู้ชนะ ก็ยังไม่ต้องจ่าย Pot
    if (winners.length === 0) {
      return;
    }

    // แบ่ง Pot ให้ผู้ชนะที่แต้มเท่ากัน
    const winnerIds = winners.map((winner) => winner.id);
    const rewards = calculateSplitPot(this.pot, winnerIds);

    for (const winner of winners) {
      const reward = rewards[winner.id] ?? 0;
      if (winner.chips + reward > Number.MAX_SAFE_INTEGER) {
        throw new GameError('Chips exceed max safe integer', 'INVALID_AMOUNT');
      }
    }

    for (const winner of winners) {
      winner.addChips(rewards[winner.id] ?? 0);
    }

    // จ่าย Pot แล้ว จึงเคลียร์ไว้สำหรับรอบถัดไป
    this.pot = 0;
  }

  public rotateDealer(): void {
    // ถ้าไม่มีผู้เล่น ก็ไม่ต้องเปลี่ยนตำแหน่ง Dealer
    if (this.activePlayers.length === 0) {
      return;
    }

    // เลื่อนไปยังผู้เล่นคนถัดไป และวนกลับไปคนแรกเมื่อถึงคนสุดท้าย
    this.dealerIndex = (this.dealerIndex + 1) % this.activePlayers.length;
  }

  public rejectSideshow(): void {
    // ปฏิเสธ Sideshow โดยไม่เปลี่ยนสถานะผู้เล่นหรือ Pot
    return;
  }

  public handlePlayerDisconnect(playerId: string): boolean {
    const player = this.activePlayers.find(
      (activePlayer) => activePlayer.id === playerId,
    );

    // ถ้าไม่พบผู้เล่น ก็ไม่มีอะไรให้เปลี่ยน
    if (player === undefined) {
      throw new GameError('Player not found', 'PLAYER_NOT_FOUND');
    }

    if (player.status === 'DISCONNECTED') {
      return false;
    }

    // เปลี่ยนสถานะเพื่อไม่ให้ผู้เล่นที่หลุดเล่นต่อได้
    player.status = 'DISCONNECTED';

    // ถ้าเป็นเทิร์นของผู้เล่นที่หลุด ให้ข้ามไปคนถัดไป
    if (
      this.activePlayers[this.currentPlayerIndex] === player &&
      this.activePlayers.some((activePlayer) => activePlayer.status === 'ACTIVE')
    ) {
      this.nextTurn();
    }

    // ถ้าเหลือผู้เล่นคนเดียว
    return this.checkLastManStanding() !== null;
  }

  public autoFoldTimeout(): void {
    if (this.activePlayers.length === 0) {
      return;
    }

    const currentPlayer = this.activePlayers[this.currentPlayerIndex];

    // Timeout ใช้ได้กับผู้เล่นที่กำลังเล่นอยู่เท่านั้น
    if (currentPlayer.status !== 'ACTIVE') {
      return;
    }

    // ผู้เล่นไม่เลือก action ภายในเวลา จึงถือว่าหมอบ
    currentPlayer.fold();

    // เมื่อยังมีหลายคน ให้คง index เดิมไว้ตามรอบเกม
    this.endGame();
  }
}
