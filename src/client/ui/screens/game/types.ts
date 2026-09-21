import type { ServerEvent, Card } from '../../../../shared/types';
import type { SocketClient } from '../../../network/socketClient';

export type GameStatePayload = Extract<
  ServerEvent,
  { type: 'GAME_STATE_UPDATE' }
>['payload'];

export type GamePlayerItem = GameStatePayload['players'][number];

export interface GameScreenProps {
  readonly gameState: GameStatePayload;
  readonly myPlayerId: string | null;
  readonly socketClient: SocketClient;
  readonly serverError?: string | null;
  readonly roundResult?: Extract<ServerEvent, { type: 'GAME_RESULT' }>['payload'] | null;
  readonly roundStartChips?: Readonly<Record<string, number>>;
  readonly isSideshowResultVisible?: boolean;
  readonly isSideshowNoticeVisible?: boolean;
  readonly autoAdvanceRound?: boolean;
  readonly onNextRound?: () => void;
  readonly onLeave: () => void;
}

export interface TableSeatPositions<T> {
  readonly bottomPlayer: T | undefined;
  readonly leftPlayer: T | undefined;
  readonly topPlayer: T | undefined;
  readonly rightPlayer: T | undefined;
}

export interface CardViewProps {
  readonly card?: Card;
  readonly isHidden?: boolean;
  readonly hiddenBorderColor?: string;
}

export interface PlayerBadgeInfo {
  readonly label: string | null;
  readonly color: string;
}

export interface PlayerSeatNodeProps {
  readonly player: GamePlayerItem | undefined;
  readonly isMe: boolean;
  readonly isThisPlayerTurn: boolean;
  readonly isBankrupt: boolean;
  readonly isPendingSideshowTargetNode: boolean;
  readonly isSideshowParticipantNode: boolean;
  readonly isShowdownRevealed: boolean;
  readonly myCards: readonly Card[];
  readonly revealedCards?: readonly Card[];
  readonly cardBorderGlowColors: readonly string[];
  readonly visibleCardCount?: number;
}

export interface ActionMenuItem {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}

export interface GameActionsPanelProps {
  readonly isMyTurn: boolean;
  readonly inputMode: 'menu' | 'input_bet';
  readonly betAmount: string;
  readonly actionItems: readonly ActionMenuItem[];
  readonly onActionSelect: (item: { label: string; value: string }) => void;
  readonly onBetChange: (amount: string) => void;
  readonly onBetSubmit: (amount: string) => void;
  readonly statusContext: StatusStateContext;
  readonly notice?: string | null;
  readonly isInputDisabled?: boolean;
  readonly shouldShowActions?: boolean;
}

export interface StatusStateContext {
  readonly isBankrupt: boolean;
  readonly isRoundEnding?: boolean;
  readonly isMyTurn: boolean;
  readonly isPendingSideshowTarget: boolean;
  readonly isPendingSideshowChallenger: boolean;
  readonly hasPendingSideshow: boolean;
}

export interface GameStatusPanelProps {
  readonly localError: string | null;
  readonly serverError?: string | null;
  readonly statusContext: StatusStateContext;
}

export interface GameTableLayoutProps {
  readonly pot: number;
  readonly currentStake: number;
  readonly seatPositions: TableSeatPositions<GamePlayerItem>;
  readonly currentTurnPlayerId: string | null;
  readonly myPlayerId: string | null;
  readonly pendingSideshowTargetId?: string;
  readonly myCards: readonly Card[];
  readonly sideshowResult?: {
    readonly challengerId: string;
    readonly targetId: string;
    readonly winnerId: string;
    readonly loserId: string;
    readonly cards: Record<string, readonly Card[]>;
  } | null;
  readonly sideshowNotice?: {
    readonly challengerId: string;
    readonly targetId: string;
    readonly outcome: 'DECLINED';
  } | null;
  readonly showdownCards?: Record<string, readonly Card[]> | null;
  readonly isPotAmountVisible?: boolean;
  readonly entranceVisibleCardCount?: number;
  readonly isEntranceDeckPhase?: boolean;
  readonly entranceElapsedMs?: number;
}
