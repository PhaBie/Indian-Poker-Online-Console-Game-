import { expect, test, describe } from 'bun:test';
import { Player } from '../../../../src/server/domain/models/Player';
import {
  PlayerStateError,
  InsufficientChipsError,
} from '../../../../src/server/domain/errors/GameError';
import type { PlayerStatus } from '../../../../src/shared/types';
import { expectGameErrorWithCode } from './helpers/expectGameErrorWithCode';

describe('Player.payBet', () => {
  describe('Happy Paths', () => {
    test('[Player.payBet] 3.1 จ่ายเงินปกติในสถานะ ACTIVE → ชิปลดลงและยอดเดิมพันสะสมเพิ่มขึ้น', () => {
      const player = new Player('id1', 'Player 1');
      player.chips = 1000;
      player.bet = 0;
      player.status = 'ACTIVE';

      player.payBet(100);

      expect(player.chips).toBe(900);
      expect(player.bet).toBe(100);
    });

    test('[Player.payBet] 3.2 จ่ายเงินขณะสถานะ WAITING (สำหรับจ่าย Boot) → ทำได้ตามปกติ', () => {
      const player = new Player('id1', 'Player 1');
      player.chips = 1000;
      player.bet = 0;
      player.status = 'WAITING';

      player.payBet(50);

      expect(player.chips).toBe(950);
      expect(player.bet).toBe(50);
    });

    test('[Player.payBet] 3.3 จ่ายเดิมพัน 2 ครั้งด้วยยอดเท่าเดิม → ยอดเงินหักสะสมถูกต้อง', () => {
      const player = new Player('id1', 'Player 1');
      player.chips = 1000;
      player.status = 'ACTIVE';

      player.payBet(50);
      player.payBet(50);

      expect(player.chips).toBe(900);
      expect(player.bet).toBe(100);
    });

    test('[Player.payBet] 3.4 จ่ายเท่าชิปที่เหลือพอดี → ชิปเป็น 0 และเดิมพันสะสมถูกต้อง', () => {
      const player = new Player('id1', 'Player 1');
      player.chips = 200;
      player.status = 'ACTIVE';

      player.payBet(200);

      expect(player.chips).toBe(0);
      expect(player.bet).toBe(200);
    });

    test('[Player.payBet] 3.5 จ่ายเงินด้วยยอด MAX_SAFE_INTEGER พอดี → รับได้', () => {
      const player = new Player('id1', 'Player 1');
      player.chips = Number.MAX_SAFE_INTEGER;
      player.bet = 0;
      player.status = 'ACTIVE';

      player.payBet(Number.MAX_SAFE_INTEGER);

      expect(player.chips).toBe(0);
      expect(player.bet).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('Unhappy Paths', () => {
    test('[Player.payBet] 3.20 ชิปไม่พอจ่าย → โยน InsufficientChipsError และเงินต้องไม่เปลี่ยน', () => {
      const player = new Player('id1', 'Player 1');
      player.chips = 100;
      player.bet = 50;
      player.status = 'ACTIVE';

      expect(() => {
        player.payBet(150);
      }).toThrow(InsufficientChipsError);

      expect(player.chips).toBe(100);
      expect(player.bet).toBe(50);
      expect(player.status).toBe('ACTIVE');
    });

    test('[Player.payBet] 3.21 จ่ายเงินสำเร็จครั้งแรก แต่ครั้งที่สองชิปไม่พอ → โยน InsufficientChipsError และรักษายอดหลังจ่ายครั้งแรก', () => {
      const player = new Player('id1', 'Player 1');
      player.chips = 200;
      player.bet = 0;
      player.status = 'ACTIVE';

      player.payBet(100);

      expect(() => {
        player.payBet(200);
      }).toThrow(InsufficientChipsError);

      expect(player.chips).toBe(100);
      expect(player.bet).toBe(100);
    });

    const invalidPayBetStates: PlayerStatus[] = ['FOLDED', 'DISCONNECTED'];
    test.each(invalidPayBetStates)(
      '[Player.payBet] 3.22 จ่ายเงินในสถานะที่ไม่อนุญาต (%s) → โยน PlayerStateError',
      (state) => {
        const player = new Player('id1', 'Player 1');
        player.chips = 1000;
        player.bet = 0;
        player.status = state;

        expect(() => {
          player.payBet(100);
        }).toThrow(PlayerStateError);

        expect(player.chips).toBe(1000);
        expect(player.bet).toBe(0);
        expect(player.status).toBe(state);
      },
    );

    const invalidAmounts = [
      { desc: 'ค่าเป็นศูนย์', amount: 0 },
      { desc: 'ค่าติดลบ', amount: -50 },
      { desc: 'ค่าทศนิยม', amount: 10.5 },
      { desc: 'ค่า NaN', amount: NaN },
      { desc: 'ค่า Infinity', amount: Infinity },
      { desc: 'ชนิดเป็นสตริง', amount: '100' as unknown as number },
      { desc: 'ค่าเกิน MAX_SAFE_INTEGER', amount: Number.MAX_SAFE_INTEGER + 1 },
    ];
    test.each(invalidAmounts)(
      '[Player.payBet] 3.23 จ่ายเงินด้วยข้อมูลผิดรูปแบบ ($desc) → โยน GameError(INVALID_AMOUNT)',
      ({ amount }) => {
        const player = new Player('id1', 'Player 1');
        player.chips = 1000;
        player.bet = 0;
        player.status = 'ACTIVE';

        expectGameErrorWithCode(() => player.payBet(amount), 'INVALID_AMOUNT');
        expect(player.chips).toBe(1000);
        expect(player.bet).toBe(0);
        expect(player.status).toBe('ACTIVE');
      },
    );

    test('[Player.payBet] 3.24 ยอดสะสมเดิมพันเกิน MAX_SAFE_INTEGER → โยน GameError(INVALID_AMOUNT)', () => {
      const player = new Player('id1', 'Player 1');
      player.chips = Number.MAX_SAFE_INTEGER;
      player.bet = Number.MAX_SAFE_INTEGER - 50;
      player.status = 'ACTIVE';

      expectGameErrorWithCode(() => player.payBet(100), 'INVALID_AMOUNT');
      expect(player.chips).toBe(Number.MAX_SAFE_INTEGER);
      expect(player.bet).toBe(Number.MAX_SAFE_INTEGER - 50);
      expect(player.status).toBe('ACTIVE');
    });
  });
});

describe('Player.addChips', () => {
  describe('Happy Paths', () => {
    const validAddChipsStates: PlayerStatus[] = [
      'WAITING',
      'ACTIVE',
      'FOLDED',
      'DISCONNECTED',
    ];
    test.each(validAddChipsStates)(
      '[Player.addChips] 3.6 ระบบจ่ายชิปให้ตอนที่สถานะ %s → ชิปเพิ่มขึ้นปกติโดยสถานะและเงินเดิมพันไม่เปลี่ยน',
      (state) => {
        const player = new Player('id1', 'Player 1');
        player.chips = 1000;
        player.bet = 50;
        player.status = state;

        player.addChips(500);

        expect(player.chips).toBe(1500);
        expect(player.bet).toBe(50);
        expect(player.status).toBe(state);
      },
    );

    test('[Player.addChips] 3.7 ระบบเพิ่มชิปให้ 0 → ข้อมูลชิปไม่เปลี่ยน', () => {
      const player = new Player('id1', 'Player 1');
      player.chips = 1000;
      player.status = 'ACTIVE';

      player.addChips(0);

      expect(player.chips).toBe(1000);
    });

    test('[Player.addChips] 3.8 เติมชิปด้วยยอดรวมเป็น MAX_SAFE_INTEGER พอดี → รับได้', () => {
      const player = new Player('id1', 'Player 1');
      player.chips = Number.MAX_SAFE_INTEGER - 500;
      player.status = 'ACTIVE';

      player.addChips(500);

      expect(player.chips).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('Unhappy Paths', () => {
    const invalidAddAmounts = [
      { desc: 'ค่าติดลบ', amount: -100 },
      { desc: 'ค่าทศนิยม', amount: 50.5 },
      { desc: 'ค่า NaN', amount: NaN },
      { desc: 'ค่า Infinity', amount: Infinity },
      { desc: 'ชนิดเป็นสตริง', amount: '100' as unknown as number },
      { desc: 'ค่าเกิน MAX_SAFE_INTEGER', amount: Number.MAX_SAFE_INTEGER + 1 },
    ];
    test.each(invalidAddAmounts)(
      '[Player.addChips] 3.25 เติมชิปด้วยข้อมูลผิดรูปแบบ ($desc) → โยน GameError(INVALID_AMOUNT)',
      ({ amount }) => {
        const player = new Player('id1', 'Player 1');
        player.chips = 1000;
        player.bet = 50;
        player.status = 'ACTIVE';

        expectGameErrorWithCode(() => player.addChips(amount), 'INVALID_AMOUNT');
        expect(player.chips).toBe(1000);
        expect(player.bet).toBe(50);
        expect(player.status).toBe('ACTIVE');
      },
    );

    test('[Player.addChips] 3.26 ยอดรวมหลังจากเติมเกิน MAX_SAFE_INTEGER → โยน GameError(INVALID_AMOUNT)', () => {
      const player = new Player('id1', 'Player 1');
      player.chips = Number.MAX_SAFE_INTEGER - 100;
      player.bet = 200;
      player.status = 'ACTIVE';

      expectGameErrorWithCode(() => player.addChips(200), 'INVALID_AMOUNT');
      expect(player.chips).toBe(Number.MAX_SAFE_INTEGER - 100);
      expect(player.bet).toBe(200);
      expect(player.status).toBe('ACTIVE');
    });
  });
});
