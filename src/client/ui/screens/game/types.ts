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
}

export interface PlayerBadgeInfo {
  readonly label: string | null;
  readonly color: string;
}

export interface PlayerSeatNodeProps {
  readonly player: GamePlayerItem | undefined;
  readonly isMe: boolean;
  readonly isThisPlayerTurn: boolean;
  readonly isPendingSideshowTargetNode: boolean;
  readonly myCards: readonly Card[];
}

export interface ActionMenuItem {
  readonly label: string;
  readonly value: string;
}

export interface GameActionsPanelProps {
  readonly isMyTurn: boolean;
  readonly inputMode: 'menu' | 'input_bet';
  readonly betAmount: string;
  readonly isPendingSideshowTarget: boolean;
  readonly actionItems: readonly ActionMenuItem[];
  readonly sideshowItems: readonly ActionMenuItem[];
  readonly onActionSelect: (item: { label: string; value: string }) => void;
  readonly onBetChange: (amount: string) => void;
  readonly onBetSubmit: (amount: string) => void;
}

export interface StatusStateContext {
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
  readonly roomId: string;
  readonly pot: number;
  readonly seatPositions: TableSeatPositions<GamePlayerItem>;
  readonly currentTurnPlayerId: string | null;
  readonly myPlayerId: string | null;
  readonly pendingSideshowTargetId?: string;
  readonly myCards: readonly Card[];
}
