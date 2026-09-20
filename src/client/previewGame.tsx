import React from 'react';
import { render } from 'ink';
import { GamePreview } from './ui/GamePreview';
import { clearTerminalScreen, hideTerminalCursor } from './ui/hooks/useTerminalSize';
import { parsePreviewPlayerCount } from './ui/screens/game/gamePreviewFixture';

clearTerminalScreen({ shouldRestoreCursor: false });
hideTerminalCursor();

const playerCount = parsePreviewPlayerCount(process.argv[2]);
const previewInstance = render(React.createElement(GamePreview, { playerCount }));

previewInstance.waitUntilExit().then(() => {
  clearTerminalScreen({ shouldRestoreCursor: true });
});
