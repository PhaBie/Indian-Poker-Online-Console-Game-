import { describe, expect, test } from 'bun:test';
import { createElement, useLayoutEffect } from 'react';
import { PassThrough, Writable } from 'stream';
import { render } from 'ink';
import { ClientState } from '../../../src/client/state/ClientState';
import { SocketClient } from '../../../src/client/network/socketClient';
import { useAppNavigation } from '../../../src/client/ui/navigation/useAppNavigation';
import type { ClientEvent } from '../../../src/shared/types';

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 2000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error('Navigation did not settle');
    await Bun.sleep(5);
  }
}

function mountNavigation(
  socketClient: SocketClient,
  onlineServerUrl = 'wss://example.ngrok.app',
) {
  const clientState = new ClientState();
  let navigation: ReturnType<typeof useAppNavigation>;
  function useHarness() {
    const current = useAppNavigation({
      state: clientState.getSnapshot(),
      socketClient,
      onlineServerUrl,
      onClearState: () => clientState.clearState(),
      onClearError: () => clientState.clearError(),
      onSetSessionInfo: () => undefined,
    });
    useLayoutEffect(() => {
      navigation = current;
    });
    return null;
  }
  const output = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const instance = render(createElement(useHarness), {
    stdout: output as NodeJS.WriteStream,
    stderr: output as NodeJS.WriteStream,
    stdin: new PassThrough() as unknown as NodeJS.ReadStream,
    exitOnCtrlC: false,
    patchConsole: false,
  });
  return { getNavigation: () => navigation!, unmount: () => instance.unmount() };
}

describe('16. ระบบนำทางเครือข่ายออนไลน์ (Online Navigation UI)', () => {
  describe('การเชื่อมต่อออนไลน์และการสลับโหมดเครือข่าย (Online Connection & Network Mode Switching)', () => {
    for (const [stepNumber, intentMode, intentThaiLabel, expectedDispatchedEvent] of [
      [1, 'create', 'สร้างห้อง Online', 'CREATE_ROOM'],
      [2, 'join', 'เข้าร่วมห้อง Online', 'GET_ROOMS'],
    ] as const) {
      test(`[onlineNavigation] 16.${stepNumber} ผู้เล่นเลือกเส้นทาง ${intentThaiLabel} → เชื่อมต่อ WSS ส่งอีเวนต์ ${expectedDispatchedEvent} และสลับกลับเป็น LAN ได้`, async () => {
        const socket = new SocketClient();
        const dispatchedClientEvents: ClientEvent[] = [];
        const connectedSocketAddresses: string[] = [];
        socket.connectWithTimeout = async (url) => {
          connectedSocketAddresses.push(url);
          socket.isConnected = true;
          return true;
        };
        socket.send = (event) => dispatchedClientEvents.push(event);
        const harness = mountNavigation(socket);
        try {
          await waitFor(() => Boolean(harness.getNavigation()));
          harness.getNavigation().handleInitialUsernameSubmit('Alice');
          await waitFor(() => harness.getNavigation().playerName === 'Alice');
          if (intentMode === 'create') {
            harness.getNavigation().handleCreateRoomModeSelect('INTERNET');
          } else {
            harness.getNavigation().handleJoinSubmit('INTERNET', '');
          }
          await waitFor(() => harness.getNavigation().screen === 'onlineConnection');
          await harness
            .getNavigation()
            .connectToOnlineServer('https://example.ngrok.app');
          await waitFor(() => harness.getNavigation().screen === 'tableLounge');
          expect(connectedSocketAddresses).toEqual([
            'wss://example.ngrok.app/?mode=INTERNET',
          ]);
          expect(dispatchedClientEvents.map((event) => event.type)).toEqual([
            expectedDispatchedEvent,
          ]);
          expect(harness.getNavigation().networkMode).toBe('INTERNET');
          harness.getNavigation().handleJoinSubmit('LAN', '');
          await waitFor(() => harness.getNavigation().screen === 'serverConnection');
          expect(socket.isConnected).toBe(false);
          expect(harness.getNavigation().currentServerUrl).toBe('ws://127.0.0.1:8080');
        } finally {
          harness.unmount();
        }
      });
    }
  });

  describe('กรณีขาดหายของจุดเชื่อมต่อ (Missing Endpoint Error)', () => {
    test('[onlineNavigation] 16.3 ป้อน URL ของเซิร์ฟเวอร์ Online ว่างเปล่า → แจ้งเตือนข้อผิดพลาดและไม่สลับไป LAN อัตโนมัติ', async () => {
      const socket = new SocketClient();
      const dispatchedClientEvents: ClientEvent[] = [];
      socket.send = (event) => dispatchedClientEvents.push(event);
      const harness = mountNavigation(socket, '');
      try {
        await waitFor(() => Boolean(harness.getNavigation()));
        harness.getNavigation().handleJoinSubmit('INTERNET', '');
        await waitFor(() => harness.getNavigation().screen === 'onlineConnection');
        await harness.getNavigation().connectToOnlineServer('');
        await waitFor(() => Boolean(harness.getNavigation().onlineError));
        expect(harness.getNavigation().screen).toBe('onlineConnection');
        expect(dispatchedClientEvents).toEqual([]);
      } finally {
        harness.unmount();
      }
    });
  });
});
