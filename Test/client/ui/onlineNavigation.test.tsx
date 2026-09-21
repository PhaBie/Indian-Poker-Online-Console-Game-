import { describe, expect, test } from 'bun:test';
import { createElement, useLayoutEffect } from 'react';
import { PassThrough, Writable } from 'stream';
import { render } from 'ink';
import { ClientState } from '../../../src/client/state/ClientState';
import { SocketClient } from '../../../src/client/network/socketClient';
import { useAppNavigation } from '../../../src/client/ui/hooks/useAppNavigation';
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

describe('Online navigation', () => {
  for (const intent of ['create', 'join'] as const) {
    test(`${intent} connects to Online before sending requests and can switch back to LAN`, async () => {
      const socket = new SocketClient();
      const messages: ClientEvent[] = [];
      const addresses: string[] = [];
      socket.connectWithTimeout = async (url) => {
        addresses.push(url);
        socket.isConnected = true;
        return true;
      };
      socket.send = (event) => messages.push(event);
      const harness = mountNavigation(socket);
      try {
        await waitFor(() => Boolean(harness.getNavigation()));
        harness.getNavigation().handleInitialUsernameSubmit('Alice');
        await waitFor(() => harness.getNavigation().playerName === 'Alice');
        if (intent === 'create')
          harness.getNavigation().handleCreateRoomModeSelect('INTERNET');
        else harness.getNavigation().handleJoinSubmit('INTERNET', '');
        await waitFor(() => harness.getNavigation().screen === 'onlineConnection');
        await harness.getNavigation().connectToOnlineServer('https://example.ngrok.app');
        await waitFor(() => harness.getNavigation().screen === 'tableLounge');
        expect(addresses).toEqual(['wss://example.ngrok.app/?mode=INTERNET']);
        expect(messages.map((event) => event.type)).toEqual([
          intent === 'create' ? 'CREATE_ROOM' : 'GET_ROOMS',
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

  test('requires a pasted Online endpoint instead of falling back to LAN', async () => {
    const socket = new SocketClient();
    const messages: ClientEvent[] = [];
    socket.send = (event) => messages.push(event);
    const harness = mountNavigation(socket, '');
    try {
      await waitFor(() => Boolean(harness.getNavigation()));
      harness.getNavigation().handleJoinSubmit('INTERNET', '');
      await waitFor(() => harness.getNavigation().screen === 'onlineConnection');
      await harness.getNavigation().connectToOnlineServer('');
      await waitFor(() => Boolean(harness.getNavigation().onlineError));
      expect(harness.getNavigation().screen).toBe('onlineConnection');
      expect(messages).toEqual([]);
    } finally {
      harness.unmount();
    }
  });
});
