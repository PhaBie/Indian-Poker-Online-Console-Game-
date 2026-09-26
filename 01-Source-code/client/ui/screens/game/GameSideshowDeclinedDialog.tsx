import { Box, Text } from 'ink';
import type { GameStatePayload } from './types';

interface GameSideshowDeclinedDialogProps {
  readonly notice: NonNullable<GameStatePayload['sideshowNotice']>;
  readonly players: GameStatePayload['players'];
}

export function GameSideshowDeclinedDialog({
  notice,
  players,
}: GameSideshowDeclinedDialogProps) {
  const challenger =
    players.find((player) => player.id === notice.challengerId)?.name ?? 'UNKNOWN';
  const target =
    players.find((player) => player.id === notice.targetId)?.name ?? 'UNKNOWN';

  return (
    <Box
      position="absolute"
      top={14}
      left={30}
      width={52}
      height={9}
      borderStyle="double"
      borderColor="yellowBright"
      backgroundColor="black"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Text color="yellowBright" bold>
        SIDESHOW DECLINED
      </Text>
      <Box marginTop={1}>
        <Text color="white" bold>
          {target}
        </Text>
        <Text color="gray"> DECLINED THE DUEL FROM </Text>
        <Text color="white" bold>
          {challenger}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">NO CARDS ARE REVEALED · PLAY RESUMES IN 4 SECONDS</Text>
      </Box>
    </Box>
  );
}
