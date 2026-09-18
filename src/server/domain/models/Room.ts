import { Player } from './Player';
import type { RoomPhase, PublicPlayerDTO } from '../../../shared/types';
import { GameState } from './GameState';
import { RoomFullError, NotHostError, GameError } from '../errors/GameError';

export class Room {
  public roomId: string;
  public phase: RoomPhase;
  public hostId: string | null;
  public players: Map<string, Player>;
  public bootAmount: number;
  public gameState: GameState | null;
  private readonly MAX_PLAYERS = 4;

  constructor(roomId: string, bootAmount: number = 50) {
    this.roomId = roomId;
    this.phase = 'LOBBY';
    this.hostId = null;
    this.players = new Map();
    this.bootAmount = bootAmount;
    this.gameState = null;
  }

  /**
   * นำผู้เล่นเข้าร่วมห้อง
   * - ตรวจสอบว่าห้องเต็มหรือไม่ (จำกัดสูงสุด 4 คน) หากเต็มจะโยน RoomFullError
   * - หากยังไม่มี Host (ผู้เล่นคนแรกที่เข้าห้อง) จะตั้งผู้เล่นคนนี้เป็น hostId
   * - กำหนดสถานะผู้เล่นเป็น 'WAITING'
   * - บันทึกผู้เล่นลงใน players Map
   */
  public join(player: Player): void {
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

    // 3. ดึงรายชื่อผู้เล่นทั้งหมดในห้อง แปลงเป็น Array แล้วสร้าง GameState
    const playersList = Array.from(this.players.values());
    this.gameState = new GameState(playersList, this.bootAmount);

    // 4. สั่งให้ GameState เริ่มเกม (หักค่า Boot คนละเท่าๆ กันเข้า Pot, สับและแจกไพ่)
    this.gameState.startGame();

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
  public endGame(): void {
    // 1. สั่งให้ GameState ทำการจบรอบเกมและสรุปผล (ถ้ามีโต๊ะเกมอยู่)
    if (this.gameState) {
      this.gameState.endGame();
    }

    // 2. ปรับสถานะห้องเป็น ENDED (จบเกมแล้ว)
    this.phase = 'ENDED';
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

    // 3. รีเซ็ตไพ่และยอดเดิมพันของผู้เล่นทุกคน เตรียมพร้อมสำหรับรอบใหม่ (ชิปยังคงอยู่เท่าเดิม)
    for (const player of this.players.values()) {
      player.resetForNewRound();
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
        }
        : null,
    };
  }

  /**
   * กู้คืนอ็อบเจกต์ Room จากข้อมูล JSON (Load Game / Reconstruct Room)
   * 
   * การทำงาน:
   * 1. ตรวจสอบความถูกต้องของข้อมูล JSON เบื้องต้น หากข้อมูลไม่ถูกต้องจะโยน GameError
   * 2. สร้างอินสแตนซ์ Room ใหม่ตาม roomId และ bootAmount
   * 3. กำหนดค่า phase และ hostId กลับคืน
   * 4. กู้คืนผู้เล่นทุกคนในห้องผ่าน Player.fromJSON() แล้วเก็บลงใน Map players
   * 5. หากในไฟล์เซฟมี gameState ให้กู้คืนโต๊ะเกม (pot, currentStake, deck, activePlayers) กลับมาใช้งานต่อได้ทันที
   * 
   * @param json - ข้อมูลห้องในรูปแบบ JSON หรือ object ที่โหลดมาจากไฟล์
   * @returns อินสแตนซ์ของ Room ที่พร้อมใช้งาน
   */
  public static fromJSON(json: unknown): Room {
    if (!json || typeof json !== 'object') {
      throw new GameError('Invalid room data', 'INVALID_ROOM_DATA');
    }

    const data = json as Record<string, any>;
    if (typeof data.roomId !== 'string' || !data.roomId) {
      throw new GameError('Invalid roomId in room data', 'INVALID_ROOM_DATA');
    }

    const bootAmount = typeof data.bootAmount === 'number' ? data.bootAmount : 50;
    const room = new Room(data.roomId, bootAmount);

    room.phase = data.phase ?? 'LOBBY';
    room.hostId = data.hostId ?? null;

    // กู้คืนผู้เล่นทุกคนในห้อง
    if (Array.isArray(data.players)) {
      for (const playerData of data.players) {
        const player = Player.fromJSON(playerData);
        room.players.set(player.id, player);
      }
    }

    // กู้คืนโต๊ะเกม (GameState) หากตอนเซฟเกมกำลังเล่นอยู่
    if (data.gameState && typeof data.gameState === 'object') {
      const gsData = data.gameState;
      const activePlayers = Array.isArray(gsData.activePlayers)
        ? gsData.activePlayers.map((p: any) => {
            const existing = p && typeof p === 'object' && p.id ? room.players.get(p.id) : undefined;
            return existing ?? Player.fromJSON(p);
          })
        : Array.from(room.players.values());

      const gameState = new GameState(
        activePlayers,
        gsData.bootAmount ?? bootAmount,
        gsData.maxPotLimit ?? 10000,
      );

      gameState.pot = typeof gsData.pot === 'number' ? gsData.pot : 0;
      gameState.currentStake = typeof gsData.currentStake === 'number' ? gsData.currentStake : bootAmount;
      gameState.currentPlayerIndex = typeof gsData.currentPlayerIndex === 'number' ? gsData.currentPlayerIndex : 0;
      gameState.deck = Array.isArray(gsData.deck) ? gsData.deck : [];
      gameState.dealerIndex = typeof gsData.dealerIndex === 'number' ? gsData.dealerIndex : 0;

      room.gameState = gameState;
    }

    return room;
  }
}
