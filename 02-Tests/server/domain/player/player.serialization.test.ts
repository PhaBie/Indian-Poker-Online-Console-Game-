import { expect, test, describe } from 'bun:test';
import { Player } from '../../../../src/server/domain/models/Player';
import { expectGameErrorWithCode } from '../helpers/expectGameErrorWithCode';

describe('3. การแปลงข้อมูลผู้เล่นเป็น JSON (Player.toJSON)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test('[Player.toJSON] 3.17 ดึงข้อมูล Public DTO → ต้องได้ฟิลด์ครบถ้วนแต่ไม่มีฟิลด์ privateCards', () => {
      const player = new Player('id_test', 'Test Name');
      player.chips = 1000;
      player.bet = 50;
      player.status = 'ACTIVE';
      player.isBlind = false;
      player.privateCards = [{ suit: 'SPADES', rank: 14 }];

      const json = player.toJSON() as Record<string, unknown>;

      expect(json.id).toBe('id_test');
      expect(json.name).toBe('Test Name');
      expect(json.chips).toBe(1000);
      expect(json.bet).toBe(50);
      expect(json.status).toBe('ACTIVE');
      expect(json.isBlind).toBe(false);
      expect(json.privateCards).toBeUndefined();
    });
  });
});

describe('3. การกู้คืนข้อมูลผู้เล่นจาก JSON (Player.fromJSON)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test('[Player.fromJSON] 3.18 กู้ข้อมูลจาก Object ที่มีไพ่หลายใบ → คืนค่าข้อมูลทั้ง 7 ฟิลด์ครบและไพ่ถูกต้องทุกใบ', () => {
      const validJson: Record<string, unknown> = {
        id: 'id_save',
        name: 'SaveName',
        chips: 5500,
        bet: 500,
        status: 'FOLDED',
        isBlind: false,
        privateCards: [
          { suit: 'HEARTS', rank: 5 },
          { suit: 'DIAMONDS', rank: 6 },
          { suit: 'CLUBS', rank: 7 },
        ],
        extraField: 'shouldBeIgnored',
      };

      const player = Player.fromJSON(validJson);

      expect(player).toBeInstanceOf(Player);
      expect(player.id).toBe('id_save');
      expect(player.name).toBe('SaveName');
      expect(player.chips).toBe(5500);
      expect(player.bet).toBe(500);
      expect(player.status).toBe('FOLDED');
      expect(player.isBlind).toBe(false);
      expect(player.privateCards).toEqual([
        { suit: 'HEARTS', rank: 5 },
        { suit: 'DIAMONDS', rank: 6 },
        { suit: 'CLUBS', rank: 7 },
      ]);
      expect((player as unknown as Record<string, unknown>).extraField).toBeUndefined();
    });

    test('[Player.fromJSON] 3.19 กู้ข้อมูลจาก Object ที่มีไพ่ 1 ใบ → คืนค่าข้อมูลทั้ง 7 ฟิลด์ครบและไพ่ถูกต้อง', () => {
      const validJson: Record<string, unknown> = {
        id: 'id_save',
        name: 'SaveName',
        chips: 1000,
        bet: 0,
        status: 'WAITING',
        isBlind: true,
        privateCards: [{ suit: 'HEARTS', rank: 14 }],
      };

      const player = Player.fromJSON(validJson);

      expect(player).toBeInstanceOf(Player);
      expect(player.id).toBe('id_save');
      expect(player.name).toBe('SaveName');
      expect(player.chips).toBe(1000);
      expect(player.bet).toBe(0);
      expect(player.status).toBe('WAITING');
      expect(player.isBlind).toBe(true);
      expect(player.privateCards).toEqual([{ suit: 'HEARTS', rank: 14 }]);
    });
  });

  describe('กรณีข้อผิดพลาด (Unhappy Paths)', () => {
    const invalidDataTypes = [
      { desc: 'null', data: null },
      { desc: 'undefined', data: undefined },
      { desc: 'Array แทน Object', data: [] },
      { desc: 'String แทน Object', data: 'not_object' },
    ];
    test.each(invalidDataTypes)(
      '[Player.fromJSON] 3.30 รับข้อมูลที่ไม่ใช่ Object ($desc) → โยน GameError(INVALID_PLAYER_DATA)',
      ({ data }) => {
        expectGameErrorWithCode(() => Player.fromJSON(data), 'INVALID_PLAYER_DATA');
      },
    );

    const missingFields = [
      { field: 'id', mod: (data: Record<string, unknown>) => delete data.id },
      {
        field: 'name',
        mod: (data: Record<string, unknown>) => delete data.name,
      },
      {
        field: 'chips',
        mod: (data: Record<string, unknown>) => delete data.chips,
      },
      { field: 'bet', mod: (data: Record<string, unknown>) => delete data.bet },
      {
        field: 'status',
        mod: (data: Record<string, unknown>) => delete data.status,
      },
      {
        field: 'isBlind',
        mod: (data: Record<string, unknown>) => delete data.isBlind,
      },
      {
        field: 'privateCards',
        mod: (data: Record<string, unknown>) => delete data.privateCards,
      },
    ];
    test.each(missingFields)(
      '[Player.fromJSON] 3.31 ข้อมูลขาดฟิลด์สำคัญ (ขาด $field) → โยน GameError(INVALID_PLAYER_DATA)',
      ({ mod }) => {
        const json: Record<string, unknown> = {
          id: '1',
          name: 'N',
          chips: 100,
          bet: 10,
          status: 'WAITING',
          isBlind: true,
          privateCards: [],
        };
        mod(json);
        expectGameErrorWithCode(() => Player.fromJSON(json), 'INVALID_PLAYER_DATA');
      },
    );

    const invalidFieldValues = [
      {
        desc: 'id ว่าง',
        mod: (data: Record<string, unknown>) => (data.id = ''),
      },
      {
        desc: 'id ไม่ใช่สตริง',
        mod: (data: Record<string, unknown>) => (data.id = 1),
      },
      {
        desc: 'name ไม่ใช่สตริง',
        mod: (data: Record<string, unknown>) => (data.name = 1),
      },
      {
        desc: 'isBlind ไม่ใช่ Boolean',
        mod: (data: Record<string, unknown>) => (data.isBlind = 'true'),
      },
      {
        desc: 'chips เป็นสตริง',
        mod: (data: Record<string, unknown>) => (data.chips = '100'),
      },
      {
        desc: 'chips ติดลบ',
        mod: (data: Record<string, unknown>) => (data.chips = -100),
      },
      {
        desc: 'chips เป็นทศนิยม',
        mod: (data: Record<string, unknown>) => (data.chips = 5.5),
      },
      {
        desc: 'chips เป็น NaN',
        mod: (data: Record<string, unknown>) => (data.chips = NaN),
      },
      {
        desc: 'chips เป็น Infinity',
        mod: (data: Record<string, unknown>) => (data.chips = Infinity),
      },
      {
        desc: 'chips เกิน MAX_SAFE_INTEGER',
        mod: (data: Record<string, unknown>) =>
          (data.chips = Number.MAX_SAFE_INTEGER + 1),
      },
      {
        desc: 'bet เป็นสตริง',
        mod: (data: Record<string, unknown>) => (data.bet = '10'),
      },
      {
        desc: 'bet ติดลบ',
        mod: (data: Record<string, unknown>) => (data.bet = -50),
      },
      {
        desc: 'bet เป็นทศนิยม',
        mod: (data: Record<string, unknown>) => (data.bet = 50.5),
      },
      {
        desc: 'bet เป็น NaN',
        mod: (data: Record<string, unknown>) => (data.bet = NaN),
      },
      {
        desc: 'bet เป็น Infinity',
        mod: (data: Record<string, unknown>) => (data.bet = Infinity),
      },
      {
        desc: 'bet เกิน MAX_SAFE_INTEGER',
        mod: (data: Record<string, unknown>) => (data.bet = Number.MAX_SAFE_INTEGER + 1),
      },
      {
        desc: 'status ไม่ถูกต้อง',
        mod: (data: Record<string, unknown>) => (data.status = 'PLAYING'),
      },
      {
        desc: 'privateCards ไม่ใช่ Array',
        mod: (data: Record<string, unknown>) => (data.privateCards = {}),
      },
      {
        desc: 'ไพ่ใน Array เป็น null',
        mod: (data: Record<string, unknown>) => (data.privateCards = [null]),
      },
      {
        desc: 'ไพ่ใน Array ขาด suit',
        mod: (data: Record<string, unknown>) => (data.privateCards = [{ rank: 14 }]),
      },
      {
        desc: 'ไพ่ใน Array ขาด rank',
        mod: (data: Record<string, unknown>) =>
          (data.privateCards = [{ suit: 'HEARTS' }]),
      },
      {
        desc: 'ไพ่ใน Array suit ผิดประเภท',
        mod: (data: Record<string, unknown>) =>
          (data.privateCards = [{ suit: 1, rank: 14 }]),
      },
      {
        desc: 'ไพ่ใน Array rank ผิดประเภท',
        mod: (data: Record<string, unknown>) =>
          (data.privateCards = [{ suit: 'HEARTS', rank: 'A' }]),
      },
      {
        desc: 'ไพ่ใน Array suit ค่าผิด',
        mod: (data: Record<string, unknown>) =>
          (data.privateCards = [{ suit: 'INVALID_SUIT', rank: 14 }]),
      },
      {
        desc: 'ไพ่ใน Array rank เกินขอบเขตล่าง',
        mod: (data: Record<string, unknown>) =>
          (data.privateCards = [{ suit: 'HEARTS', rank: 1 }]),
      },
      {
        desc: 'ไพ่ใน Array rank เกินขอบเขตบน',
        mod: (data: Record<string, unknown>) =>
          (data.privateCards = [{ suit: 'HEARTS', rank: 15 }]),
      },
      {
        desc: 'ไพ่ใน Array rank ทศนิยม',
        mod: (data: Record<string, unknown>) =>
          (data.privateCards = [{ suit: 'HEARTS', rank: 2.5 }]),
      },
      {
        desc: 'ไพ่ใน Array rank เป็น NaN',
        mod: (data: Record<string, unknown>) =>
          (data.privateCards = [{ suit: 'HEARTS', rank: NaN }]),
      },
      {
        desc: 'ไพ่ใน Array rank เป็น Infinity',
        mod: (data: Record<string, unknown>) =>
          (data.privateCards = [{ suit: 'HEARTS', rank: Infinity }]),
      },
    ];
    test.each(invalidFieldValues)(
      '[Player.fromJSON] 3.32 ข้อมูลฟิลด์ผิดประเภทหรือรูปแบบ ($desc) → โยน GameError(INVALID_PLAYER_DATA)',
      ({ mod }) => {
        const json: Record<string, unknown> = {
          id: '1',
          name: 'N',
          chips: 100,
          bet: 10,
          status: 'WAITING',
          isBlind: true,
          privateCards: [],
        };
        mod(json);
        expectGameErrorWithCode(() => Player.fromJSON(json), 'INVALID_PLAYER_DATA');
      },
    );
  });
});
