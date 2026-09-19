import { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { ShimmeringHeader } from '../components/ShimmeringHeader';
import { MainMenuCards, MENU_CARD_DEFINITIONS } from '../components/MainMenuCards';
import { useTerminalSize, clearTerminalScreen } from '../hooks/useTerminalSize';
import { useMainMenuInput } from '../hooks/useMainMenuInput';
import {
  getTerminalSizeStatus,
  TerminalOutOfRangeScreen,
} from '../components/ScreenSizeGuard';

import { UI_COLORS } from '../theme/colors';

const CONTAINER_BREAKPOINTS = {
  small: { maxColumns: 120, baseWidth: 66 },
  medium: { maxColumns: 160, baseWidth: 66, growthRate: 0.1 },
  large: { maxColumns: 200, baseWidth: 70, growthRate: 0.45 },
  extraLarge: { baseWidth: 88, growthRate: 0.2, maxWidth: 92 },
} as const;

export function getGameContainerWidth(terminalColumns: number): number {
  const { small, medium, large, extraLarge } = CONTAINER_BREAKPOINTS;
  if (terminalColumns <= small.maxColumns) {
    return small.baseWidth;
  }
  if (terminalColumns <= medium.maxColumns) {
    return Math.round(
      medium.baseWidth + (terminalColumns - small.maxColumns) * medium.growthRate,
    );
  }
  if (terminalColumns <= large.maxColumns) {
    return Math.round(
      large.baseWidth + (terminalColumns - medium.maxColumns) * large.growthRate,
    );
  }
  return Math.min(
    extraLarge.maxWidth,
    Math.round(
      extraLarge.baseWidth + (terminalColumns - large.maxColumns) * extraLarge.growthRate,
    ),
  );
}

export type MainMenuOption = 'CREATE_ROOM' | 'JOIN_ROOM' | 'EXIT';

export interface MainMenuScreenProps {
  readonly onSelectOption?: (option: MainMenuOption) => void;
  readonly onCreateRoom?: () => void;
  readonly onJoinRoom?: () => void;
  readonly onExit?: () => void;
}

export function parseMainMenuChoice(rawInput: string): MainMenuOption | null {
  const trimmedInput = rawInput.trim();
  if (trimmedInput === '1' || trimmedInput.toUpperCase() === 'CREATE_ROOM') {
    return 'CREATE_ROOM';
  }
  if (trimmedInput === '2' || trimmedInput.toUpperCase() === 'JOIN_ROOM') {
    return 'JOIN_ROOM';
  }
  if (trimmedInput === '3' || trimmedInput.toUpperCase() === 'EXIT') {
    return 'EXIT';
  }
  return null;
}

const LAST_MENU_INDEX = MENU_CARD_DEFINITIONS.length - 1;

export function determineNextFocus(
  currentFocus: number,
  direction: 'PREVIOUS' | 'NEXT',
): number {
  if (direction === 'PREVIOUS') {
    return currentFocus > 0 ? currentFocus - 1 : LAST_MENU_INDEX;
  }
  return currentFocus < LAST_MENU_INDEX ? currentFocus + 1 : 0;
}

const TRANSITION_DELAY_MS = 150;

function getDestinationStatusText(focusedIndex: number): string {
  if (focusedIndex === 0) {
    return '- Preparing room...';
  }
  if (focusedIndex === 1) {
    return '- Opening connection setup...';
  }
  return 'Closing...';
}

function useScreenTransition(
  isSubmitting: boolean,
  focusedIndex: number,
  onSelectOption: (option: MainMenuOption) => void,
): string {
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }

    const transitionTimer = setTimeout(() => {
      const selectedOption = MENU_CARD_DEFINITIONS[focusedIndex]?.optionId ?? 'EXIT';
      onSelectOption(selectedOption);
    }, TRANSITION_DELAY_MS);

    return () => {
      clearTimeout(transitionTimer);
    };
  }, [isSubmitting, focusedIndex, onSelectOption]);

  return getDestinationStatusText(focusedIndex);
}

interface HelpItemProps {
  readonly command: string;
  readonly action: string;
  readonly marginRight?: number;
}

function HelpItem({ command, action, marginRight = 0 }: HelpItemProps) {
  return (
    <Box marginRight={marginRight}>
      <Text>
        <Text bold color={UI_COLORS.goldBorder}>
          {command}
        </Text>
        <Text color={UI_COLORS.mutedText}> {action}</Text>
      </Text>
    </Box>
  );
}

function MainMenuHelpFooter() {
  return (
    <Box justifyContent="center" marginTop={1} flexDirection="row">
      <HelpItem command="UP/DOWN" action="Navigate" marginRight={4} />
      <HelpItem command="ENTER" action="Select" marginRight={4} />
      <HelpItem command="ESC" action="Exit" />
    </Box>
  );
}

function useMenuSelection({
  onSelectOption,
  onCreateRoom,
  onJoinRoom,
  onExit,
}: MainMenuScreenProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSelection = useCallback(
    (option: MainMenuOption) => {
      if (onSelectOption) {
        onSelectOption(option);
        return;
      }
      if (option === 'CREATE_ROOM') {
        onCreateRoom?.();
      } else if (option === 'JOIN_ROOM') {
        onJoinRoom?.();
      } else if (option === 'EXIT') {
        clearTerminalScreen({ shouldRestoreCursor: true });
        if (onExit) {
          onExit();
        } else {
          process.exit(0);
        }
      }
    },
    [onSelectOption, onCreateRoom, onJoinRoom, onExit],
  );

  const handleTriggerSubmit = () => {
    setIsSubmitting(true);
  };

  const transitionText = useScreenTransition(isSubmitting, focusedIndex, handleSelection);

  useMainMenuInput({
    focusedIndex,
    isSubmitting,
    onSelectOption: handleSelection,
    setFocusedIndex,
    onTriggerSubmit: handleTriggerSubmit,
  });

  return { focusedIndex, isSubmitting, transitionText };
}

export function MainMenuScreen(props: MainMenuScreenProps) {
  const { focusedIndex, isSubmitting, transitionText } = useMenuSelection(props);
  const { columns, rows } = useTerminalSize();

  const sizeStatus = getTerminalSizeStatus(columns, rows);
  if (sizeStatus !== 'OPTIMAL') {
    return (
      <TerminalOutOfRangeScreen
        currentColumns={columns}
        currentRows={rows}
        status={sizeStatus}
      />
    );
  }

  const containerWidth = getGameContainerWidth(columns);

  return (
    <Box
      flexDirection="column"
      width="100%"
      height={rows}
      alignItems="center"
      justifyContent="center"
    >
      <Box width={containerWidth} flexDirection="column">
        <ShimmeringHeader containerWidth={containerWidth} />
        <MainMenuCards
          containerWidth={containerWidth}
          focusedIndex={focusedIndex}
          isSubmitting={isSubmitting}
          transitionStatusText={transitionText}
        />
        <MainMenuHelpFooter />
      </Box>
    </Box>
  );
}
