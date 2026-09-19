import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

export interface EnterUsernameScreenProps {
  onSubmit: (username: string) => void;
}

export function EnterUsernameScreen({ onSubmit }: EnterUsernameScreenProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  // Extract username from "name <username>" command or just take the raw input if it doesn't match
  const getUsername = () => {
    const trimmed = input.trim();
    if (trimmed.toLowerCase().startsWith('name ')) {
      return trimmed.substring(5).trim();
    }
    return trimmed;
  };

  const username = getUsername();

  const handleSubmit = (_value: string) => {
    const finalName = getUsername();
    if (finalName.length < 3 || finalName.length > 12) {
      setError('Username must be 3-12 characters long');
    } else {
      setError('');
      onSubmit(finalName);
    }
  };

  return (
    <Box flexDirection="column" width={60}>
      <Box borderStyle="round" borderColor="yellow" justifyContent="center">
        <Text color="yellow">ENTER </Text>
        <Text color="magentaBright">USERNAME</Text>
      </Box>

      <Box
        borderStyle="round"
        borderColor="yellow"
        flexDirection="column"
        paddingY={2}
        paddingX={2}
        minHeight={15}
        alignItems="center"
      >
        <Box
          flexGrow={1}
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width="100%"
        >
          <Text color="blueBright" bold>
            PLAYER NAME
          </Text>
          <Box
            borderStyle="round"
            borderColor="gray"
            paddingX={2}
            minWidth={20}
            justifyContent="center"
            marginTop={1}
          >
            <Text>{username || ' '}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="redBright" dimColor>
              *** 3-12 characters
            </Text>
          </Box>
          {error ? (
            <Box marginTop={1}>
              <Text color="red">{error}</Text>
            </Box>
          ) : null}
        </Box>

        <Box alignSelf="flex-start" marginTop={1} width="100%">
          <Text color="gray">Example: name &lt;username&gt;</Text>
        </Box>
      </Box>

      <Box borderStyle="round" borderColor="yellow" paddingX={1}>
        <Text>&gt; </Text>
        <TextInput
          value={input}
          onChange={(val) => {
            setInput(val);
            setError('');
          }}
          onSubmit={handleSubmit}
        />
      </Box>
    </Box>
  );
}
