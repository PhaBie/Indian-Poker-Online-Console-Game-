import { Box, Text } from 'ink';
import type { Card } from '../../../../shared/types';
import type { PlayerSeatNodeProps, GamePlayerItem } from './types';
import { CardView } from './CardView';
import { getPlayerBadgeInfo } from './gameLayoutHelpers';

interface PlayerSeatHeaderProps {
  readonly player: GamePlayerItem;
  readonly isMe: boolean;
}

function PlayerSeatHeader({ player, isMe }: PlayerSeatHeaderProps) {
  const blindLabel = player.isBlind ? ' (Blind)' : '';
  const displayName = isMe ? 'YOU' : player.name;
  return (
    <Text color={isMe ? 'cyanBright' : 'white'}>
      👤 {displayName}
      {blindLabel}
    </Text>
  );
}

interface PlayerCardsRowProps {
  readonly isMe: boolean;
  readonly isBlind: boolean;
  readonly hasFolded: boolean;
  readonly myCards: readonly Card[];
}

function PlayerCardsRow({ isMe, isBlind, hasFolded, myCards }: PlayerCardsRowProps) {
  const shouldHideCards = !isMe || (isBlind && !hasFolded);

  return (
    <Box flexDirection="row" justifyContent="center" marginTop={1}>
      {[0, 1, 2].map((cardIndex) => (
        <CardView
          key={`card-slot-${cardIndex}`}
          card={shouldHideCards ? undefined : myCards[cardIndex]}
          isHidden={shouldHideCards}
        />
      ))}
    </Box>
  );
}

export function PlayerSeatNode({
  player,
  isMe,
  isThisPlayerTurn,
  isPendingSideshowTargetNode,
  myCards,
}: PlayerSeatNodeProps) {
  if (!player) {
    return <Box width={30} height={8} />;
  }

  const hasFolded = player.status === 'FOLDED';
  const badge = getPlayerBadgeInfo(
    hasFolded,
    isThisPlayerTurn,
    isPendingSideshowTargetNode,
  );
  const borderColor =
    isThisPlayerTurn || isPendingSideshowTargetNode ? 'cyanBright' : 'gray';

  return (
    <Box flexDirection="column" alignItems="center" width={30}>
      <PlayerSeatHeader player={player} isMe={isMe} />
      <Box
        borderStyle="round"
        borderColor={borderColor}
        width={28}
        height={9}
        flexDirection="column"
        paddingX={1}
      >
        <Box flexDirection="row" justifyContent="space-between">
          <Text color="yellowBright">Chips: ${player.chips}</Text>
          <Box flexDirection="column" alignItems="flex-end">
            <Text color="redBright">Bet: ${player.bet}</Text>
            {badge.label && <Text color={badge.color}>{badge.label}</Text>}
          </Box>
        </Box>
        <PlayerCardsRow
          isMe={isMe}
          isBlind={player.isBlind}
          hasFolded={hasFolded}
          myCards={myCards}
        />
      </Box>
    </Box>
  );
}
