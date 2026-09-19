import React from 'react';
import { Box, Text, useApp } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import SelectInput from 'ink-select-input';

export interface MainMenuScreenProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export function MainMenuScreen({ onCreateRoom, onJoinRoom }: MainMenuScreenProps) {
  const { exit } = useApp();

  const items = [
    {
      label: 'Create Room (สร้างห้อง)',
      value: 'create',
    },
    {
      label: 'Join Room (เข้าห้องที่มีอยู่)',
      value: 'join',
    },
    {
      label: 'Exit (ออก)',
      value: 'exit',
    },
  ];

  const handleSelect = (item: { label: string; value: string }) => {
    if (item.value === 'create') {
      onCreateRoom();
    } else if (item.value === 'join') {
      onJoinRoom();
    } else if (item.value === 'exit') {
      exit();
      process.exit(0);
    }
  };

  return (
    <Box flexDirection="column" width={80} alignItems="center" marginTop={1}>
      <Gradient name="pastel">
        <BigText text="INDIAN POKER" font="chrome" />
      </Gradient>

      <Box
        borderStyle="round"
        borderColor="yellow"
        flexDirection="column"
        paddingY={1}
        paddingX={4}
        width={50}
        alignItems="center"
        marginTop={1}
      >
        <Box marginBottom={1}>
          <Text color="cyanBright" bold>
            -- SELECT AN OPTION --
          </Text>
        </Box>

        <Box width="100%" justifyContent="center">
          <SelectInput items={items} onSelect={handleSelect} />
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Use ↑/↓ arrows to select and Enter to confirm</Text>
      </Box>
    </Box>
  );
}
