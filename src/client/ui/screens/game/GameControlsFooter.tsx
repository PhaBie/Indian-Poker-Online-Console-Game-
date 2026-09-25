import { Box, Text } from 'ink';
import { GAME_CONTROLS_FOOTER_HEIGHT } from './layoutConstants';

export type GameControlsFooterMode = 'action_menu' | 'bet_input' | 'hidden';

export function getGameControlsFooterMode(
  canChooseAction: boolean,
  isInputDisabled: boolean,
  inputMode: 'menu' | 'input_bet',
): GameControlsFooterMode {
  if (!canChooseAction || isInputDisabled) {
    return 'hidden';
  }
  return inputMode === 'input_bet' ? 'bet_input' : 'action_menu';
}

export function GameControlsFooter({
  mode,
  isMusicMuted,
}: {
  readonly mode: GameControlsFooterMode;
  readonly isMusicMuted: boolean;
}) {
  return (
    <Box
      width="100%"
      height={GAME_CONTROLS_FOOTER_HEIGHT}
      paddingTop={1}
      justifyContent="flex-start"
      alignItems="center"
    >
      {mode === 'action_menu' && (
        <>
          <Text color="gray">↑ ↓ </Text>
          <Text color="white">CHOOSE</Text>
          <Text color="gray"> · </Text>
          <Text color="yellow">ENTER</Text>
          <Text color="white"> CONFIRM</Text>
          <Text color="gray"> · ONLY LEGAL MOVES ARE SHOWN</Text>
        </>
      )}
      {mode === 'bet_input' && (
        <>
          <Text color="gray">TYPE AMOUNT · </Text>
          <Text color="yellow">ENTER</Text>
          <Text color="white"> CONFIRM</Text>
          <Text color="gray"> · ESC BACK</Text>
        </>
      )}
      {mode !== 'hidden' && <Text color="gray"> · </Text>}
      <Text color="yellow">M</Text>
      <Text color="white"> MUSIC {isMusicMuted ? 'OFF' : 'ON'}</Text>
    </Box>
  );
}
