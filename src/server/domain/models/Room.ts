import { Player } from './Player';
import type { RoomPhase, PublicPlayerDTO, Card, HandRank } from '../../../shared/types';
import { roomSaveSchema, type GameStateSerializedData } from '../schemas/roomSchema';
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

    // 2. ปรับสถานะจากหลุด (DISCONNECTED) ให้กลับมาเป็น 'WAITING' เพื่อรอเล่นรอบต่อไป
    player.status = 'WAITING';
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
    this.gameState = new GameState(playersList, this.bootAmount, 10000, true);
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
  public endGame(forceShowdown: boolean = false): {
    winnerIds: string[];
    winningHand: HandRank;
    payouts: Record<string, number>;
    exposedCards: Record<string, Card[]>;
  } | null {
    let result = null;
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
   * เริ่มเกมใหม่รอบถัดไปที่โต๊ะเดิม โดยผู้เล่นที่ยังเชื่อมต่อทุกคน
   * ได้รับทุนตั้งต้นใหม่ก่อนหัก Boot
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
    if (connectedPlayers.length < 2) {
      throw new GameError(
        'Need at least 2 connected players for the next game',
        'NOT_ENOUGH_PLAYERS',
      );
    }

    // Every deal started from the waiting room is a new game. Never carry a
    // prior deal's wins or losses into it, regardless of whether a new player
    // joined the room in between.
    for (const player of connectedPlayers) {
      player.chips = GAME_CONSTANTS.DEFAULT_STARTING_CHIPS;
    }

    for (const player of connectedPlayers) {
      player.resetForNewRound();
    }

    // A queued player starts a fresh game: randomise seating and dealer again.
    const playersForNextRound = shufflePlayerList(connectedPlayers);
    const nextDealerIndex = randomDealerIndex(playersForNextRound.length);
    this.gameState = new GameState(playersForNextRound, this.bootAmount, 10000, true);
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
   * 3. รีเซ็ตข้อมูลประจำรอบของผู้เล่นทุกคนในห้อง (เคลียร์ไพ่, ยอดเดิมพัน) แต่ยังคงรักษาจำนวนชิปและสถานะการอยู่ในห้องไว้
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

  /**
   * แปลงข้อมูลของ Room เป็น JSON Object สำหรับการบันทึกสถานะห้อง (Save Game / Persistence)
   *
   * การทำงาน:
   * 1. บันทึกข้อมูลพื้นฐานของห้อง: roomId, phase, hostId, bootAmount
   * 2. แปลง Map players เป็น Array เพื่อบันทึกข้อมูลผู้เล่นครบถ้วน (รวม privateCards เพื่อให้โหลดเกมกลับมาเล่นต่อได้)
   * 3. หากมี gameState (โต๊ะเกมที่กำลังเล่นอยู่) จะบันทึก pot, currentStake, ลำดับการเล่น, กองไพ่ และ activePlayers ทั้งหมด
   *
   * @returns object ข้อมูลสถานะของห้องที่พร้อมนำไปแปลงเป็น JSON string ลงไฟล์
   */
  public toJSON(): object {
    return {
      roomId: this.roomId,
      phase: this.phase,
      hostId: this.hostId,
      bootAmount: this.bootAmount,
      maxPlayers: this.MAX_PLAYERS,
      players: Array.from(this.players.values()).map((player) => ({
        id: player.id,
        name: player.name,
        chips: player.chips,
        bet: player.bet,
        status: player.status,
        privateCards: player.privateCards,
        isBlind: player.isBlind,
      })),
      gameState: this.gameState
        ? {
            pot: this.gameState.pot,
            currentStake: this.gameState.currentStake,
            currentPlayerIndex: this.gameState.currentPlayerIndex,
            deck: this.gameState.deck,
            activePlayers: this.gameState.activePlayers.map((player) => ({
              id: player.id,
              name: player.name,
              chips: player.chips,
              bet: player.bet,
              status: player.status,
              privateCards: player.privateCards,
              isBlind: player.isBlind,
            })),
            bootAmount: this.gameState.bootAmount,
            maxPotLimit: this.gameState.maxPotLimit,
            dealerIndex: this.gameState.dealerIndex,
            roundStartedAt: this.gameState.roundStartedAt,
          }
        : null,
    };
  }

  /**
   * กู้คืนอ็อบเจกต์ Room จากข้อมูล JSON (Load Game / Reconstruct Room)
   *
   * การทำงาน:
   * 1. ตรวจสอบความถูกต้องของโครงสร้าง JSON ผ่าน Zod Schema (roomSaveSchema) อย่างเข้มงวดและปลอดภัย (Runtime Type Safety)
   * 2. สร้างอินสแตนซ์ Room ใหม่ตาม roomId และ bootAmount
   * 3. กำหนดค่า phase และ hostId กลับคืน
   * 4. กู้คืนผู้เล่นทุกคนในห้องผ่าน Player.fromJSON() แล้วเก็บลงใน Map players
   * 5. หากในไฟล์เซฟมี gameState ให้กู้คืนโต๊ะเกม (pot, currentStake, deck, activePlayers) กลับมาใช้งานต่อได้ทันที
   *
   * @param json - ข้อมูลห้องในรูปแบบ JSON หรือ object ที่โหลดมาจากไฟล์
   * @returns อินสแตนซ์ของ Room ที่พร้อมใช้งาน
   */
  public static fromJSON(json: unknown): Room {
    // 1. ตรวจสอบโครงสร้างข้อมูลด้วย Zod Schema (roomSaveSchema) ป้องกัน Type ขัดข้องขณะทำงานจริง
    const parseResult = roomSaveSchema.safeParse(json);
    if (!parseResult.success) {
      const hasRoomIdIssue = parseResult.error.issues.some(
        (issue) => issue.path[0] === 'roomId',
      );
      if (hasRoomIdIssue) {
        throw new GameError('Invalid roomId in room data', 'INVALID_ROOM_DATA');
      }
      throw new GameError('Invalid room data', 'INVALID_ROOM_DATA');
    }

    const validatedRoomData = parseResult.data;

    // 2. สร้างห้องขึ้นมาใหม่โดยใช้รหัสห้องและค่า Boot เดิม
    const restoredRoom = new Room(
      validatedRoomData.roomId,
      validatedRoomData.bootAmount,
      validatedRoomData.maxPlayers,
    );
    restoredRoom.phase = validatedRoomData.phase;
    restoredRoom.hostId = validatedRoomData.hostId;

    // 3. กู้คืนผู้เล่นทุกคนที่อยู่ในห้องกลับคืนมา
    this.restorePlayersFromData(validatedRoomData.players, restoredRoom);

    // 4. หากตอนเซฟมีเกมที่กำลังเล่นค้างอยู่ ให้กู้คืนโต๊ะเกม (GameState) กลับมาเล่นต่อได้ทันที
    this.restoreGameStateFromData(
      validatedRoomData.gameState,
      restoredRoom,
      validatedRoomData.bootAmount,
    );

    return restoredRoom;
  }

  /**
   * กู้คืนข้อมูลผู้เล่นทั้งหมดจาก Array แล้วนำกลับเข้าใส่ Map players ของห้อง
   *
   * การทำงาน:
   * - วนลูปนำข้อมูลผู้เล่นแต่ละคนส่งต่อให้ Player.fromJSON() ทำการกู้คืนเป็นอินสแตนซ์ Player ที่สมบูรณ์
   * - บันทึกลงใน Map players โดยใช้ player.id เป็น Key เพื่อให้ค้นหาได้รวดเร็วระดับ O(1)
   *
   * @param rawPlayers - รายชื่อผู้เล่นที่อ่านได้จากข้อมูลเซฟ
   * @param targetRoom - อินสแตนซ์ห้องที่จะนำผู้เล่นใส่เข้าไป
   */
  private static restorePlayersFromData(rawPlayers: unknown[], targetRoom: Room): void {
    for (const rawPlayerData of rawPlayers) {
      // ใช้ Player.fromJSON เพื่อกู้คืนข้อมูลผู้เล่นแต่ละคนแบบสมบูรณ์พร้อมเมธอด
      const restoredPlayer = Player.fromJSON(rawPlayerData);
      targetRoom.players.set(restoredPlayer.id, restoredPlayer);
    }
  }

  /**
   * กู้คืนสถานะโต๊ะเกม (GameState) เช่น กองไพ่ กองกลาง (Pot) และผู้เล่นที่กำลังเล่นอยู่
   *
   * การทำงาน:
   * 1. ตรวจสอบว่ามีข้อมูล gameState หรือไม่ หากไม่มีให้ข้าม (เป็นห้องที่ยังอยู่ในช่วง Lobby)
   * 2. ดึงรายชื่อผู้เล่นที่กำลังเล่นอยู่ในโต๊ะผ่าน extractActivePlayers()
   * 3. สร้างอินสแตนซ์ GameState ใหม่ พร้อมคืนค่าสถานะเดิมทั้งหมด (pot, currentStake, deck, dealerIndex)
   *
   * @param gameStateData - ข้อมูลสถานะโต๊ะเกมที่อ่านได้จากไฟล์
   * @param targetRoom - ห้องเป้าหมายที่จะนำ GameState ไปผูกไว้
   * @param defaultBootAmount - ค่า Boot เริ่มต้นของห้องสำหรับใช้เป็นค่าสำรอง
   */
  private static restoreGameStateFromData(
    gameStateData: GameStateSerializedData | null | undefined,
    targetRoom: Room,
    defaultBootAmount: number,
  ): void {
    if (!gameStateData) {
      return;
    }

    // ดึงรายชื่อผู้เล่นที่กำลังเล่นอยู่ในโต๊ะเกมกลับมา
    const restoredActivePlayers = this.extractActivePlayers(
      gameStateData.activePlayers,
      targetRoom,
    );

    // สร้างอินสแตนซ์ GameState ใหม่ด้วยรายชื่อผู้เล่นและค่า Boot
    const restoredGameState = new GameState(
      restoredActivePlayers,
      gameStateData.bootAmount ?? defaultBootAmount,
      gameStateData.maxPotLimit,
    );

    // กำหนดค่าสถานะเดิมของโต๊ะเกม: กองกลาง, เงินเดิมพันปัจจุบัน, ลำดับผู้เล่น, กองไพ่ และตำแหน่งคนแจกไพ่
    restoredGameState.pot = gameStateData.pot;
    restoredGameState.currentStake = gameStateData.currentStake ?? defaultBootAmount;
    restoredGameState.currentPlayerIndex = gameStateData.currentPlayerIndex;
    restoredGameState.deck = (gameStateData.deck ?? []) as Card[];
    restoredGameState.dealerIndex = gameStateData.dealerIndex;
    restoredGameState.roundStartedAt = gameStateData.roundStartedAt ?? null;

    targetRoom.gameState = restoredGameState;
  }

  /**
   * ดึงอ็อบเจกต์ Player ของผู้เล่นที่กำลังเล่นอยู่ โดยจับคู่กับผู้เล่นในห้องผ่าน Map แบบ O(1)
   *
   * หลักการทำงานและเหตุผลที่ใช้ Map (Data Structure & Algorithm):
   * 1. รักษา Object Reference: ผู้เล่นบนโต๊ะเกม (activePlayers) ต้องเป็นอินสแตนซ์เดียวกับผู้เล่นในห้อง (targetRoom.players) ใน Memory
   * 2. ความเร็วในการค้นหา: การใช้ targetRoom.players.get(id) มีประสิทธิภาพ Time Complexity ระดับ O(1) (Hash Map Lookup)
   * 3. Fallback: หากไม่พบผู้เล่นเดิมใน Map จึงจะเรียก Player.fromJSON() สร้างขึ้นมาใหม่
   *
   * @param rawActivePlayers - รายชื่อผู้เล่นบนโต๊ะเกมจากไฟล์เซฟ
   * @param targetRoom - ห้องเป้าหมายที่มี Map ของผู้เล่นทั้งหมดอยู่แล้ว
   * @returns รายการอ็อบเจกต์ Player[] ที่พร้อมใช้งาน
   */
  private static extractActivePlayers(
    rawActivePlayers: unknown[] | undefined,
    targetRoom: Room,
  ): Player[] {
    if (!Array.isArray(rawActivePlayers)) {
      return Array.from(targetRoom.players.values());
    }

    return rawActivePlayers.map((rawPlayerItem: unknown) => {
      const candidatePlayerObject =
        rawPlayerItem && typeof rawPlayerItem === 'object'
          ? (rawPlayerItem as Record<string, unknown>)
          : undefined;
      const candidatePlayerId =
        typeof candidatePlayerObject?.id === 'string'
          ? candidatePlayerObject.id
          : undefined;

      // ค้นหาจาก Map ของห้องก่อนด้วย O(1) ถ้ามีอยู่แล้วให้ใช้อินสแตนซ์เดิมเพื่อรักษา Memory Reference
      const existingPlayer = candidatePlayerId
        ? targetRoom.players.get(candidatePlayerId)
        : undefined;

      return existingPlayer ?? Player.fromJSON(rawPlayerItem);
    });
  }
}
