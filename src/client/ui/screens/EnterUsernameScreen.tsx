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

export interface EnterUsernameScreenProps {
  readonly onSubmit: (username: string) => void;
  readonly onBack?: () => void;
}

export function EnterUsernameScreen({ onSubmit, onBack }: EnterUsernameScreenProps) {
  const { columns, rows } = useTerminalSize();
  const {
    rawInput,
    characterCount,
    isLengthValid,
    errorMessage,
    handleInputChange,
    handleInputSubmit,
  } = useUsernameInput({ onSubmit, onBack });

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
  const isWideMode = containerWidth >= 88;
  const paddingX = isWideMode ? 5 : 3;

  return (
    <Box
      flexDirection="column"
      width="100%"
      height={rows}
      alignItems="center"
      justifyContent="center"
    >
      <Box width={containerWidth} flexDirection="column">
        <ShimmeringHeader containerWidth={containerWidth} />
        <UsernameCard
          paddingX={paddingX}
          rawInput={rawInput}
          characterCount={characterCount}
          isLengthValid={isLengthValid}
          errorMessage={errorMessage}
          onInputChange={handleInputChange}
          onInputSubmit={handleInputSubmit}
        />
      </Box>
    </Box>
  );
}
