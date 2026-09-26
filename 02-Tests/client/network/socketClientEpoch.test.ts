import { expect, test, describe } from 'bun:test';
import { SocketClient } from '../../../01-Source-code/client/network/socketClient';

describe('10. ระบบเครือข่ายฝั่งผู้เล่น - วงจรการเชื่อมต่อและ Epoch (SocketClient Lifecycle & Epoch)', () => {
  test('[SocketClient.disconnect] 10.4 ตัดการเชื่อมต่อ → รีเซ็ตสถานะการเชื่อมต่อและเพิ่มค่า epoch เพื่อยกเลิกคำสั่งเดิม', () => {
    const client = new SocketClient();
    const fakeTransport = {
      onOpen: null as (() => void) | null,
    };

    client.connect('ws_target_1', fakeTransport);
    fakeTransport.onOpen?.();
    expect(client.isConnected).toBe(true);

    client.disconnect();
    expect(client.isConnected).toBe(false);
  });

  test('[SocketClient.connect] 10.5 คอลแบ็กที่ตกค้างจากการเชื่อมต่อครั้งก่อนหน้าจะไม่เปลี่ยนแปลงสถานะปัจจุบัน', () => {
    const client = new SocketClient();
    const firstTransport = {
      onOpen: null as (() => void) | null,
    };
    const secondTransport = {
      onOpen: null as (() => void) | null,
    };

    client.connect('ws_target_1', firstTransport);
    client.connect('ws_target_2', secondTransport);

    firstTransport.onOpen?.();
    expect(client.isConnected).toBe(false);

    secondTransport.onOpen?.();
    expect(client.isConnected).toBe(true);
  });

  test('[SocketClient.onConnectionChange] 10.6 แจ้งเตือนผ่าน onConnectionChange ทุกครั้งที่สถานะการเชื่อมต่อเปลี่ยนแปลง', () => {
    const client = new SocketClient();
    const connectionStates: boolean[] = [];

    client.onConnectionChange = (connected: boolean) => {
      connectionStates.push(connected);
    };

    const fakeTransport = {
      onOpen: null as (() => void) | null,
    };

    client.connect('ws_target_test', fakeTransport);
    fakeTransport.onOpen?.();
    expect(connectionStates).toEqual([true]);

    client.disconnect();
    expect(connectionStates).toEqual([true, false]);
  });
});
