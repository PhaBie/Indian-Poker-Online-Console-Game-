export type ServerConnectionMode = 'SELECT_ACTION' | 'INPUT_IP';

export interface ServerConnectionScreenProps {
  readonly serverUrl: string;
  readonly isConnected: boolean;
  readonly onConnect: (newUrl: string) => Promise<boolean>;
  readonly onConnectedSuccess: (urlToSave: string) => void;
  readonly onBack: () => void;
}
