import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import type { Card } from '../../../../shared/types';
import type { PlayerSeatNodeProps, GamePlayerItem } from './types';
import { CardView } from './CardView';
import { getPlayerBadgeInfo } from './gameLayoutHelpers';

interface PlayerSeatHeaderProps {
  readonly player: GamePlayerItem;
  readonly isMe: boolean;
}

interface HandModeIndicatorProps {
  readonly isBlind: boolean;
}

function HandModeIndicator({ isBlind }: HandModeIndicatorProps) {
  const handMode = isBlind ? 'BLIND' : 'SEEN';
  const displayText = `[${handMode}]`;
  const [lightPosition, setLightPosition] = useState<number | null>(0);
  const baseColor = isBlind ? 'yellow' : 'cyan';
  const trailColor = isBlind ? 'yellowBright' : 'blueBright';
  const lightColor = isBlind ? 'white' : 'cyanBright';

  useEffect(() => {
    const timer = setTimeout(
      () => {
        if (lightPosition === null) {
          setLightPosition(0);
          return;
        }
        setLightPosition(
          lightPosition === displayText.length - 1 ? null : lightPosition + 1,
        );
      },
      lightPosition === null ? 8_000 : 130,
    );
    return () => clearTimeout(timer);
  }, [displayText.length, lightPosition]);

  return (
    <Text>
      {Array.from(displayText).map((character, index) => {
        const isLight = index === lightPosition;
        const isTrail =
          lightPosition !== null &&
          index === (lightPosition - 1 + displayText.length) % displayText.length;
        const color = isLight ? lightColor : isTrail ? trailColor : baseColor;
        return (
          <Text key={`${character}-${index}`} color={color} bold={isLight}>
            {character}
          </Text>
        );
      })}
    </Text>
  );
}

function PlayerSeatHeader({ player, isMe }: PlayerSeatHeaderProps) {
  const displayName = isMe ? 'YOU' : player.name;
  return (
    <Box flexDirection="column" alignItems="center" width={26}>
      <Text>
        <Text color={isMe ? 'cyanBright' : 'white'} bold={isMe}>
          {displayName}
        </Text>
        <Text color="gray"> </Text>
        <HandModeIndicator isBlind={player.isBlind} />
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
  return (
    <Box flexDirection="column" width={14}>
      <Text color="cyanBright" bold>
        YOU <HandModeIndicator isBlind={player.isBlind} />
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
