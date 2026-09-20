import { describe, expect, test } from 'bun:test';
import { prepareConnectionUrl } from '../../../src/shared/networkMode';

describe('Network mode boundaries', () => {
  test('LAN accepts local IPv4 and identifies its mode', () => {
    expect(prepareConnectionUrl('192.168.1.20', 'LAN')).toBe(
      'ws://192.168.1.20:8080/?mode=LAN',
    );
    expect(prepareConnectionUrl('ws://127.0.0.1:9000', 'LAN')).toBe(
      'ws://127.0.0.1:9000/?mode=LAN',
    );
  });
  test('LAN rejects public addresses, domains and tunnels', () => {
    for (const address of [
      '8.8.8.8',
      'wss://example.ngrok.app',
      'ws://example.com',
      '172.32.1.1',
    ]) {
      expect(() => prepareConnectionUrl(address, 'LAN')).toThrow();
    }
  });
  test('Online requires a configured secure endpoint', () => {
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
