import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import type { Card } from '../../../../shared/types';
import type { PlayerSeatNodeProps, GamePlayerItem } from './types';
import { CardView } from './CardView';
import { getPlayerBadgeInfo, shouldHidePlayerCards } from './gameLayoutHelpers';
import { PlayerBadgeIndicator } from './PlayerBadgeIndicator';
import { SweepingPlayerName } from './SweepingPlayerName';

interface PlayerSeatHeaderProps {
  readonly player: GamePlayerItem;
  readonly isMe: boolean;
  readonly isShowdownRevealed: boolean;
  readonly isEntranceActive?: boolean;
  readonly isNameGlowPhase?: boolean;
  readonly nameGlowElapsedMs?: number;
}

interface HandModeIndicatorProps {
  readonly isBlind: boolean;
  readonly isShowdownRevealed: boolean;
}

function HandModeIndicator({ isBlind, isShowdownRevealed }: HandModeIndicatorProps) {
  const handMode = isShowdownRevealed ? 'REVEALED' : isBlind ? 'BLIND' : 'SEEN';
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

function PlayerSeatHeader({
  player,
  isMe,
  isShowdownRevealed,
  isEntranceActive = false,
  isNameGlowPhase = false,
  nameGlowElapsedMs = 0,
}: PlayerSeatHeaderProps) {
  const displayName = isMe ? 'YOU' : player.name;
  const shouldShowBlind = !isEntranceActive;
  const shouldSweepName = !isMe && isNameGlowPhase;

  return (
    <Box flexDirection="column" alignItems="center" width={26}>
      <Text>
        {shouldSweepName ? (
          <SweepingPlayerName name={player.name} elapsedMs={nameGlowElapsedMs} />
        ) : (
          <Text color={isMe ? 'cyanBright' : 'white'} bold>
            {displayName}
          </Text>
        )}
        <Text color="gray"> </Text>
        {shouldShowBlind && (
          <HandModeIndicator
            isBlind={player.isBlind}
            isShowdownRevealed={isShowdownRevealed}
          />
        )}
      </Text>
      {isEntranceActive ? (
        <Text> </Text>
      ) : (
        <Text color="gray">
          STACK <Text color={isMe ? 'cyanBright' : 'white'}>${player.chips}</Text>
        </Text>
      )}
    </Box>
  );
}

interface PlayerCardsRowProps {
  readonly isMe: boolean;
  readonly isBlind: boolean;
  readonly myCards: readonly Card[];
  readonly revealedCards?: readonly Card[];
  readonly cardBorderGlowColors: readonly string[];
  readonly visibleCardCount?: number;
  readonly justDealtCardIndex?: number;
}

interface PlayerCardsPanelProps {
  readonly player: GamePlayerItem;
  readonly isMe: boolean;
  readonly hasFolded: boolean;
  readonly badge: ReturnType<typeof getPlayerBadgeInfo>;
  readonly borderColor: string;
  readonly myCards: readonly Card[];
  readonly revealedCards?: readonly Card[];
  readonly cardBorderGlowColors: readonly string[];
  readonly isThisPlayerTurn: boolean;
  readonly visibleCardCount?: number;
  readonly isEntranceDeckPhase?: boolean;
  readonly justDealtCardIndex?: number;
  readonly isEntranceActive?: boolean;
  readonly isNameGlowPhase?: boolean;
  readonly nameGlowElapsedMs?: number;
}

function PlayerBetAndBadgeRow({
  displayedBet,
  badge,
  isThisPlayerTurn,
}: {
  readonly displayedBet: number;
  readonly badge: ReturnType<typeof getPlayerBadgeInfo>;
  readonly isThisPlayerTurn: boolean;
}) {
  return (
    <Box justifyContent="space-between" width={22} marginTop={1}>
      <Text color="gray">BET ${displayedBet}</Text>
      <PlayerBadgeIndicator
        label={badge.label}
        color={badge.color}
        isThisPlayerTurn={isThisPlayerTurn}
      />
    </Box>
  );
}

function PlayerCardsPanel({
  player,
  isMe,
  badge,
  borderColor,
  myCards,
  revealedCards,
  cardBorderGlowColors,
  isThisPlayerTurn,
  visibleCardCount,
  justDealtCardIndex,
  isEntranceActive = false,
}: PlayerCardsPanelProps) {
  const displayedBet = isEntranceActive ? 0 : player.bet;

  return (
    <Box
      borderStyle="round"
      borderColor={borderColor}
      width={26}
      height={8}
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <PlayerCardsRow
        isMe={isMe}
        isBlind={player.isBlind}
        myCards={myCards}
        revealedCards={revealedCards}
        cardBorderGlowColors={cardBorderGlowColors}
        visibleCardCount={visibleCardCount}
        justDealtCardIndex={justDealtCardIndex}
      />
      <PlayerBetAndBadgeRow
        displayedBet={displayedBet}
        badge={badge}
        isThisPlayerTurn={isThisPlayerTurn}
      />
    </Box>
  );
}

function MySeatDetails({
  player,
  isShowdownRevealed,
  isEntranceActive = false,
}: Pick<PlayerCardsPanelProps, 'player'> & {
  readonly isShowdownRevealed: boolean;
  readonly isEntranceActive?: boolean;
}) {
  const isWaiting = player.status === 'WAITING';
  const shouldShowBlind = !isWaiting && !isEntranceActive;

  return (
    <Box flexDirection="column" width={14}>
      <Text color="cyanBright" bold>
        YOU {isWaiting && '[WAITING]'}
        {shouldShowBlind && (
          <HandModeIndicator
            isBlind={player.isBlind}
            isShowdownRevealed={isShowdownRevealed}
          />
        )}
      </Text>
      {isEntranceActive ? (
        <Text> </Text>
      ) : (
        <Text color="gray">
          STACK{' '}
          <Text color={isWaiting ? 'yellowBright' : 'cyanBright'}>${player.chips}</Text>
        </Text>
      )}
    </Box>
  );
}

function PlayerCardsRow({
  isMe,
  isBlind,
  myCards,
  revealedCards,
  cardBorderGlowColors,
  visibleCardCount = 3,
  justDealtCardIndex = -1,
}: PlayerCardsRowProps) {
  const cards = revealedCards ?? (isMe ? myCards : undefined);
  const hasRevealedCards = Boolean(revealedCards && revealedCards.length > 0);
  const shouldHideCards =
    !cards ||
    cards.length === 0 ||
    shouldHidePlayerCards({ isMe, isBlind, hasRevealedCards });
  return (
    <Box flexDirection="row" justifyContent="center">
      {[0, 1, 2].map((cardIndex) => {
        const isCardDealt = cardIndex < visibleCardCount;
        const isLandingFlash = cardIndex === justDealtCardIndex;
        const hiddenBorder = isLandingFlash
          ? 'yellowBright'
          : cardBorderGlowColors[cardIndex];
        return (
          <CardView
            key={`card-slot-${cardIndex}`}
            card={!isCardDealt || shouldHideCards ? undefined : cards[cardIndex]}
            isHidden={isCardDealt && shouldHideCards}
            hiddenBorderColor={isCardDealt && shouldHideCards ? hiddenBorder : undefined}
          />
        );
      })}
    </Box>
  );
}

function getSeatBadge(
  isSideshowParticipant: boolean,
  isEntranceDeckPhase: boolean,
  fallbackBadge: ReturnType<typeof getPlayerBadgeInfo>,
) {
  if (isSideshowParticipant) {
    return { label: '[DUEL]', color: 'cyanBright' };
  }
  if (isEntranceDeckPhase) {
    return { label: '[DEALING]', color: 'cyanBright' };
  }
  return fallbackBadge;
}

function getSeatBorderColor(
  isSideshowParticipant: boolean,
  isPendingSideshowTarget: boolean,
  isThisPlayerTurn: boolean,
  isEntranceDeckPhase: boolean,
) {
  if (isSideshowParticipant) {
    return 'cyanBright';
  }
  if (isPendingSideshowTarget) {
    return 'magentaBright';
  }
  if (isThisPlayerTurn && !isEntranceDeckPhase) {
    return 'yellowBright';
  }
  return 'gray';
}

function resolvePlayerSeatVisuals(
  player: GamePlayerItem,
  isThisPlayerTurn: boolean,
  isPendingSideshowTargetNode: boolean,
  isSideshowParticipantNode: boolean,
  isShowdownRevealed: boolean,
  isEntranceDeckPhase: boolean = false,
) {
  const hasFolded = player.status === 'FOLDED';
  const fallbackBadge = getPlayerBadgeInfo(
    hasFolded,
    isThisPlayerTurn,
    isPendingSideshowTargetNode,
    isShowdownRevealed,
  );
  const badge = getSeatBadge(
    isSideshowParticipantNode,
    isEntranceDeckPhase,
    fallbackBadge,
  );
  const borderColor = getSeatBorderColor(
    isSideshowParticipantNode,
    isPendingSideshowTargetNode,
    isThisPlayerTurn,
    isEntranceDeckPhase,
  );

  return { hasFolded, badge, borderColor };
}

interface SeatNodeRenderProps extends PlayerCardsPanelProps {
  readonly isShowdownRevealed: boolean;
}

function MySeatView(props: SeatNodeRenderProps) {
  return (
    <Box flexDirection="row" alignItems="center" width={42}>
      <PlayerCardsPanel {...props} />
      <Box marginLeft={2}>
        <MySeatDetails
          player={props.player}
          isShowdownRevealed={props.isShowdownRevealed}
          isEntranceActive={props.isEntranceActive}
        />
      </Box>
    </Box>
  );
}

function OtherPlayerSeatView(props: SeatNodeRenderProps) {
  return (
    <Box flexDirection="column" alignItems="center" width={26}>
      <PlayerSeatHeader
        player={props.player}
        isMe={props.isMe}
        isShowdownRevealed={props.isShowdownRevealed}
        isEntranceActive={props.isEntranceActive}
        isNameGlowPhase={props.isNameGlowPhase}
        nameGlowElapsedMs={props.nameGlowElapsedMs}
      />
      <PlayerCardsPanel {...props} />
    </Box>
  );
}

export function PlayerSeatNode(props: PlayerSeatNodeProps) {
  if (!props.player) {
    return <Box width={26} height={8} />;
  }

  const visuals = resolvePlayerSeatVisuals(
    props.player,
    props.isThisPlayerTurn,
    props.isPendingSideshowTargetNode,
    props.isSideshowParticipantNode,
    props.isShowdownRevealed,
    props.isEntranceDeckPhase,
  );
  const renderProps: SeatNodeRenderProps = {
    ...props,
    player: props.player,
    ...visuals,
  };

  return props.isMe ? (
    <MySeatView {...renderProps} />
  ) : (
    <OtherPlayerSeatView {...renderProps} />
  );
}
