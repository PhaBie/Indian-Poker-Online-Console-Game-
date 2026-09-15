import os from 'os';
import { SocketClient } from './network/socketClient';
import { ClientState } from './state/ClientState';
import type { ServerEvent } from '../shared/types';

/**
 * ดึง IPv4 ของเครื่องในวง LAN อัตโนมัติ
 */
export function getLocalIPv4(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

/**
 * แยกแยะและแปลง Target Connection:
 * - ถ้าเป็น ngrok domain หรือ wss:// -> โหมด INTERNET
 * - ถ้าเป็น IPv4 (เช่น 192.168.1.10 หรือ 192.168.1.10:8080) หรือไม่ใส่ -> โหมด LAN
 */
export function parseConnectionTarget(target?: string): {
  url: string;
  mode: 'LAN' | 'INTERNET';
  hostIp?: string;
  port?: number;
} {
  const input = target?.trim();
  const defaultPort = 8080;

  // 1. กรณีระบุ URL ของ NGROK หรือ WSS / HTTPS
  if (input && (input.includes('ngrok') || input.startsWith('wss://') || input.startsWith('https://'))) {
    let url = input;
    if (url.startsWith('https://')) {
      url = url.replace('https://', 'wss://');
    } else if (!url.startsWith('wss://')) {
      url = `wss://${url}`;
    }
    return { url, mode: 'INTERNET' };
  }

  // 2. กรณีระบุ IPv4 สำหรับเชื่อมต่อใน LAN (เช่น 192.168.1.10 หรือ 192.168.1.10:8080)
  if (input) {
    let host = input.replace('ws://', '').replace('http://', '');
    let port = defaultPort;
    if (host.includes(':')) {
      const parts = host.split(':');
      host = parts[0];
      port = Number(parts[1]) || defaultPort;
    }
    return { url: `ws://${host}:${port}`, mode: 'LAN', hostIp: host, port };
  }

  // 3. กรณีไม่ได้ระบุ (ค่าเริ่มต้นเป็น IP ของเครื่องในวง LAN)
  const localIp = getLocalIPv4();
  return { url: `ws://${localIp}:${defaultPort}`, mode: 'LAN', hostIp: localIp, port: defaultPort };
}

/**
 * Core Client Controller — ใช้เชื่อมต่อ WebSocket และอัปเดต State
 * ฝั่ง UI สามารถ import และเรียกใช้ได้โดยตรง
 */
export function startClient(customTarget?: string): {
  socketClient: SocketClient;
  clientState: ClientState;
  connectionTarget: ReturnType<typeof parseConnectionTarget>;
} {
  const connectionTarget = parseConnectionTarget(customTarget ?? process.argv[2]);

  const socketClient = new SocketClient();
  const clientState = new ClientState();

  // ผูก event เมื่อได้รับข้อมูลจาก Server ให้อัปเดตลง ClientState
  const originalOnReceive = socketClient.onReceive.bind(socketClient);
  socketClient.onReceive = (event: ServerEvent) => {
    originalOnReceive(event);
    clientState.updateState(event);
  };

  // เริ่มต้นเชื่อมต่อ
  socketClient.connect(connectionTarget.url);

  return { socketClient, clientState, connectionTarget };
}

if (process.argv[1]?.includes('client') && !process.argv[1]?.includes('test')) {
  startClient();
}