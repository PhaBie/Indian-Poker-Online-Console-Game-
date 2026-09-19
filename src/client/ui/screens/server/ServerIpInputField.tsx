import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { UI_COLORS } from '../../theme/colors';

interface ServerIpInputFieldProps {
  readonly ipValue: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
}

export function ServerIpInputField({
  ipValue,
  onChange,
  onSubmit,
}: ServerIpInputFieldProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={UI_COLORS.activeBlue}
      paddingX={2}
      paddingY={1}
      marginY={1}
    >
      <Text bold color={UI_COLORS.activeBlue}>
        Enter Server Host IP (e.g. 192.168.1.50):
      </Text>
      <Box flexDirection="row" marginTop={1}>
        <Text color={UI_COLORS.primaryText}>Target: ws://</Text>
        <TextInput
          value={ipValue}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="192.168.1.X:8080"
        />
      </Box>
    </Box>
  );
}
