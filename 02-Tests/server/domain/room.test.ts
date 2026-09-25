import { expect, test, describe } from 'bun:test';
import { Room } from '../../../src/server/domain/models/Room';
import { Player } from '../../../src/server/domain/models/Player';
import { GameState } from '../../../src/server/domain/models/GameState';
import {
  RoomFullError,
  NotHostError,
  GameError,
  DuplicatePlayerNameError,
} from '../../../src/server/domain/errors/GameError';
import { expectGameErrorWithCode } from './helpers/expectGameErrorWithCode';
import { GAME_CONSTANTS } from '../../../src/shared/constants';

describe('1. ระบบการจัดการห้องเล่น (Room Management)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test('[Room.join] 1.1 ผู้เล่นคนแรกเข้าห้อง → hostId เป็น ID ของผู้เล่นคนนั้น', () => {
      const room = new Room('room_001');
      const hostPlayer = new Player('id_thanathon', 'Thanathon');

      room.join(hostPlayer);

      expect(room.getPlayerCount()).toBe(1);
      expect(room.hostId).toBe('id_thanathon');
    });

    test('[Room.join] 1.2 ผู้เล่นเข้าร่วม 4 คน → จำนวนผู้เล่นเป็น 4 และ phase เป็น LOBBY', () => {
      const room = new Room('room_002');
      const firstPlayer = new Player('id_first', 'First');
      const secondPlayer = new Player('id_second', 'Second');
      const thirdPlayer = new Player('id_third', 'Third');
      const fourthPlayer = new Player('id_fourth', 'Fourth');

      room.join(firstPlayer);
      room.join(secondPlayer);
      room.join(thirdPlayer);
      room.join(fourthPlayer);

      expect(room.getPlayerCount()).toBe(4);
      expect(room.phase).toBe('LOBBY');
    });

    test('[Room.startGame] 1.3 Host เริ่มเกมเมื่อมีผู้เล่น 2 คน → phase เปลี่ยนเป็น PLAYING', () => {
      const room = new Room('room_003');
      room.join(new Player('id_thanathon', 'Thanathon'));
      room.join(new Player('id_phupa', 'Phupa'));

      room.startGame('id_thanathon');

      expect(room.phase as string).toBe('PLAYING');
    });

    test('[Room.reconnect] 1.4 ผู้เล่น DISCONNECTED ทำการ Reconnect → สถานะเปลี่ยนเป็น WAITING พร้อมข้อมูลชิป เดิมพัน และจำนวนไพ่ 1 ใบ', () => {
      const room = new Room('room_004');
      const player1 = new Player('id_thanathon', 'Thanathon');

      player1.chips = 800;
      player1.bet = 200;
      player1.receiveCards([{ suit: 'SPADES', rank: 14 }]);

      room.join(player1);

      player1.status = 'DISCONNECTED';

      room.reconnect('id_thanathon');

      const activePlayer = room.getPlayer('id_thanathon');
      expect(activePlayer?.status).toBe('WAITING');
      expect(activePlayer?.chips).toBe(800);
      expect(activePlayer?.bet).toBe(200);
      expect(activePlayer?.privateCards.length).toBe(1);
    });

    test('[Room.join] 1.5 ผู้เล่นใหม่เข้าห้องขณะเกม PLAYING → สถานะผู้เล่นเป็น WAITING และห้องยังคง PLAYING', () => {
      const room = new Room('room_005');
      const firstPlayer = new Player('id_first', 'First Player');
      const secondPlayer = new Player('id_second', 'Second Player');
      room.join(firstPlayer);
      room.join(secondPlayer);
      room.startGame('id_first');

      const latePlayer = new Player('id_late', 'Late Player');
      room.join(latePlayer);

      const addedPlayer = room.getPlayer('id_late');
      expect(addedPlayer?.status).toBe('WAITING');
      expect(room.phase as string).toBe('PLAYING');
    });

    test('[Room.getPublicState] 1.6 ดึง Public State → คืนค่าข้อมูลที่ไม่มี property privateCards', () => {
      const room = new Room('room_006');
      const player = new Player('id_thanathon', 'Thanathon');
      player.privateCards = [{ suit: 'SPADES', rank: 14 }];
      room.join(player);

      const publicState = room.getPublicState();
      expect(publicState).toHaveLength(1);
      expect(publicState[0]).not.toHaveProperty('privateCards');
    });

    test('[Room.startGame] 1.7 เริ่มเกมใหม่ด้วย Boot 100 → รีชิปทุกคนเป็นทุนตั้งต้นแล้วหัก Boot และ Pot เป็น 200', () => {
      const room = new Room('room_boot_100', 100);
      const host = new Player('id_host', 'Host');
      const secondPlayer = new Player('id_p2', 'Player2');
      host.chips = 1000;
      secondPlayer.chips = 1000;

      room.join(host);
      room.join(secondPlayer);
      room.startGame('id_host');

      expect(room.gameState).toBeDefined();
      expect(room.gameState?.pot).toBe(200);
      expect(host.chips).toBe(GAME_CONSTANTS.DEFAULT_STARTING_CHIPS - 100);
      expect(secondPlayer.chips).toBe(GAME_CONSTANTS.DEFAULT_STARTING_CHIPS - 100);
    });

    test('[Room.startGame] 1.7.1 เริ่มเกมด้วยผู้เล่นมากกว่า 2 คน → room.players และ getPublicState เรียงตามลำดับที่นั่งที่ถูกสุ่ม', () => {
      const room = new Room('room_shuffle_seating', 50);
      const playerOne = new Player('p1', 'Player1');
      const playerTwo = new Player('p2', 'Player2');
      const playerThree = new Player('p3', 'Player3');
      const playerFour = new Player('p4', 'Player4');

      room.join(playerOne);
      room.join(playerTwo);
      room.join(playerThree);
      room.join(playerFour);
      room.startGame('p1');

      const gameStatePlayerIds = room.gameState!.activePlayers.map((player) => player.id);
      const roomMapPlayerIds = Array.from(room.players.keys());
      const publicStatePlayerIds = room.getPublicState().map((player) => player.id);

      expect(roomMapPlayerIds).toEqual(gameStatePlayerIds);
      expect(publicStatePlayerIds).toEqual(gameStatePlayerIds);
    });

    test('[Room.leave] 1.8 โฮสต์ปัจจุบันออกจากการเล่น → โฮสต์ตกไปเป็นคนถัดไปและผู้เล่นเหลือ 1 คน', () => {
      const room = new Room('room_leave');
      const host = new Player('id_host', 'Host');
      const secondPlayer = new Player('id_p2', 'Player2');
      room.join(host);
      room.join(secondPlayer);

      room.leave('id_host');

      expect(room.getPlayerCount()).toBe(1);
      expect(room.hostId).toBe('id_p2');
    });

    test('[Room.resetToLobby] 1.9 รีเซ็ตห้องที่จบรอบ → phase เป็น LOBBY และคืนชิปเริ่มต้น', () => {
      const room = new Room('room_reset');
      const host = new Player('id_host', 'Host');
      const secondPlayer = new Player('id_p2', 'Player2');

      host.chips = 1500;
      secondPlayer.chips = 500;

      room.join(host);
      room.join(secondPlayer);

      room.phase = 'ENDED';
      room.gameState = new GameState([host, secondPlayer]);

      room.resetToLobby();

      expect(room.phase as string).toBe('LOBBY');
      expect(room.gameState).toBeNull();
      expect(room.getPlayerCount()).toBe(2);
      expect(room.getPlayer('id_host')?.chips).toBe(
        GAME_CONSTANTS.DEFAULT_STARTING_CHIPS,
      );
      expect(room.getPlayer('id_p2')?.chips).toBe(GAME_CONSTANTS.DEFAULT_STARTING_CHIPS);
    });

    test('[Room.resetToLobby] 1.9.1 รีเซ็ตห้องที่ผู้เล่นล้มละลายหรือชิปไม่พอ Boot → เติมชิปผู้เล่นนั้นกลับเป็น DEFAULT_STARTING_CHIPS', () => {
      const room = new Room('room_reset_bankrupt');
      const hostPlayer = new Player('id_host', 'Host');
      const bankruptPlayer = new Player('id_bankrupt', 'BankruptPlayer');

      hostPlayer.chips = 600;
      bankruptPlayer.chips = 0;

      room.join(hostPlayer);
      room.join(bankruptPlayer);

      room.phase = 'ENDED';
      room.gameState = new GameState([hostPlayer, bankruptPlayer]);

      room.resetToLobby();

      expect(room.phase as string).toBe('LOBBY');
      expect(room.getPlayer('id_host')?.chips).toBe(
        GAME_CONSTANTS.DEFAULT_STARTING_CHIPS,
      );
      expect(room.getPlayer('id_bankrupt')?.chips).toBe(
        GAME_CONSTANTS.DEFAULT_STARTING_CHIPS,
      );
    });

    test('[Room.startGame] 1.7.2 เริ่มเกมใหม่จาก Lobby โดยมีผู้เล่นที่ชิปไม่พอ Boot → เติมชิปให้อัตโนมัติและเริ่มเกมสำเร็จ', () => {
      const room = new Room('room_start_bankrupt');
      const hostPlayer = new Player('id_host', 'Host');
      const bankruptPlayer = new Player('id_bankrupt', 'BankruptPlayer');

      hostPlayer.chips = 600;
      bankruptPlayer.chips = 0;

      room.join(hostPlayer);
      room.join(bankruptPlayer);

      room.startGame('id_host');

      expect(room.phase as string).toBe('PLAYING');
      expect(room.gameState).not.toBeNull();
      expect(room.getPlayer('id_bankrupt')?.chips).toBe(
        GAME_CONSTANTS.DEFAULT_STARTING_CHIPS - room.bootAmount,
      );
      expect(room.getPlayer('id_host')?.chips).toBe(
        GAME_CONSTANTS.DEFAULT_STARTING_CHIPS - room.bootAmount,
      );
    });

    test('[Room.startNextRound] 1.9.2 จบรอบแล้วเริ่มเกมใหม่ → รักษาชิปเดิมของผู้เล่นและหัก Boot', () => {
      const room = new Room('room_next_round', 50);
      const host = new Player('id_host', 'Host');
      const secondPlayer = new Player('id_p2', 'Player 2');
      host.chips = 1100;
      secondPlayer.chips = 900;
      room.join(host);
      room.join(secondPlayer);
      host.status = 'ACTIVE';
      secondPlayer.status = 'FOLDED';

      room.phase = 'ENDED';
      room.startNextRound('id_host');

      expect(room.phase as string).toBe('PLAYING');
      expect(room.gameState?.pot).toBe(100);
      expect(room.getPlayer('id_host')?.chips).toBe(1050);
      expect(room.getPlayer('id_p2')?.chips).toBe(850);
      expect(room.gameState?.activePlayers).toHaveLength(2);
    });

    test('[Room.startNextRound] 1.9.3 เริ่มเกมใหม่ดึงผู้เล่น WAITING ที่มีชิปพอเข้าวงและรักษาชิปสะสม', () => {
      const room = new Room('room_next_deal', 50, 3);
      const host = new Player('id_host', 'Host');
      const secondPlayer = new Player('id_p2', 'Player 2');
      const waitingPlayer = new Player('id_waiting', 'Waiting Player');
      room.join(host);
      room.join(secondPlayer);
      room.startGame(host.id);
      room.join(waitingPlayer);
      host.chips = 400;
      secondPlayer.chips = 200;
      host.status = 'ACTIVE';
      secondPlayer.status = 'FOLDED';
      room.phase = 'ENDED';

      room.startNextRound(host.id);

      expect(room.gameState?.activePlayers.map((player) => player.id).sort()).toEqual(
        [host.id, secondPlayer.id, waitingPlayer.id].sort(),
      );
      expect(host.chips).toBe(350);
      expect(secondPlayer.chips).toBe(150);
      expect(waitingPlayer.status as string).toBe('ACTIVE');
      expect(waitingPlayer.chips).toBe(950);
    });

    test('[Room.startNextRound] 1.9.4 ผู้เล่นที่มีชิปไม่ถึงเกณฑ์คงสถานะ WAITING และไม่ถูกดึงเข้าเล่น', () => {
      const room = new Room('room_excludes_bankrupt', 50, 3);
      const host = new Player('id_host', 'Host');
      const survivor = new Player('id_survivor', 'Survivor');
      const bankrupt = new Player('id_bankrupt', 'Bankrupt');
      room.join(host);
      room.join(survivor);
      room.join(bankrupt);
      room.startGame(host.id);
      host.chips = 400;
      survivor.chips = 200;
      bankrupt.chips = 0;
      bankrupt.status = 'FOLDED';
      room.phase = 'ENDED';

      room.startNextRound(host.id);

      expect(room.gameState?.activePlayers.map((player) => player.id).sort()).toEqual(
        [host.id, survivor.id].sort(),
      );
      expect(bankrupt.status as string).toBe('WAITING');
      expect(bankrupt.chips).toBe(0);
      expect(host.chips).toBe(350);
      expect(survivor.chips).toBe(150);
    });

    test('[Room.startNextRound] 1.9.5 รักษา Atomicity เมื่อผู้เล่นที่มีสิทธิ์เล่นเหลือน้อยกว่า 2 คนและโยน NOT_ENOUGH_PLAYERS', () => {
      const room = new Room('room_atomicity_check', 50, 3);
      const host = new Player('id_host', 'Host');
      const brokePlayer = new Player('id_broke', 'Broke Player');
      const disconnectedPlayer = new Player('id_disconnected', 'Disconnected Player');

      room.join(host);
      room.join(brokePlayer);
      room.join(disconnectedPlayer);

      host.chips = 500;
      host.status = 'ACTIVE';
      host.bet = 50;
      host.isBlind = false;
      host.privateCards = [{ suit: 'SPADES', rank: 14 }];

      brokePlayer.chips = 40;
      brokePlayer.status = 'FOLDED';
      brokePlayer.bet = 50;
      brokePlayer.isBlind = false;
      brokePlayer.privateCards = [{ suit: 'HEARTS', rank: 10 }];

      disconnectedPlayer.chips = 500;
      disconnectedPlayer.status = 'DISCONNECTED';
      disconnectedPlayer.bet = 0;
      disconnectedPlayer.isBlind = true;
      disconnectedPlayer.privateCards = [];

      room.phase = 'ENDED';
      const initialGameState = room.gameState;
      const initialPlayerKeys = Array.from(room.players.keys());

      let thrownError: unknown;
      try {
        room.startNextRound(host.id);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(GameError);
      expect((thrownError as GameError).code).toBe('NOT_ENOUGH_PLAYERS');
      expect((thrownError as GameError).message).toBe(
        'Need at least 2 eligible players for the next round',
      );

      expect(room.phase).toBe('ENDED');
      expect(room.gameState).toBe(initialGameState);
      expect(Array.from(room.players.keys())).toEqual(initialPlayerKeys);

      expect(host.chips).toBe(500);
      expect(host.status).toBe('ACTIVE');
      expect(host.bet).toBe(50);
      expect(host.isBlind).toBe(false);
      expect(host.privateCards).toEqual([{ suit: 'SPADES', rank: 14 }]);

      expect(brokePlayer.chips).toBe(40);
      expect(brokePlayer.status).toBe('FOLDED');
      expect(brokePlayer.bet).toBe(50);
      expect(brokePlayer.isBlind).toBe(false);
      expect(brokePlayer.privateCards).toEqual([{ suit: 'HEARTS', rank: 10 }]);

      expect(disconnectedPlayer.chips).toBe(500);
      expect(disconnectedPlayer.status).toBe('DISCONNECTED');
      expect(disconnectedPlayer.bet).toBe(0);
      expect(disconnectedPlayer.isBlind).toBe(true);
      expect(disconnectedPlayer.privateCards).toEqual([]);
    });

    test('[Room.startNextRound] 1.9.6 สุ่มโต๊ะและ dealer ใหม่สำหรับเกมที่ดึงคนรอเข้าวง', () => {
      const room = new Room('room_rotate_dealer', 50, 3);
      const host = new Player('id_host', 'Host');
      const playerTwo = new Player('id_p2', 'Player 2');
      const playerThree = new Player('id_p3', 'Player 3');
      room.join(host);
      room.join(playerTwo);
      room.join(playerThree);
      room.startGame(host.id);

      room.phase = 'ENDED';

      room.startNextRound(host.id);

      const nextGame = room.gameState!;
      expect(nextGame.activePlayers.map((player) => player.id).sort()).toEqual(
        [host.id, playerTwo.id, playerThree.id].sort(),
      );
      expect(nextGame.dealerIndex).toBeGreaterThanOrEqual(0);
      expect(nextGame.dealerIndex).toBeLessThan(nextGame.activePlayers.length);
      expect(nextGame.currentPlayerIndex).toBe(
        (nextGame.dealerIndex + 1) % nextGame.activePlayers.length,
      );
    });

    test('[Room.startNextRound] 1.9.7 ปรับผู้เล่นที่ชิปไม่พอเป็น WAITING และดึงผู้ชมที่มีชิปเข้าเล่นรอบใหม่', () => {
      const room = new Room('room_bankrupt_with_spectator', 50, 3);
      const host = new Player('id_host', 'Host');
      const bankruptPlayer = new Player('id_bankrupt', 'Bankrupt Player');
      const waitingSpectator = new Player('id_waiting', 'Waiting Spectator');

      room.join(host);
      room.join(bankruptPlayer);
      room.join(waitingSpectator);

      host.chips = 900;
      bankruptPlayer.chips = 0;
      bankruptPlayer.bet = 50;
      bankruptPlayer.isBlind = false;
      bankruptPlayer.privateCards = [{ suit: 'SPADES', rank: 14 }];
      host.status = 'ACTIVE';
      bankruptPlayer.status = 'FOLDED';
      room.phase = 'ENDED';

      room.startNextRound(host.id);

      expect(room.phase as string).toBe('PLAYING');
      expect(room.gameState?.activePlayers).toHaveLength(2);
      expect(room.gameState?.activePlayers.map((player) => player.id).sort()).toEqual(
        [host.id, waitingSpectator.id].sort(),
      );
      expect(bankruptPlayer.status as string).toBe('WAITING');
      expect(bankruptPlayer.chips).toBe(0);
      expect(bankruptPlayer.bet).toBe(0);
      expect(bankruptPlayer.isBlind).toBe(true);
      expect(bankruptPlayer.privateCards).toEqual([]);
      expect(host.chips).toBe(850);
      expect(waitingSpectator.chips).toBe(950);
    });

    test('[Room.startNextRound] 1.9.8 มีผู้เล่นชิปพอเพียงคนเดียวและไม่มีผู้รอที่มีชิป → โยน NOT_ENOUGH_PLAYERS', () => {
      const room = new Room('room_bankrupt_without_spectator', 50, 2);
      const host = new Player('id_host', 'Host');
      const bankruptPlayer = new Player('id_bankrupt', 'Bankrupt Player');

      room.join(host);
      room.join(bankruptPlayer);

      host.chips = 1000;
      bankruptPlayer.chips = 0;
      host.status = 'ACTIVE';
      bankruptPlayer.status = 'FOLDED';
      room.phase = 'ENDED';

      expectGameErrorWithCode(() => room.startNextRound(host.id), 'NOT_ENOUGH_PLAYERS');
      expect(room.phase as string).toBe('ENDED');
    });
  });

  describe('กรณีข้อผิดพลาด (Unhappy Paths)', () => {
    test('[Room.join] 1.10 ชื่อซ้ำในห้องเดียวกันแบบไม่สนตัวพิมพ์เล็ก/ใหญ่ → โยน DuplicatePlayerNameError', () => {
      const room = new Room('room_duplicate_name');
      room.join(new Player('id_first', 'Thanathon'));

      expect(() => {
        room.join(new Player('id_second', 'thanathon'));
      }).toThrow(DuplicatePlayerNameError);

      expect(room.getPlayerCount()).toBe(1);
    });

    test('[Room.join] 1.11 เข้าห้องที่ผู้เล่นเต็ม 4 คนแล้ว → โยน RoomFullError', () => {
      const room = new Room('room_full');
      room.join(new Player('id_first', 'First'));
      room.join(new Player('id_second', 'Second'));
      room.join(new Player('id_third', 'Third'));
      room.join(new Player('id_fourth', 'Fourth'));

      expect(() => {
        room.join(new Player('id_fifth', 'Fifth'));
      }).toThrow(RoomFullError);

      expect(room.getPlayerCount()).toBe(4);
    });

    test('[Room.startGame] 1.12 ผู้เล่นที่ไม่ใช่โฮสต์สั่งเริ่มเกม → โยน NotHostError และห้องยังคงเป็น LOBBY', () => {
      const room = new Room('room_not_host');
      room.join(new Player('id_host', 'Host'));
      room.join(new Player('id_player', 'Player'));

      expect(() => {
        room.startGame('id_player');
      }).toThrow(NotHostError);

      expect(room.phase).toBe('LOBBY');
    });

    test('[Room.startGame] 1.13 โฮสต์เริ่มเกมด้วยผู้เล่นคนเดียว → โยน GameError และห้องยังคงเป็น LOBBY', () => {
      const room = new Room('room_alone');
      room.join(new Player('id_host', 'Host'));

      expect(() => {
        room.startGame('id_host');
      }).toThrow(GameError);

      expect(room.phase).toBe('LOBBY');
    });
  });
});
