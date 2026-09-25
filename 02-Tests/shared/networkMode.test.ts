import { describe, expect, test } from 'bun:test';
import { prepareConnectionUrl } from '../../src/shared/networkMode';

describe('18. การตรวจสอบขอบเขตและรูปแบบ Network Mode (Network Mode Boundaries)', () => {
  test('[prepareConnectionUrl] 18.1 โหมด LAN ยอมรับที่อยู่ IPv4 ภายในเครือข่ายและระบุโหมดการเชื่อมต่อถูกต้อง', () => {
    expect(prepareConnectionUrl('192.168.1.20', 'LAN')).toBe(
      'ws://192.168.1.20:8080/?mode=LAN',
    );
    expect(prepareConnectionUrl('ws://127.0.0.1:9000', 'LAN')).toBe(
      'ws://127.0.0.1:9000/?mode=LAN',
    );
  });

  test('[prepareConnectionUrl] 18.2 โหมด LAN ปฏิเสธที่อยู่ Public IP, โดเมนเนม และทันเนลที่ไม่ได้รับอนุญาต', () => {
    for (const targetAddress of [
      '8.8.8.8',
      'wss://example.ngrok.app',
      'ws://example.com',
      '172.32.1.1',
    ]) {
      expect(() => prepareConnectionUrl(targetAddress, 'LAN')).toThrow();
    }
  });

  test('[prepareConnectionUrl] 18.3 โหมด Online กำหนดให้ใช้เฉพาะ URL ปลายทางที่มีความปลอดภัย (Secure Endpoint)', () => {
    expect(prepareConnectionUrl('https://example.ngrok.app', 'INTERNET')).toBe(
      'wss://example.ngrok.app/?mode=INTERNET',
    );
    expect(() => prepareConnectionUrl('', 'INTERNET')).toThrow();
    expect(() => prepareConnectionUrl('ws://127.0.0.1:8080', 'INTERNET')).toThrow();
    expect(() =>
      prepareConnectionUrl('wss://user:secret@example.com', 'INTERNET'),
    ).toThrow();
  });
});
