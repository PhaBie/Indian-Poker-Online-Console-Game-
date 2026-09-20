import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type { GameActionsPanelProps } from './types';
import { getStatusDisplayInfo } from './gameLayoutHelpers';

interface BetInputFormProps {
  readonly betAmount: string;
  readonly onBetChange: (value: string) => void;
  readonly onBetSubmit: (value: string) => void;
  readonly isInputDisabled: boolean;
}

interface ActionButtonProps {
  readonly isSelected?: boolean;
  readonly label: string;
}

const ACTION_COLORS: Readonly<Record<string, string>> = {
  CALL: 'cyanBright',
  BET: 'yellow',
  SEE: 'magentaBright',
  FOLD: 'redBright',
  DUEL: 'greenBright',
  SHOW: 'yellowBright',
  ACCEPT: 'greenBright',
  DECLINE: 'redBright',
};

function ActionButton({ isSelected, label }: ActionButtonProps) {
  const [action, amount] = label.split('|');
  const actionColor = ACTION_COLORS[action] ?? 'white';
  const hint = amount || undefined;

  return (
    <Box
      borderStyle="round"
      borderColor={isSelected ? actionColor : 'gray'}
      width={41}
      height={3}
      paddingX={1}
      justifyContent="space-between"
      alignItems="center"
    >
      <Text color={isSelected ? actionColor : 'white'} bold={isSelected}>
        {isSelected ? '● ' : '  '}
        {action}
      </Text>
      {hint && <Text color={isSelected ? actionColor : 'gray'}>{hint}</Text>}
    </Box>
  );
}

function EmptyIndicator() {
  return <Text />;
}

function BetInputForm({
  betAmount,
  onBetChange,
  onBetSubmit,
  isInputDisabled,
}: BetInputFormProps) {
  return (
    <Box flexDirection="column">
      <Text color="yellow" bold>
        BET AMOUNT
      </Text>
      <Box flexDirection="row">
        <Text color="cyanBright">$ </Text>
        <TextInput
          value={betAmount}
          onChange={onBetChange}
          onSubmit={onBetSubmit}
          focus={!isInputDisabled}
        />
      </Box>
      <Box marginTop={1}>
        <Text color="gray">ENTER CONFIRM</Text>
      </Box>
    </Box>
  );
}

export function GameActionsPanel({
  isMyTurn,
  inputMode,
  betAmount,
  actionItems,
  onActionSelect,
  onBetChange,
  onBetSubmit,
  statusContext,
  isInputDisabled = false,
}: GameActionsPanelProps) {
  const [isPulseOn, setIsPulseOn] = useState(false);
  const status = getStatusDisplayInfo(statusContext);
  const canChooseAction = isMyTurn || statusContext.isPendingSideshowTarget;
  const panelTitle = statusContext.isPendingSideshowTarget
    ? 'SIDESHOW REQUEST'
    : 'YOUR MOVE';

  useEffect(() => {
    if (!canChooseAction) return;
    const timer = setInterval(() => setIsPulseOn((value) => !value), 450);
    return () => clearInterval(timer);
  }, [canChooseAction]);

  const menuItems = actionItems.map((item) => ({
    label: item.hint ? `${item.label}|${item.hint}` : item.label,
    value: item.value,
  }));

  return (
    <Box
      borderStyle="round"
      borderColor={canChooseAction ? 'yellow' : 'gray'}
      flexDirection="column"
      paddingX={1}
      width={45}
      height={38}
      marginLeft={1}
    >
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={canChooseAction ? 'yellow' : 'gray'} bold>
          {canChooseAction ? `${isPulseOn ? '●' : '○'} ${panelTitle}` : 'TABLE STATUS'}
        </Text>
        <Text color={status.color} bold={status.bold}>
          ●
        </Text>
      </Box>

      {canChooseAction && inputMode === 'menu' && (
        <SelectInput
          items={menuItems}
          onSelect={onActionSelect}
          isFocused={!isInputDisabled}
          indicatorComponent={EmptyIndicator}
          itemComponent={ActionButton}
        />
      )}

      {canChooseAction && inputMode === 'input_bet' && (
        <BetInputForm
          betAmount={betAmount}
          onBetChange={onBetChange}
          onBetSubmit={onBetSubmit}
          isInputDisabled={isInputDisabled}
        />
      )}

      {!canChooseAction && inputMode === 'menu' && (
        <Box
          flexDirection="column"
          flexGrow={1}
          justifyContent="center"
          alignItems="center"
        >
          <Text color={status.color} bold={status.bold}>
            {status.text}
          </Text>
          <Box marginTop={2}>
            <Text color="gray">WATCH THE TABLE</Text>
          </Box>
        </Box>
      )}

      <Box flexGrow={1} />
      <Box
        borderStyle="single"
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        borderColor="gray"
        paddingTop={1}
        flexDirection="column"
      >
        <Text color="gray">KEYBOARD CONTROLS</Text>
        <Text color="gray">↑↓ Navigate · Enter select</Text>
      </Box>
    </Box>
  );
}
