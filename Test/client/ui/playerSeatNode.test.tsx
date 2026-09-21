import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToString } from 'ink';
import { PlayerSeatNode } from '../../../src/client/ui/screens/game/PlayerSeatNode';
import type { GamePlayerItem } from '../../../src/client/ui/screens/game/types';

describe('PlayerSeatNode', () => {
  const dummyOpponent: GamePlayerItem = {
    id: 'opponent-1',
    name: 'ALPHA',
    chips: 9950,
    bet: 50,
    status: 'ACTIVE',
    isBlind: true,
  };

  const dummySelf: GamePlayerItem = {
    id: 'my-id',
    name: 'YOU',
    chips: 9950,
    bet: 50,
    status: 'ACTIVE',
    isBlind: true,
  };

  test('hides opponent stack amount when entrance animation is active', () => {
    const renderedOutput = renderToString(
      createElement(PlayerSeatNode, {
        player: dummyOpponent,
        isMe: false,
        isThisPlayerTurn: false,
        isBankrupt: false,
        isPendingSideshowTargetNode: false,
        isSideshowParticipantNode: false,
        isShowdownRevealed: false,
        myCards: [],
        cardBorderGlowColors: ['gray', 'gray', 'gray'],
        isEntranceActive: true,
      }),
    );

    expect(renderedOutput).not.toContain('STACK');
    expect(renderedOutput).not.toContain('$9950');
    expect(renderedOutput).toContain('BET $0');
  });

  test('reveals opponent stack and bet amounts when entrance animation completes', () => {
    const renderedOutput = renderToString(
      createElement(PlayerSeatNode, {
        player: dummyOpponent,
        isMe: false,
        isThisPlayerTurn: false,
        isBankrupt: false,
        isPendingSideshowTargetNode: false,
        isSideshowParticipantNode: false,
        isShowdownRevealed: false,
        myCards: [],
        cardBorderGlowColors: ['gray', 'gray', 'gray'],
        isEntranceActive: false,
      }),
    );

    expect(renderedOutput).toContain('STACK');
    expect(renderedOutput).toContain('$9950');
    expect(renderedOutput).toContain('BET $50');
  });

  test('hides self stack amount when entrance animation is active', () => {
    const renderedOutput = renderToString(
      createElement(PlayerSeatNode, {
        player: dummySelf,
        isMe: true,
        isThisPlayerTurn: false,
        isBankrupt: false,
        isPendingSideshowTargetNode: false,
        isSideshowParticipantNode: false,
        isShowdownRevealed: false,
        myCards: [],
        cardBorderGlowColors: ['gray', 'gray', 'gray'],
        isEntranceActive: true,
      }),
    );

    expect(renderedOutput).not.toContain('STACK');
    expect(renderedOutput).not.toContain('$9950');
    expect(renderedOutput).toContain('BET $0');
  });

  test('reveals self stack amount when entrance animation completes', () => {
    const renderedOutput = renderToString(
      createElement(PlayerSeatNode, {
        player: dummySelf,
        isMe: true,
        isThisPlayerTurn: false,
        isBankrupt: false,
        isPendingSideshowTargetNode: false,
        isSideshowParticipantNode: false,
        isShowdownRevealed: false,
        myCards: [],
        cardBorderGlowColors: ['gray', 'gray', 'gray'],
        isEntranceActive: false,
      }),
    );

    expect(renderedOutput).toContain('STACK');
    expect(renderedOutput).toContain('$9950');
    expect(renderedOutput).toContain('BET $50');
  });
});
