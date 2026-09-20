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
  const handMode = player.isBlind ? 'BLIND' : 'SEEN';
  const displayName = isMe ? 'YOU' : player.name;
  return (
    <Box flexDirection="column" alignItems="center" width={26}>
      <Text>
        <Text color={isMe ? 'cyanBright' : 'white'} bold={isMe}>
          {displayName}
        </Text>
        <Text color="gray"> </Text>
        <Text color={player.isBlind ? 'yellow' : 'greenBright'}>[{handMode}]</Text>
      </Text>
      <Text color="gray">
        STACK <Text color={isMe ? 'cyanBright' : 'white'}>${player.chips}</Text>
      </Text>
    </Box>
  );
}

interface PlayerCardsRowProps {
  readonly isMe: boolean;
  readonly isBlind: boolean;
  readonly hasFolded: boolean;
  readonly myCards: readonly Card[];
}

interface PlayerCardsPanelProps {
  readonly player: GamePlayerItem;
  readonly isMe: boolean;
  readonly hasFolded: boolean;
  readonly badge: ReturnType<typeof getPlayerBadgeInfo>;
  readonly borderColor: string;
  readonly myCards: readonly Card[];
}

function PlayerCardsPanel({
  player,
  isMe,
  hasFolded,
  badge,
  borderColor,
  myCards,
}: PlayerCardsPanelProps) {
  return (
    <Box
      borderStyle="round"
      borderColor={borderColor}
      width={26}
      height={7}
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <PlayerCardsRow
        isMe={isMe}
        isBlind={player.isBlind}
        hasFolded={hasFolded}
        myCards={myCards}
      />
      <Box justifyContent="space-between" width={22}>
        <Text color="gray">BET ${player.bet}</Text>
        {badge.label ? (
          <Text color={badge.color}>{badge.label}</Text>
        ) : (
          <Text color="gray">ACTIVE</Text>
        )}
      </Box>
    </Box>
  );
}

function MySeatDetails({ player }: Pick<PlayerCardsPanelProps, 'player'>) {
  const handMode = player.isBlind ? 'BLIND' : 'SEEN';

  return (
    <Box flexDirection="column" width={14}>
      <Text color="cyanBright" bold>
        YOU <Text color={player.isBlind ? 'yellow' : 'greenBright'}>[{handMode}]</Text>
      </Text>
      <Text color="gray">
        STACK <Text color="cyanBright">${player.chips}</Text>
      </Text>
    </Box>
  );
}

function PlayerCardsRow({ isMe, isBlind, hasFolded, myCards }: PlayerCardsRowProps) {
  const shouldHideCards = !isMe || (isBlind && !hasFolded);

  return (
    <Box flexDirection="row" justifyContent="center">
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
    return <Box width={26} height={8} />;
  }

  const hasFolded = player.status === 'FOLDED';
  const badge = getPlayerBadgeInfo(
    hasFolded,
    isThisPlayerTurn,
    isPendingSideshowTargetNode,
  );
  const borderColor =
    isThisPlayerTurn || isPendingSideshowTargetNode ? 'cyanBright' : 'gray';

  if (isMe) {
    return (
      <Box flexDirection="row" alignItems="center" width={42}>
        <PlayerCardsPanel
          player={player}
          isMe
          hasFolded={hasFolded}
          badge={badge}
          borderColor={borderColor}
          myCards={myCards}
        />
        <Box marginLeft={2}>
          <MySeatDetails player={player} />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="center" width={26}>
      <PlayerSeatHeader player={player} isMe={isMe} />
      <PlayerCardsPanel
        player={player}
        isMe={isMe}
        hasFolded={hasFolded}
        badge={badge}
        borderColor={borderColor}
        myCards={myCards}
      />
    </Box>
  );
}
