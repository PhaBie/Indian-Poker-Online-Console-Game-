import { expect, test, describe } from 'bun:test';
import { SocketClient } from '../../../src/client/network/socketClient';

describe('SocketClient Connection Epoch & Lifecycle', () => {
  test('disconnect resets connection state and increments epoch', () => {
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

  test('stale callbacks from previous connection do not mutate current state', () => {
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

  test('notifies onConnectionChange when connection state changes', () => {
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
