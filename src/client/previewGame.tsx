import React from 'react';
import { render } from 'ink';
import { GamePreview } from './ui/screens/game/GamePreview';
import { startBackgroundMusic } from './audio/backgroundMusic';
import {
  clearTerminalScreen,
  hideTerminalCursor,
} from './ui/shared/hooks/useTerminalSize';
import { parsePreviewPlayerCount } from './ui/screens/game/gamePreviewFixture';

clearTerminalScreen({ shouldRestoreCursor: false });
hideTerminalCursor();

function reportPreviewCrash(error: unknown): void {
  clearTerminalScreen({ shouldRestoreCursor: true });
  // eslint-disable-next-line no-console
  console.error(
    error instanceof Error
      ? (error.stack ?? error.message)
      : 'Preview crashed unexpectedly',
  );
  process.exitCode = 1;
}

process.on('uncaughtException', reportPreviewCrash);
process.on('unhandledRejection', reportPreviewCrash);

const playerCount = parsePreviewPlayerCount(process.argv[2]);
const stopMusic = await startBackgroundMusic();
const previewInstance = render(React.createElement(GamePreview, { playerCount }));

previewInstance
  .waitUntilExit()
  .then(() => {
    stopMusic();
    clearTerminalScreen({ shouldRestoreCursor: true });
  })
  .catch((error: unknown) => {
    stopMusic();
    reportPreviewCrash(error);
  });
