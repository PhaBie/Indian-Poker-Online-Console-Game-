import type { PublicPlayerDTO } from '../../../../shared/types';

export interface WaitingRoomScreenProps {
  readonly roomId: string | null;
  readonly players: PublicPlayerDTO[];
  readonly hostId: string | null;
  readonly myPlayerId: string | null;
  readonly onStart: () => void;
  readonly onToggleReady: () => void;
  readonly onLeave: () => void;
  readonly networkMode?: string;
  readonly maxPlayers?: number;
  readonly serverUrl?: string;
}

export type { PublicPlayerDTO };
