import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { UI_COLORS } from '../../shared/theme/colors';

interface RoomCodePromptProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: (value: string) => void;
  readonly onBack: () => void;
  readonly onChangeName: () => void;
}

export function RoomCodePrompt({
  value,
  onChange,
  onSubmit,
  onBack,
  onChangeName,
}: RoomCodePromptProps) {
  useInput((input, key) => {
    if (key.escape) onBack();
    if (input.toLowerCase() === 'n') onChangeName();
  });

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight={12}
    >
      <Text bold color={UI_COLORS.goldHighlight}>
        ENTER ROOM CODE
      </Text>
      <Text color={UI_COLORS.mutedText}>Join directly without browsing the list</Text>
      <Box
        width={38}
        borderStyle="round"
        borderColor={UI_COLORS.activeBlue}
        paddingX={2}
        marginTop={2}
      >
        <Text bold color={UI_COLORS.goldHighlight}>
          #{' '}
        </Text>
        <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
      </Box>
    </Box>
  );
}
