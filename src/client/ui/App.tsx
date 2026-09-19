import { useState } from 'react';
import { Box, useApp } from 'ink';
import type { ClientState } from '../state/ClientState';
import type { SocketClient } from '../network/socketClient';
import { MainMenuScreen, type MainMenuOption } from './screens/MainMenuScreen';
import { GameIntroSplash } from './components/GameIntroSplash';
import { isAnimationEnabled } from './components/ShimmeringHeader';

export type AppActiveScreen = 'INTRO' | 'MAIN_MENU';

export interface AppProps {
  readonly clientState: ClientState;
  readonly socketClient?: SocketClient;
  readonly serverUrl: string;
  readonly skipIntro?: boolean;
}

export function App({
  clientState: _clientState,
  socketClient: _socketClient,
  serverUrl: _serverUrl,
  skipIntro = false,
}: AppProps) {
  const { exit } = useApp();
  const shouldShowIntro = !skipIntro && isAnimationEnabled();
  const [currentScreen, setCurrentScreen] = useState<AppActiveScreen>(
    shouldShowIntro ? 'INTRO' : 'MAIN_MENU',
  );

  const handleMenuOption = (selectedOption: MainMenuOption) => {
    if (selectedOption === 'EXIT') {
      exit();
    }
  };

  const handleFinishIntro = () => {
    setCurrentScreen('MAIN_MENU');
  };

  return (
    <Box flexDirection="column" width="100%">
      {currentScreen === 'INTRO' && <GameIntroSplash onFinish={handleFinishIntro} />}
      {currentScreen === 'MAIN_MENU' && (
        <MainMenuScreen onSelectOption={handleMenuOption} />
      )}
    </Box>
  );
}
