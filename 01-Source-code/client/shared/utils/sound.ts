import { exec } from 'child_process';

/**
 * Plays a beep sound using PowerShell on Windows.
 * @param frequency Frequency in Hz (e.g. 500)
 * @param duration Duration in milliseconds (e.g. 60)
 */
export function playBeep(frequency = 500, duration = 60) {
  if (process.platform === 'win32') {
    // Fire and forget, ignore errors to not crash the game
    exec(
      `powershell -NoProfile -Command "[Console]::Beep(${frequency}, ${duration})"`,
      () => {
        // ignore
      },
    );
  } else {
    // Fallback for non-Windows
    process.stdout.write('\x07');
  }
}

export const soundEffects = {
  // Navigation / Arrow keys
  move: () => playBeep(500, 60),
  // Selection / Enter
  select: () => playBeep(800, 80),
  // Action (e.g. bet, fold, call)
  action: () => playBeep(1000, 100),
  // Error / Invalid action
  error: () => playBeep(300, 150),
};
