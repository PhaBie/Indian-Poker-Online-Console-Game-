import { Box, Text } from 'ink';
import type { GameStatePayload } from './types';

interface GameSideshowResultDialogProps {
  readonly result: NonNullable<GameStatePayload['sideshowResult']>;
  readonly players: GameStatePayload['players'];
}

export function GameSideshowResultDialog({
  result,
  players,
}: GameSideshowResultDialogProps) {
  const winner =
    players.find((player) => player.id === result.winnerId)?.name ?? 'UNKNOWN';
  const loser = players.find((player) => player.id === result.loserId)?.name ?? 'UNKNOWN';

  return (
    <Box
      position="absolute"
      top={14}
      left={30}
      width={52}
      height={9}
      borderStyle="double"
      borderColor="magentaBright"
      backgroundColor="black"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Text color="magentaBright" bold>
        SIDESHOW RESULT
      </Text>
      <Box marginTop={1}>
        <Text color="greenBright" bold>
          {winner} WINS
        </Text>
        <Text color="gray"> · </Text>
        <Text color="redBright" bold>
          {loser} FOLDS
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">PLAY CONTINUES WITH THE REMAINING PLAYERS</Text>
      </Box>
    </Box>
  );
}
