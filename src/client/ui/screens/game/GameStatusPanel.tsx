import { Box, Text } from 'ink';
import type { GameStatusPanelProps } from './types';
import { getStatusDisplayInfo } from './gameLayoutHelpers';

export function GameStatusPanel({
  localError,
  serverError,
  statusContext,
}: GameStatusPanelProps) {
  const statusInfo = getStatusDisplayInfo(statusContext);

  return (
    <Box
      borderStyle="round"
      borderColor="blueBright"
      flexDirection="column"
      paddingX={1}
      flexGrow={1}
      marginTop={1}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text color="blueBright" bold>
          STATUS
        </Text>
      </Box>
      <Box flexGrow={1} flexDirection="column" justifyContent="flex-end">
        <Box
          borderStyle="single"
          borderBottom={false}
          borderLeft={false}
          borderRight={false}
          borderColor="gray"
          paddingTop={1}
          flexDirection="column"
          alignItems="center"
        >
          {localError && <Text color="red"> {localError}</Text>}
          {serverError && <Text color="redBright"> [Server]: {serverError}</Text>}
          <Text color={statusInfo.color} bold={statusInfo.bold}>
            {statusInfo.text}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
