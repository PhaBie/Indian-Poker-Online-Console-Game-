import { Box } from 'ink';
import { UI_COLORS } from '../../shared/theme/colors';
import type { WaitingRoomScreenProps } from './types';
import { WaitingRoomCardHeader } from './WaitingRoomCardHeader';
import { WaitingRoomPlayerList } from './WaitingRoomPlayerList';

interface WaitingRoomCardProps {
  props: WaitingRoomScreenProps;
  paddingX: number;
  errorMessage: string | null;
}

export function WaitingRoomCard({ props, paddingX, errorMessage }: WaitingRoomCardProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={UI_COLORS.goldBorder}
      paddingX={paddingX}
      paddingY={1}
      width="100%"
    >
      <WaitingRoomCardHeader
        roomId={props.roomId}
        playerCount={props.players.length}
        maxPlayers={props.maxPlayers ?? 4}
        isLan={props.networkMode === 'LAN'}
        errorMessage={errorMessage}
      />
      <WaitingRoomPlayerList
        players={props.players}
        hostId={props.hostId}
        myPlayerId={props.myPlayerId}
        maxPlayers={props.maxPlayers ?? 4}
      />
    </Box>
  );
}
