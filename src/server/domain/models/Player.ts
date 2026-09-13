import type { ServerPlayer, PlayerStatus, Card } from '../../../shared/types';
import { GameError, InsufficientChipsError, PlayerStateError } from '../errors/GameError';
import { playerSaveSchema } from './playerSchema';

export abstract class BaseUser {
  public id: string;
  public name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  public abstract getRole(): string;
}

export class Player extends BaseUser implements ServerPlayer {
  public chips: number;
  public bet: number;
  public status: PlayerStatus;
  public privateCards: Card[];
  public isBlind: boolean;

  constructor(id: string, name: string) {
    super(id, name);
    this.chips = 1000;
    this.bet = 0;
    this.status = 'WAITING';
    this.privateCards = [];
    this.isBlind = true;
  }

  public getRole(): string {
    return 'PLAYER';
  }

  /**
   * รับไพ่ที่เซิร์ฟเวอร์แจกให้
   * เอาไพ่ที่แจกมาบันทึกเก็บไว้ใน privateCards
   * อนุญาตเฉพาะสถานะ WAITING และ ACTIVE
   */
  public receiveCards(cards: Card[]): void {
    if (this.status === 'FOLDED' || this.status === 'DISCONNECTED') {
      throw new PlayerStateError(this.id, this.status);
    }
    this.privateCards = cards.map((card) => ({ ...card }));
  }

  /**
   * วางเงินเดิมพัน
   * หักเงินออกจากผู้เล่น และนำไปบวกสะสมในยอด bet ของรอบนั้น
   * ตรวจสอบสถานะ ความถูกต้องของจำนวนเงิน และชิปคงเหลือ
   */
  public payBet(amount: number): void {
    if (this.status === 'FOLDED' || this.status === 'DISCONNECTED') {
      throw new PlayerStateError(this.id, this.status);
    }

    if (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      Number.isNaN(amount) ||
      !Number.isInteger(amount) ||
      amount <= 0 ||
      amount > Number.MAX_SAFE_INTEGER
    ) {
      throw new GameError('Invalid bet amount', 'INVALID_AMOUNT');
    }

    if (this.bet + amount > Number.MAX_SAFE_INTEGER) {
      throw new GameError('Bet exceeds maximum safe integer', 'INVALID_AMOUNT');
    }

    if (amount > this.chips) {
      throw new InsufficientChipsError(this.name);
    }

    this.chips -= amount;
    this.bet += amount;
  }

  /**
   * หมอบ
   * ปรับสถานะของผู้เล่นเป็น 'FOLDED' อนุญาตเฉพาะสถานะ ACTIVE
   */
  public fold(): void {
    if (this.status !== 'ACTIVE') {
      throw new PlayerStateError(this.id, this.status);
    }
    this.status = 'FOLDED';
  }

  /**
   * เปิดไพ่ในมือ
   * คืนค่ารายการไพ่ privateCards ทั้งหมดของผู้เล่น
   */
  public showCards(): Card[] {
    return this.privateCards.map((card) => ({ ...card }));
  }

  /**
   * เพิ่มเงิน
   * บวกยอดเงินเข้าตัวผู้เล่นตามจำนวน amount
   * ตรวจสอบความถูกต้องของจำนวนเงินและเพดาน MAX_SAFE_INTEGER
   */
  public addChips(amount: number): void {
    if (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      Number.isNaN(amount) ||
      !Number.isInteger(amount) ||
      amount < 0 ||
      amount > Number.MAX_SAFE_INTEGER
    ) {
      throw new GameError('Invalid chip amount', 'INVALID_AMOUNT');
    }

    if (this.chips + amount > Number.MAX_SAFE_INTEGER) {
      throw new GameError('Chips exceed maximum safe integer', 'INVALID_AMOUNT');
    }

    this.chips += amount;
  }

  /**
   * เคลียร์ข้อมูลและรีเซ็ตสถานะตอนเริ่มรอบใหม่
   * รีเซ็ตข้อมูลที่ใช้เฉพาะในรอบปัจจุบัน เช่น ไพ่และยอดเดิมพัน พร้อมเปลี่ยนสถานะกลับเป็น WAITING และตั้งเป็น Blind
   * ส่วนชิปจะคงจำนวนเดิมไว้
   */
  public resetForNewRound(): void {
    this.privateCards = [];
    this.bet = 0;
    this.isBlind = true;
    this.status = 'WAITING';
  }

  /**
   * เปิดไพ่ของตัวเอง (เปลี่ยนสถานะจาก Blind เป็น Seen)
   * อนุญาตเฉพาะสถานะ ACTIVE
   */
  public seeCards(): void {
    if (this.status !== 'ACTIVE') {
      throw new PlayerStateError(this.id, this.status);
    }
    this.isBlind = false;
  }

  /**
   * แปลงสถานะผู้เล่นเป็น JSON Object สำหรับส่งผ่าน Network หรือแสดงผล
   * แต่ไม่มี privateCards = Anti-Cheat กันไพ่รั่ว ไป Client อื่น
   */
  public toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      chips: this.chips,
      bet: this.bet,
      status: this.status,
      isBlind: this.isBlind,
    };
  }

  /**
   * กู้คืนออบเจกต์ Player จากข้อมูล JSON
   * สร้างอินสแตนซ์ Player ขึ้นมาใหม่ แล้วนำข้อมูลจาก JSON มาแมปกลับคืนในแต่ละฟิลด์
   * รองรับระบบ Persistence (Save/Load Game) และการ Reconnect ทำให้สามารถนำข้อมูลกลับมาใช้งานต่อได้ทันที
   */
  public static fromJSON(json: unknown): Player {
    const result = playerSaveSchema.safeParse(json);

    if (!result.success) {
      throw new GameError('Invalid player data', 'INVALID_PLAYER_DATA');
    }

    const data = result.data;
    const player = new Player(data.id, data.name);

    player.chips = data.chips;
    player.bet = data.bet;
    player.status = data.status;
    player.privateCards = data.privateCards.map((card) => ({ ...card }));
    player.isBlind = data.isBlind;

    return player;
  }
}
