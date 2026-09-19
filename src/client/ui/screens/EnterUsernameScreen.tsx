import { Box } from 'ink';
import { ShimmeringHeader } from '../components/ShimmeringHeader';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { getGameContainerWidth } from './MainMenuScreen';
import {
  getTerminalSizeStatus,
  TerminalOutOfRangeScreen,
} from '../components/ScreenSizeGuard';
import { useUsernameInput } from '../hooks/useUsernameInput';
import { UsernameCard } from './username/UsernameCard';
import { UsernameHelpFooter } from './username/UsernameHelpFooter';

export interface EnterUsernameScreenProps {
  readonly onSubmit: (username: string) => void;
  readonly onBack?: () => void;
  readonly networkMode?: 'LAN' | 'INTERNET';
  readonly intent?: 'create' | 'join' | null;
  readonly isSessionSetup?: boolean;
  readonly initialValue?: string;
  readonly serverError?: string | null;
}

export function EnterUsernameScreen({
  onSubmit,
  onBack,
  networkMode,
  intent,
  isSessionSetup = false,
  initialValue = '',
  serverError,
}: EnterUsernameScreenProps) {
  const { columns, rows } = useTerminalSize();
  const inputState = useUsernameInput({ onSubmit, onBack, initialValue });
  const displayedErrorMessage = inputState.errorMessage ?? serverError ?? null;

  const sizeStatus = getTerminalSizeStatus(columns, rows);
  if (sizeStatus !== 'OPTIMAL') {
    return (
      <TerminalOutOfRangeScreen
        currentColumns={columns}
        currentRows={rows}
        status={sizeStatus}
        onExit={onBack}
      />
    );
  }

  const containerWidth = getGameContainerWidth(columns);
  const paddingX = containerWidth >= 88 ? 5 : 3;

  return (
    <Box
      flexDirection="column"
      width="100%"
      height={rows}
      alignItems="center"
      justifyContent="center"
    >
      <Box width={containerWidth} flexDirection="column">
        <ShimmeringHeader
          containerWidth={containerWidth}
          pageTitle={isSessionSetup ? 'PLAYER SETUP' : 'PLAYER REGISTRATION'}
        />
        <UsernameCard
          paddingX={paddingX}
          rawInput={inputState.rawInput}
          characterCount={inputState.characterCount}
          isLengthValid={inputState.isLengthValid}
          errorMessage={displayedErrorMessage}
          onInputChange={inputState.handleInputChange}
          onInputSubmit={inputState.handleInputSubmit}
          networkMode={networkMode}
          intent={intent}
        />
        <UsernameHelpFooter />
      </Box>
    </Box>
  );
}
