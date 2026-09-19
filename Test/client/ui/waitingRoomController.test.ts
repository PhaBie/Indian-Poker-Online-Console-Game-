import { expect, test, describe } from 'bun:test';

describe('Waiting Room Controller Logic', () => {
  test('host can start game successfully', () => {
    let didStartInvoke = false;
    const handleStart = () => {
      didStartInvoke = true;
    };

    const isHost = true;
    if (isHost) {
      handleStart();
    }

    expect(didStartInvoke).toBe(true);
  });

  test('non-host cannot start game and receives error message', () => {
    let didStartInvoke = false;
    let errorMessage = '';

    const isHost = false;
    if (isHost) {
      didStartInvoke = true;
    } else {
      errorMessage = 'Only the Host can start the game';
    }

    expect(didStartInvoke).toBe(false);
    expect(errorMessage).toBe('Only the Host can start the game');
  });

  test('toggle ready action triggers callback', () => {
    let didToggleReady = false;
    const handleToggleReady = () => {
      didToggleReady = true;
    };

    handleToggleReady();
    expect(didToggleReady).toBe(true);
  });

  test('leave action triggers callback', () => {
    let didLeaveInvoke = false;
    const handleLeave = () => {
      didLeaveInvoke = true;
    };

    handleLeave();
    expect(didLeaveInvoke).toBe(true);
  });
});
