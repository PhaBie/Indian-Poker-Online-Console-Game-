import { expect, test, describe } from 'bun:test';
import { PokerServer } from '../../01-Source-code/server/index';

describe('7. ระบบเซิร์ฟเวอร์หลัก (Server Entry)', () => {
  test('[PokerServer.start] 7.1 เรียกใช้ start และ stop → เปลี่ยนสถานะ isRunning เป็น true และ false ตามลำดับ', () => {
    const server = new PokerServer();

    server.start(0);
    expect(server.isRunning).toBe(true);

    server.stop();
    expect(server.isRunning).toBe(false);
  });
});
