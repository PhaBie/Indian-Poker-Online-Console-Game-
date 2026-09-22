import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

interface GameExitConfirmDialogProps {
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly compact?: boolean;
}

type ExitChoice = 'leave' | 'stay';

function ExitChoiceButton({
  label,
  isSelected,
  tone,
}: {
  readonly label: string;
  readonly isSelected: boolean;
  readonly tone: 'redBright' | 'greenBright';
}) {
  return (
    <Box
      borderStyle="round"
      borderColor={isSelected ? tone : 'gray'}
      backgroundColor={isSelected ? 'black' : undefined}
      width={20}
      justifyContent="center"
    >
      <Text color={isSelected ? tone : 'gray'} bold={isSelected}>
        {isSelected ? '● ' : '  '}
        {label}
      </Text>
    </Box>
  );
}

export function GameExitConfirmDialog({
  onConfirm,
  onCancel,
  compact = false,
}: GameExitConfirmDialogProps) {
  const [choice, setChoice] = useState<ExitChoice>('stay');

  useInput((input, key) => {
    const normalizedInput = input.toLowerCase();
    if (key.escape || normalizedInput === 'n') {
      onCancel();
      return;
    }
    if (normalizedInput === 'y') {
      onConfirm();
      return;
    }
    if (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow) {
      setChoice((currentChoice) => (currentChoice === 'leave' ? 'stay' : 'leave'));
      return;
    }
    if (key.return) {
      if (choice === 'leave') onConfirm();
      else onCancel();
    }
  });

  return (
    <Box
      position="absolute"
      top={compact ? 4 : 9}
      left={compact ? 13 : 34}
      width={50}
      height={11}
      borderStyle="round"
      borderColor="yellow"
      backgroundColor="black"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Text color="yellow" bold>
        LEAVE THIS TABLE?
      </Text>
      <Box marginTop={1} marginBottom={1}>
        <Text color="gray">Your current game will be left.</Text>
      </Box>
      <Box gap={1}>
        <ExitChoiceButton
          label="YES, LEAVE"
          isSelected={choice === 'leave'}
          tone="redBright"
        />
        <ExitChoiceButton
          label="NO, STAY"
          isSelected={choice === 'stay'}
          tone="greenBright"
        />
      </Box>
      <Box marginTop={1}>
        <Text color="gray">← → Choose · Enter confirm · Esc cancel</Text>
      </Box>
    </Box>
  );
}
