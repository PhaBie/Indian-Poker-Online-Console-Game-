import { GameState } from '../../../../../src/server/domain/models/GameState';
import { Player } from '../../../../../src/server/domain/models/Player';
import type { PlayerStatus, Card } from '../../../../../src/shared/types';

/**
 * โครงสร้างข้อมูลสำหรับจำลองสถานะของผู้เล่นแต่ละคนในระหว่างการทดสอบ
 */
export type PlayerFixture = {
  id: string;
  name: string;
  status: PlayerStatus;
  chips: number;
  bet?: number;
  isBlind?: boolean;
  cards?: Card[];
};

/**
 * ฟังก์ชันสร้าง (Fixture) GameState และ Player สำหรับใช้ใน Test Suite
 * ช่วยลดความซ้ำซ้อนของการ Mock ข้อมูลผู้เล่นและการจัดเตรียม State ในแต่ละเคสทดสอบ
 *
 * @param stateOverrides - ข้อมูลของ GameState ที่ต้องการเขียนทับ (เช่น pot, currentStake)
 * @param playerConfigs - รายการข้อมูลตั้งต้นเพื่อนำไปสร้าง Player Instance
 * @returns GameState อินสแตนซ์ที่พร้อมสำหรับการทดสอบ
 */
export function createGameStateFixture(
  stateOverrides: Partial<GameState> = {},
  playerConfigs: PlayerFixture[] = [],
): GameState {
  // สร้าง Player Instance ตาม Config ที่ส่งมาให้ครบทุกคน
  const mockPlayers = playerConfigs.map((config) => {
    const playerInstance = new Player(config.id, config.name);

    // กำหนดสถานะและเงินตั้งต้น
    playerInstance.chips = config.chips;
    playerInstance.status = config.status;

    // ถ้ามีการกำหนดค่าตัวเลือกอื่นๆ ก็ให้เซ็ตค่าตามนั้น
    if (config.bet !== undefined) {
      playerInstance.bet = config.bet;
    }
    if (config.isBlind !== undefined) {
      playerInstance.isBlind = config.isBlind;
    }
    if (config.cards !== undefined) {
      playerInstance.privateCards = config.cards;
    }

    return playerInstance;
  });

  // สร้าง GameState โดยกำหนดค่า Boot = 50 และ MaxPotLimit = 10000 พื้นฐาน
  const gameState = new GameState(mockPlayers, 50, 10000);

  // เขียนทับด้วย State ที่ต้องการทดสอบ (เช่น ยอด pot, turn ปัจจุบัน)
  Object.assign(gameState, stateOverrides);

  return gameState;
}
