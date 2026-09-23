import { expect, test, describe } from 'bun:test';
import { Player } from '../../../../src/server/domain/models/Player';
import { PlayerStateError } from '../../../../src/server/domain/errors/GameError';
import type { PlayerStatus } from '../../../../src/shared/types';

describe('3. การหมอบของผู้เล่น (Player.fold)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test('[Player.fold] 3.14 สั่งหมอบในขณะที่อยู่ในเกม (ACTIVE) → เปลี่ยนสถานะเป็น FOLDED โดยไม่คืนเงินเดิมพัน', () => {
      const player = new Player('id1', 'Player 1');
      player.status = 'ACTIVE';
      player.chips = 900;
      player.bet = 100;

      player.fold();

      expect(player.status as PlayerStatus).toBe('FOLDED');
      expect(player.chips).toBe(900);
      expect(player.bet).toBe(100);
    });
  });

  describe('กรณีข้อผิดพลาด (Unhappy Paths)', () => {
    const invalidFoldStates: PlayerStatus[] = ['WAITING', 'FOLDED', 'DISCONNECTED'];
    test.each(invalidFoldStates)(
      '[Player.fold] 3.29 สั่งหมอบในสถานะไม่อนุญาต (%s) → โยน PlayerStateError',
      (state) => {
        const player = new Player('id1', 'Player 1');
        player.status = state;
        player.chips = 1000;
        player.bet = 50;

        expect(() => player.fold()).toThrow(PlayerStateError);
        expect(player.status).toBe(state);
        expect(player.chips).toBe(1000);
        expect(player.bet).toBe(50);
      },
    );
  });
});

const allStates: PlayerStatus[] = ['WAITING', 'ACTIVE', 'FOLDED', 'DISCONNECTED'];
describe('3. การรีเซ็ตสำหรับรอบใหม่ (Player.resetForNewRound)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test.each(allStates)(
      '[Player.resetForNewRound] 3.15 เคลียร์รอบใหม่จากสถานะ %s → ล้างไพ่ ล้างเดิมพัน เปลี่ยนเป็น WAITING และตั้ง isBlind=true',
      (state) => {
        const player = new Player('id1', 'Player 1');
        player.status = state;
        player.chips = 800;
        player.bet = 200;
        player.privateCards = [{ suit: 'SPADES', rank: 14 }];
        player.isBlind = false;

        player.resetForNewRound();

        expect(player.status).toBe('WAITING');
        expect(player.privateCards).toEqual([]);
        expect(player.bet).toBe(0);
        expect(player.isBlind).toBe(true);
        expect(player.chips).toBe(800);
      },
    );

    test('[Player.resetForNewRound] 3.16 เคลียร์รอบใหม่ซ้ำ 2 ครั้ง → ไม่เกิดข้อผิดพลาดและสถานะยังคงเดิม', () => {
      const player = new Player('id1', 'Player 1');
      player.chips = 1000;
      player.bet = 50;

      player.resetForNewRound();
      player.resetForNewRound();

      expect(player.chips).toBe(1000);
      expect(player.bet).toBe(0);
      expect(player.status).toBe('WAITING');
      expect(player.privateCards).toEqual([]);
    });
  });
});
