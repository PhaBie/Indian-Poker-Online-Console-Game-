import type { Player } from './Player';
import type { RoomPhase, PublicPlayerDTO, RoundResult } from '../../../shared/types';
import { GameState } from './GameState';
import {
  RoomFullError,
  NotHostError,
  GameError,
  DuplicatePlayerNameError,
} from '../errors/GameError';
import { GAME_CONSTANTS } from '../../../shared/constants';

function shufflePlayerList(players: readonly Player[]): Player[] {
  const shuffledPlayers = [...players];
  for (let index = shuffledPlayers.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temporary = shuffledPlayers[index];
    shuffledPlayers[index] = shuffledPlayers[swapIndex];
    shuffledPlayers[swapIndex] = temporary;
  }
  return shuffledPlayers;
}

function randomDealerIndex(playerCount: number): number {
  return Math.floor(Math.random() * playerCount);
}

function getFirstPlayerIndex(dealerIndex: number, playerCount: number): number {
  return (dealerIndex + 1) % playerCount;
}

export class Room {
  public roomId: string;
  public phase: RoomPhase;
  public hostId: string | null;
  public players: Map<string, Player>;
  public bootAmount: number;
  public gameState: GameState | null;
  public readonly MAX_PLAYERS: number;

  constructor(roomId: string, bootAmount: number = 50, maxPlayers: number = 4) {
    this.roomId = roomId;
    this.phase = 'LOBBY';
    this.hostId = null;
    this.players = new Map();
    this.bootAmount = bootAmount;
    this.gameState = null;
    this.MAX_PLAYERS = maxPlayers;
  }

  /**
   * นำผู้เล่นเข้าร่วมห้อง
   * - ตรวจสอบว่าห้องเต็มหรือไม่ (จำกัดสูงสุด 4 คน) หากเต็มจะโยน RoomFullError
   * - หากยังไม่มี Host (ผู้เล่นคนแรกที่เข้าห้อง) จะตั้งผู้เล่นคนนี้เป็น hostId
   * - กำหนดสถานะผู้เล่นเป็น 'WAITING'
   * - บันทึกผู้เล่นลงใน players Map
   */
  public join(player: Player): void {
    if (this.phase !== 'LOBBY') {
      throw new GameError('Cannot join while the game is in progress', 'ROOM_NOT_LOBBY');
    }

    // ชื่อซ้ำได้ในคนละห้อง แต่ห้ามซ้ำภายในห้องเดียวกัน โดยไม่สนตัวพิมพ์เล็ก/ใหญ่
    const normalizedPlayerName = player.name.trim().toLocaleLowerCase();
    const hasDuplicateName = Array.from(this.players.values()).some(
      (existingPlayer) =>
        existingPlayer.name.trim().toLocaleLowerCase() === normalizedPlayerName,
    );

    if (hasDuplicateName) {
      throw new DuplicatePlayerNameError(player.name);
    }

    // 1. ตรวจสอบว่าห้องเต็มแล้วหรือไม่ (สูงสุด 4 คนตาม MAX_PLAYERS)
    if (this.players.size >= this.MAX_PLAYERS) {
      throw new RoomFullError(this.roomId);
    }
    // 2. หากห้องยังไม่มี Host (ผู้เล่นคนแรกที่เข้าห้อง) ให้ตั้งผู้เล่นคนนี้เป็น Host ทันที
    if (!this.hostId) {
      this.hostId = player.id;
    }
    // 3. ตั้งสถานะผู้เล่นเป็น WAITING เพื่อรอเริ่มเกม หรือรอจบรอบปัจจุบันหากเข้ามาขณะเกมกำลัง PLAYING
    player.status = 'WAITING';
    // 4. บันทึกผู้เล่นลงใน Map ของห้องโดยใช้ player.id เป็น Key สำหรับการค้นหา
    this.players.set(player.id, player);
  }

  /**
   * รองรับผู้เล่นที่หลุดไป (DISCONNECTED) เชื่อมต่อกลับเข้ามาในห้องใหม่ (Reconnect)
   *
   * การทำงาน:
   * 1. ค้นหาผู้เล่นในห้องจาก playerId
   * 2. หากพบผู้เล่น ให้เปลี่ยนสถานะกลับมาเป็น 'WAITING' (พร้อมเล่นต่อ)
   * 3. รักษายอดชิป (chips), เงินเดิมพัน (bet) และไพ่ (privateCards) ไว้ตามเดิม ไม่รีเซ็ตทิ้ง
   */
  public reconnect(playerId: string): void {
    // 1. ค้นหาผู้เล่นในห้องตาม ID
    const player = this.players.get(playerId);
    if (!player) {
      return;
    }

    // 2. ปรับสถานะกลับด้วยการเรียก player.reconnect()
    player.reconnect();
  }

  /**
   * นำผู้เล่นออกจากห้อง (Leave Room)
   *
   * การทำงาน:
   * 1. ลบผู้เล่นออกจาก Map players
   * 2. หากคนที่ออกเป็น Host ของห้อง:
   *    - ถ้ายังมีผู้เล่นคนอื่นเหลืออยู่ จะส่งต่อสิทธิ์ Host ให้คนถัดไป (คนแรกที่เหลือในคิว Map)
   *    - ถ้าไม่เหลือใครแล้ว จะปรับ hostId เป็น null
   */
  public leave(playerId: string): void {
    // 1. ลบผู้เล่นออกจาก Map รายชื่อคนในห้อง
    this.players.delete(playerId);

    // 2. ถ้าผู้เล่นคนที่เพิ่งออกไป เป็นหัวห้อง (Host)
    if (this.hostId === playerId) {
      // ดึง ID ของผู้เล่นคนแรกที่ยังเหลืออยู่ใน Map มาเป็นหัวห้องคนต่อไป
      const nextPlayerId = this.players.keys().next().value;
      this.hostId = nextPlayerId ?? null;
    }
  }

  /**
   * เริ่มเกม (Start Game)
   *
   * การทำงาน:
   * 1. ตรวจสอบว่าคนที่สั่งเริ่มเกมคือ Host หรือไม่ หากไม่ใช่จะโยน NotHostError
   * 2. ตรวจสอบจำนวนผู้เล่น ต้องมีอย่างน้อย 2 คนขึ้นไป หากไม่พอจะโยน GameError
   * 3. สร้างอ็อบเจกต์ GameState จากผู้เล่นทั้งหมดในห้อง และค่า bootAmount
   * 4. สั่ง gameState.startGame() เพื่อหักเงินค่า Boot เข้า Pot, แจกไพ่ และเริ่มเทิร์นแรก
   * 5. เปลี่ยนสถานะห้อง (phase) เป็น 'PLAYING'
   */
  public startGame(requestingPlayerId: string): void {
    // 1. ตรวจสอบว่าคนที่กดเริ่มเกมเป็นหัวห้อง (Host) หรือไม่
    if (requestingPlayerId !== this.hostId) {
      throw new NotHostError(requestingPlayerId);
    }

    // 2. ตรวจสอบจำนวนผู้เล่น ต้องมีอย่างน้อย 2 คนขึ้นไปถึงจะเริ่มเล่นได้
    if (this.players.size < 2) {
      throw new GameError('Need at least 2 players to start game', 'NOT_ENOUGH_PLAYERS');
    }

    // 3. ดึงรายชื่อผู้เล่นทั้งหมดในห้อง สุ่มตำแหน่งที่นั่ง แล้วสร้าง GameState
    const rawPlayersList = Array.from(this.players.values());
    for (const player of rawPlayersList) {
      player.chips = GAME_CONSTANTS.DEFAULT_STARTING_CHIPS;
    }
    const playersList =
      this.players.size > 2 ? shufflePlayerList(rawPlayersList) : rawPlayersList;
    this.players = new Map(playersList.map((player) => [player.id, player]));
    this.gameState = new GameState(playersList, this.bootAmount, true);
    this.gameState.dealerIndex = randomDealerIndex(playersList.length);

    // 4. สั่งให้ GameState เริ่มเกม (หักค่า Boot คนละเท่าๆ กันเข้า Pot, สับและแจกไพ่)
    this.gameState.startGame(
      getFirstPlayerIndex(this.gameState.dealerIndex, playersList.length),
    );

    // 5. ปรับสถานะของห้องจาก LOBBY เป็น PLAYING
    this.phase = 'PLAYING';
  }

  /**
   * สิ้นสุดเกมในรอบปัจจุบัน (End Game)
   *
   * การทำงาน:
   * 1. สั่งให้ gameState ทำการจบรอบ (เคลียร์เงินกองกลาง Pot จ่ายให้ผู้ชนะ) หากมี gameState กำลังทำงานอยู่
   * 2. เปลี่ยนสถานะของห้อง (phase) จาก PLAYING เป็น 'ENDED' เพื่อรอผลสรุปหรือเตรียมรีเซ็ตกลับ LOBBY
   */
  public endGame(forceShowdown: boolean = false): RoundResult | null {
    let result: RoundResult | null = null;
    // 1. สั่งให้ GameState ทำการจบรอบเกมและสรุปผล (ถ้ามีโต๊ะเกมอยู่)
    if (this.gameState) {
      result = this.gameState.endGame(forceShowdown);
    }

    // 2. ปรับสถานะห้องเป็น ENDED (จบเกมแล้ว) เฉพาะเมื่อมีการจบรอบจริงๆ
    if (result) {
      this.phase = 'ENDED';
    }
    return result;
  }

  /**
   * เริ่มเกมใหม่รอบถัดไปที่โต๊ะเดิม โดยรักษาชิปสะสมของผู้เล่นเดิม
   * และตรวจสอบเกณฑ์ชิปขั้นต่ำ (อย่างน้อย bootAmount * 2)
   */
  public startNextRound(requestingPlayerId: string): void {
    if (requestingPlayerId !== this.hostId) {
      throw new NotHostError(requestingPlayerId);
    }
    if (this.phase !== 'ENDED') {
      throw new GameError('The current deal has not ended', 'GAME_IN_PROGRESS');
    }

    const connectedPlayers = Array.from(this.players.values()).filter(
      (player) => player.status !== 'DISCONNECTED',
    );
    const minRequiredChips = this.bootAmount * 2;
    const eligiblePlayers = connectedPlayers.filter(
      (player) => player.chips >= minRequiredChips,
    );

    if (eligiblePlayers.length < 2) {
      throw new GameError(
        'Need at least 2 eligible players for the next round',
        'NOT_ENOUGH_PLAYERS',
      );
    }

    for (const player of connectedPlayers) {
      player.resetForNewRound();
    }

    const playersForNextRound = shufflePlayerList(eligiblePlayers);
    const nextDealerIndex = randomDealerIndex(playersForNextRound.length);
    this.gameState = new GameState(playersForNextRound, this.bootAmount, true);
    this.gameState.dealerIndex = nextDealerIndex;
    this.gameState.startGame(
      getFirstPlayerIndex(nextDealerIndex, playersForNextRound.length),
    );
    this.phase = 'PLAYING';
  }

  /**
   * รีเซ็ตห้องกลับสู่สถานะล็อบบี้ (Reset to Lobby)
   *
   * การทำงาน:
   * 1. ปรับสถานะห้อง (phase) กลับเป็น 'LOBBY'
   * 2. ล้างอ็อบเจกต์ gameState ให้เป็น null (เคลียร์กระดานเกมเดิมทิ้ง)
   * 3. รีเซ็ตข้อมูลประจำรอบและคืนจำนวนชิปของผู้เล่นทุกคนกลับเป็นค่าเริ่มต้น (1,000 ชิป) เพื่อเตรียมพร้อมสำหรับการเริ่มแมตช์ใหม่
   */
  public resetToLobby(): void {
    // 1. เปลี่ยนสถานะห้องกลับเป็น LOBBY เพื่อรอเริ่มรอบใหม่
    this.phase = 'LOBBY';

    // 2. เคลียร์โต๊ะเกมเดิมทิ้ง
    this.gameState = null;

    // 3. ทุกคนกลับ Waiting Room พร้อมทุนเริ่มต้นเท่ากัน
    for (const player of this.players.values()) {
      player.resetForNewRound();
      player.chips = GAME_CONSTANTS.DEFAULT_STARTING_CHIPS;
    }
  }
  //ดึงข้อมูลผู้เล่นตาม ID จากห้อง
  public getPlayer(playerId: string): Player | undefined {
    // ค้นหาและคืนค่าผู้เล่นจาก Map ด้วย ID
    return this.players.get(playerId);
  }
  //ดึงจำนวนผู้เล่นปัจจุบันทั้งหมดที่อยู่ในห้อง
  public getPlayerCount(): number {
    // นับจำนวนคนในห้องตอนนี้แล้วตอบเป็นตัวเลขกลับไป เช่น 1, 2, 3 หรือ 4 คน
    return this.players.size;
  }

  /**
   * ดึงข้อมูลผู้เล่นทุกคนในห้องในรูปแบบ Public State (DTO)
   *
   * การทำงาน:
   * 1. ดึงผู้เล่นทุกคนในห้องจาก Map players
   * 2. แปลงข้อมูลผู้เล่นแต่ละคนให้อยู่ในรูป PublicPlayerDTO (id, name, chips, bet, status, isBlind)
   * 3. ป้องกันการโกง (Anti-Cheat) โดยกรองข้อมูลละเอียดอ่อนอย่าง privateCards (ไพ่ในมือ) ทิ้ง เพื่อส่งต่อไปแสดงผลที่ Client ได้อย่างปลอดภัย
   *
   * @returns รายการข้อมูลผู้เล่น PublicPlayerDTO[] สำหรับแสดงผล
   */
  public getPublicState(): PublicPlayerDTO[] {
    return Array.from(this.players.values()).map((player) => ({
      id: player.id,
      name: player.name,
      chips: player.chips,
      bet: player.bet,
      status: player.status,
      isBlind: player.isBlind,
    }));
  }
}
