import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import type { Card } from '../../../../shared/types';
import type { PlayerSeatNodeProps, GamePlayerItem } from './types';
import { CardView } from './CardView';
import { getPlayerBadgeInfo } from './gameLayoutHelpers';
import { PlayerBadgeIndicator } from './PlayerBadgeIndicator';

interface PlayerSeatHeaderProps {
  readonly player: GamePlayerItem;
  readonly isMe: boolean;
  readonly isShowdownRevealed: boolean;
  readonly isBankrupt: boolean;
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
  isBankrupt,
}: PlayerSeatHeaderProps) {
  const displayName = isMe ? 'YOU' : player.name;
  return (
    <Box flexDirection="column" alignItems="center" width={26}>
      <Text>
        <Text color={isBankrupt ? 'redBright' : isMe ? 'cyanBright' : 'white'} bold>
          {displayName}
        </Text>
        <Text color="gray"> </Text>
        {isBankrupt ? (
          <Text color="redBright" bold>
            {' '}
            [BANKRUPT]
          </Text>
        ) : (
          <HandModeIndicator
            isBlind={player.isBlind}
            isShowdownRevealed={isShowdownRevealed}
          />
        )}
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
  readonly isBankrupt: boolean;
  readonly isThisPlayerTurn: boolean;
  readonly visibleCardCount?: number;
  readonly isEntranceDeckPhase?: boolean;
  readonly justDealtCardIndex?: number;
}

function BankruptCardContent() {
  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="redBright" bold>
        PLAYER ELIMINATED
      </Text>
      <Text color="redBright" bold>
        BANKRUPT
      </Text>
      <Text color="red">OUT OF CHIPS</Text>
    </Box>
  );
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
  hasFolded,
  badge,
  borderColor,
  myCards,
  revealedCards,
  cardBorderGlowColors,
  isBankrupt,
  isThisPlayerTurn,
  visibleCardCount,
  isEntranceDeckPhase,
  justDealtCardIndex,
}: PlayerCardsPanelProps) {
  const displayedBet = isEntranceDeckPhase ? 0 : player.bet;

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
      {isBankrupt ? (
        <BankruptCardContent />
      ) : (
        <>
          <PlayerCardsRow
            isMe={isMe}
            isBlind={player.isBlind}
            hasFolded={hasFolded}
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
        </>
      )}
    </Box>
  );
}

function MySeatDetails({
  player,
  isShowdownRevealed,
  isBankrupt,
}: Pick<PlayerCardsPanelProps, 'player' | 'isBankrupt'> & {
  readonly isShowdownRevealed: boolean;
}) {
  return (
    <Box flexDirection="column" width={14}>
      <Text color="cyanBright" bold>
        YOU{' '}
        {isBankrupt ? (
          'SPECTATOR'
        ) : (
          <HandModeIndicator
            isBlind={player.isBlind}
            isShowdownRevealed={isShowdownRevealed}
          />
        )}
      </Text>
      <Text color="gray">
        STACK <Text color={isBankrupt ? 'redBright' : 'cyanBright'}>${player.chips}</Text>
      </Text>
    </Box>
  );
}

function PlayerCardsRow({
  isMe,
  isBlind,
  hasFolded,
  myCards,
  revealedCards,
  cardBorderGlowColors,
  visibleCardCount = 3,
  justDealtCardIndex = -1,
}: PlayerCardsRowProps) {
  const cards = revealedCards ?? (isMe ? myCards : undefined);
  const shouldHideCards = !cards || (isMe && isBlind && !hasFolded && !revealedCards);
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
  isBankrupt: boolean,
  isSideshowParticipant: boolean,
  isEntranceDeckPhase: boolean,
  fallbackBadge: ReturnType<typeof getPlayerBadgeInfo>,
) {
  if (isBankrupt) {
    return { label: '[OUT]', color: 'redBright' };
  }
  if (isSideshowParticipant) {
    return { label: '[DUEL]', color: 'cyanBright' };
  }
  if (isEntranceDeckPhase) {
    return { label: '[DEALING]', color: 'cyanBright' };
  }
  return fallbackBadge;
}

function getSeatBorderColor(
  isBankrupt: boolean,
  isSideshowParticipant: boolean,
  isPendingSideshowTarget: boolean,
  isThisPlayerTurn: boolean,
  isEntranceDeckPhase: boolean,
) {
  if (isBankrupt) {
    return 'redBright';
  }
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
  isBankrupt: boolean,
  isPendingSideshowTargetNode: boolean,
  isSideshowParticipantNode: boolean,
  isEntranceDeckPhase: boolean = false,
) {
  const hasFolded = player.status === 'FOLDED';
  const fallbackBadge = getPlayerBadgeInfo(
    hasFolded,
    isThisPlayerTurn,
    isPendingSideshowTargetNode,
  );
  const badge = getSeatBadge(
    isBankrupt,
    isSideshowParticipantNode,
    isEntranceDeckPhase,
    fallbackBadge,
  );
  const borderColor = getSeatBorderColor(
    isBankrupt,
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
          isBankrupt={props.isBankrupt}
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
        isBankrupt={props.isBankrupt}
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
    props.isBankrupt,
    props.isPendingSideshowTargetNode,
    props.isSideshowParticipantNode,
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
