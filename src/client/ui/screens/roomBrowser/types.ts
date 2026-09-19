import type { RoomSummaryDTO } from '../../../../shared/types';

export type { RoomSummaryDTO };

export interface RoomBrowserScreenProps {
  readonly rooms: RoomSummaryDTO[];
  readonly playerName: string;
  readonly serverUrl: string;
  readonly onJoinRoom: (roomId: string) => void;
  readonly onCreateRoom: () => void;
  readonly onRefresh: () => void;
  readonly onBack: () => void;
  readonly lastError?: string | null;
}
