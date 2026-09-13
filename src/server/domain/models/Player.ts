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
   * เก็บเป็น State ประจำตัวผู้เล่นฝั่ง Server ไม่เปิดเผยให้คนอื่นเห็น
   */
  public receiveCards(cards: Card[]): void {
    if (this.status === 'FOLDED' || this.status === 'DISCONNECTED') {
      throw new PlayerStateError(this.id, this.status);
    }
    this.privateCards = cards;
  }

  /**
   * วางเงินเดิมพัน
   * หักเงินออกจากผู้เล่น และนำไปบวกสะสมในยอด bet ของรอบนั้น
   * เช็คสถานะก่อน หากผู้เล่นหมอบไปแล้ว จะเดิมพันไม่ได้ เลยโยน PlayerStateError
   * เช็คว่าชิปพอจ่ายไหม กันไม่ให้ติดลบ เลยโยน InsufficientChipsError
   */
  public payBet(amount: number): void {
    if (this.status === 'FOLDED' || this.status === 'DISCONNECTED') {
      throw new PlayerStateError(this.id, this.status);
    }

    if (
      typeof amount !== 'number' ||
      !Number.isInteger(amount) ||
      amount <= 0 ||
      amount > Number.MAX_SAFE_INTEGER
    ) {
      throw new GameError('Invalid amount', 'INVALID_AMOUNT');
    }

    if (this.bet + amount > Number.MAX_SAFE_INTEGER) {
      throw new GameError('Bet exceeds max safe integer', 'INVALID_AMOUNT');
    }

    if (amount > this.chips) {
      throw new InsufficientChipsError(this.name);
    }
    this.chips -= amount;
    this.bet += amount;
  }

  /**
   * หมอบ
   * ปรับสถานะของผู้เล่นเป็น 'FOLDED' ถ้าหมอบ ก็โดนตัดสิทธิ์ในการเล่นรอบนี้
   */
  public fold(): void {
    if (this.status !== 'ACTIVE') {
      throw new PlayerStateError(this.id, this.status);
    }
    this.status = 'FOLDED';
  }

  /**
   * เปิดไพ่ในมือ
   * คืนค่ารายการไพ่ privateCards ทั้งหมดของผู้เล่น ใช้ตอน Showdown หรือจบเกม เพื่อนำไพ่จริงไปเปรียบเทียบแต้ม
   */
  public showCards(): Card[] {
    return this.privateCards;
  }

  /**
   * เพิ่มเงิน
   * บวกยอดเงินเข้าตัวผู้เล่นตามจำนวน amount
   * ถ้าชนะ จะได้เงิน จากกองกลาง (Pot )
   */
  public addChips(amount: number): void {
    if (
      typeof amount !== 'number' ||
      !Number.isInteger(amount) ||
      amount < 0 ||
      amount > Number.MAX_SAFE_INTEGER
    ) {
      throw new GameError('Invalid amount', 'INVALID_AMOUNT');
    }

    if (this.chips + amount > Number.MAX_SAFE_INTEGER) {
      throw new GameError('Chips exceed max safe integer', 'INVALID_AMOUNT');
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
   * เปลี่ยนค่า isBlind เป็น false
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
    // ตรวจข้อมูลจริงที่ได้รับ โดย safeParse คืนผลสำเร็จหรือข้อผิดพลาด
    // แทนการใช้ as ซึ่งไม่ได้ตรวจข้อมูลตอนโปรแกรมทำงาน
    const result = playerSaveSchema.safeParse(json);

    // หากข้อมูลผิด ให้หยุดก่อนสร้าง Player
    // ใช้ GameError ตาม Contract ของ Player ไม่ปล่อย ZodError ออกไป
    if (!result.success) {
      throw new GameError('Invalid player data', 'INVALID_PLAYER_DATA');
    }

    // ใช้ข้อมูลผลลัพธ์ที่ผ่านการตรวจและตัดฟิลด์ส่วนเกินแล้ว
    const data = result.data;

    // สร้าง Player ด้วย ID และชื่อจากข้อมูลที่โหลด
    const player = new Player(data.id, data.name);

    // คืนยอดชิปและเดิมพันตามที่บันทึกไว้
    player.chips = data.chips;
    player.bet = data.bet;

    // รักษาสถานะเดิม ไม่เปลี่ยนเป็น WAITING โดยอัตโนมัติ
    player.status = data.status;

    // คืนไพ่จริงฝั่ง Server รวมถึงไพ่ของผู้เล่น Blind
    // การซ่อนไพ่จาก Client เป็นหน้าที่ของ Network
    player.privateCards = data.privateCards;

    // รักษาสถานะ Blind/Seen ตามที่บันทึกไว้
    player.isBlind = data.isBlind;

    // คืน Instance ของ Player ที่มีข้อมูลและเมธอดพร้อมให้ระบบเรียกใช้
    return player;
  }
}
