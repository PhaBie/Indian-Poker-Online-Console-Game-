import type { RoomSummaryDTO } from '../../../../shared/types';

export type { RoomSummaryDTO };

export interface RoomBrowserScreenProps {
  readonly networkMode?: 'LAN' | 'INTERNET';
  readonly rooms: RoomSummaryDTO[];
  readonly playerName: string;
  readonly serverUrl: string;
  readonly onJoinRoom: (roomId: string) => void;
  readonly onJoinRoomByCode: (roomId: string) => void;
  readonly onEnterRoomCode?: () => void;
  readonly onChangeName: (returnTo?: 'lobby' | 'code') => void;
  readonly onRefresh: () => void;
  readonly onBack: () => void;
  readonly isEnteringCode?: boolean;
  readonly initialEnteringCode?: boolean;
  readonly onRoomCodeOpened?: () => void;
  readonly lastError?: string | null;
}
