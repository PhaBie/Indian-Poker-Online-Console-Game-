import { Box, Text } from 'ink';

export interface ConnectScreenProps {
  readonly playerId: string | null;
  readonly serverUrl: string;
}

export function ConnectScreen({ playerId, serverUrl }: ConnectScreenProps) {
  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="cyan">
      <Text color="green" bold>
        Indian Poker Console Game
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          กำลังเชื่อมต่อไปที่: <Text color="yellow">{serverUrl}</Text>
        </Text>
        <Box marginTop={1}>
          {playerId ? (
            <Text color="greenBright">✔ เชื่อมต่อสำเร็จ! (Player ID: {playerId})</Text>
          ) : (
            <Text color="cyan">...กำลังรอการตอบกลับจาก Server...</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
