import { describe, expect, test } from 'bun:test';
import { createElement, useLayoutEffect, useRef } from 'react';
import { renderToString } from 'ink';
import { ClientState } from '../../../src/client/state/ClientState';
import { SocketClient } from '../../../src/client/network/socketClient';
import { useAppNavigation } from '../../../src/client/ui/hooks/useAppNavigation';

type Navigation = ReturnType<typeof useAppNavigation>;

function runNavigationSteps(steps: Array<(navigation: Navigation) => void>) {
  const clientState = new ClientState();
  const socketClient = new SocketClient();
  socketClient.send = () => undefined;

  function useHarness() {
    const step = useRef(0);
    const navigation = useAppNavigation({
      state: clientState.getSnapshot(),
      socketClient,
      onClearState: () => clientState.clearState(),
      onClearError: () => clientState.clearError(),
    });
    useLayoutEffect(() => {
      steps[step.current++]?.(navigation);
    });
    return null;
  }

  renderToString(createElement(useHarness));
}

describe('Changing a name from the room lobby', () => {
  for (const returnTo of ['lobby', 'code'] as const) {
    for (const action of ['save', 'cancel'] as const) {
      test(`${action} returns to ${returnTo} without going to the main menu`, () => {
        let didReachEnd = false;
        runNavigationSteps([
          (navigation) => navigation.handleInitialUsernameSubmit('Alice'),
          (navigation) => {
            expect(navigation.screen).toBe('mainMenu');
            navigation.setScreen('tableLounge');
          },
          (navigation) => navigation.handleChangeName(returnTo),
          (navigation) => {
            expect(navigation.screen).toBe('enterName');
            if (action === 'save') navigation.handleInitialUsernameSubmit('Bobby');
            else navigation.handleBackFromUsername();
          },
          (navigation) => {
            expect(navigation.screen).toBe('tableLounge');
            expect(navigation.playerName).toBe(action === 'save' ? 'Bobby' : 'Alice');
            expect(navigation.resumeRoomCode).toBe(returnTo === 'code');
            didReachEnd = true;
          },
        ]);
        expect(didReachEnd).toBe(true);
      });
    }
  }
});
