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
        <Text color="gray">ENTER CONFIRM · ESC BACK</Text>
      </Box>
    </Box>
  );
}

function EntranceInitializingContent({
  entranceDescription,
}: {
  readonly entranceDescription?: string;
}) {
  return (
    <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
      <Text color="cyanBright" bold>
        ROUND INITIALIZING
      </Text>
      <Box marginTop={1}>
        <Text color="yellowBright" bold>
          {entranceDescription ?? 'Dealing cards to players...'}
        </Text>
      </Box>
      <Box marginTop={2}>
        <Text color="gray">WAITING FOR DEAL TO FINISH</Text>
      </Box>
    </Box>
  );
}

function TableWaitingContent({
  status,
  isBankrupt,
}: {
  readonly status: ReturnType<typeof getStatusDisplayInfo>;
  readonly isBankrupt: boolean;
}) {
  return (
    <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
      <Text color={status.color} bold={status.bold}>
        {status.text}
      </Text>
      <Box marginTop={2}>
        <Text color="gray">
          {isBankrupt
            ? 'YOU ARE NOW SPECTATING'
            : status.text.includes('WAITING FOR NEW GAME')
              ? 'SEAT RESERVED FOR NEW GAME'
              : 'WATCH THE TABLE'}
        </Text>
      </Box>
    </Box>
  );
}

interface PanelHeaderProps {
  readonly isEntranceActive: boolean;
  readonly canChooseAction: boolean;
  readonly isPulseOn: boolean;
  readonly panelTitle: string;
  readonly status: ReturnType<typeof getStatusDisplayInfo>;
}

function PanelHeader({
  isEntranceActive,
  canChooseAction,
  isPulseOn,
  panelTitle,
  status,
}: PanelHeaderProps) {
  const headerColor = isEntranceActive
    ? 'cyanBright'
    : canChooseAction
      ? 'yellow'
      : 'gray';
  const titleText = isEntranceActive
    ? 'TABLE INITIALIZING'
    : canChooseAction
      ? `${isPulseOn ? '●' : '○'} ${panelTitle}`
      : 'TABLE STATUS';

  return (
    <Box justifyContent="space-between" marginBottom={1}>
      <Text color={headerColor} bold>
        {titleText}
      </Text>
      <Text color={isEntranceActive ? 'cyanBright' : status.color} bold={status.bold}>
        ●
      </Text>
    </Box>
  );
}

interface PanelBodyContentProps {
  readonly isEntranceActive: boolean;
  readonly canChooseAction: boolean;
  readonly inputMode: 'menu' | 'input_bet';
  readonly menuItems: { label: string; value: string }[];
  readonly onActionSelect: (item: { label: string; value: string }) => void;
  readonly isInputDisabled: boolean;
  readonly betAmount: string;
  readonly onBetChange: (value: string) => void;
  readonly onBetSubmit: (value: string) => void;
  readonly entranceDescription?: string;
  readonly status: ReturnType<typeof getStatusDisplayInfo>;
  readonly isBankrupt: boolean;
}

function PanelBodyContent({
  isEntranceActive,
  canChooseAction,
  inputMode,
  menuItems,
  onActionSelect,
  isInputDisabled,
  betAmount,
  onBetChange,
  onBetSubmit,
  entranceDescription,
  status,
  isBankrupt,
}: PanelBodyContentProps) {
  if (isEntranceActive) {
    return <EntranceInitializingContent entranceDescription={entranceDescription} />;
  }

  if (!canChooseAction) {
    return <TableWaitingContent status={status} isBankrupt={isBankrupt} />;
  }

  if (inputMode === 'input_bet') {
    return (
      <BetInputForm
        betAmount={betAmount}
        onBetChange={onBetChange}
        onBetSubmit={onBetSubmit}
        isInputDisabled={isInputDisabled}
      />
    );
  }

  return (
    <SelectInput
      items={menuItems}
      onSelect={onActionSelect}
      isFocused={!isInputDisabled}
      indicatorComponent={EmptyIndicator}
      itemComponent={ActionButton}
    />
  );
}

function PanelControlsFooter({
  canChooseAction,
  isEntranceActive,
}: {
  readonly canChooseAction: boolean;
  readonly isEntranceActive: boolean;
}) {
  return (
    <Box
      borderStyle="single"
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor="gray"
      paddingTop={1}
      flexDirection="column"
    >
      <Text color={isEntranceActive ? 'yellowBright' : 'gray'}>
        {canChooseAction ? 'KEYBOARD CONTROLS' : 'ACTIONS LOCKED'}
      </Text>
      <Text color="gray">
        {canChooseAction
          ? '↑↓ Navigate · Enter select'
          : isEntranceActive
            ? 'Please wait for dealing to finish...'
            : 'Controls disabled'}
      </Text>
    </Box>
  );
}

function useActionPulse(canChooseAction: boolean): boolean {
  const [isPulseOn, setIsPulseOn] = useState(false);

  useEffect(() => {
    if (!canChooseAction) return;
    const timer = setInterval(() => setIsPulseOn((value) => !value), 450);
    return () => clearInterval(timer);
  }, [canChooseAction]);

  return isPulseOn;
}

function formatMenuItems(
  actionItems: readonly { label: string; value: string; hint?: string }[],
) {
  return actionItems.map((item) => ({
    label: item.hint ? `${item.label}|${item.hint}` : item.label,
    value: item.value,
  }));
}

function NoticeBox({ notice }: { readonly notice?: string | null }) {
  if (!notice) return null;
  return (
    <Box marginBottom={1} flexDirection="column">
      <Text color="redBright" bold wrap="wrap">
        [!] {notice}
      </Text>
    </Box>
  );
}

function PanelContentGroup({
  props,
  canChooseAction,
  menuItems,
  status,
}: {
  readonly props: GameActionsPanelProps;
  readonly canChooseAction: boolean;
  readonly menuItems: { label: string; value: string }[];
  readonly status: ReturnType<typeof getStatusDisplayInfo>;
}) {
  return (
    <>
      <PanelBodyContent
        isEntranceActive={props.isEntranceActive ?? false}
        canChooseAction={canChooseAction}
        inputMode={props.inputMode}
        menuItems={menuItems}
        onActionSelect={props.onActionSelect}
        isInputDisabled={props.isInputDisabled ?? false}
        betAmount={props.betAmount}
        onBetChange={props.onBetChange}
        onBetSubmit={props.onBetSubmit}
        entranceDescription={props.entranceDescription}
        status={status}
        isBankrupt={props.statusContext.isBankrupt}
      />
      <Box flexGrow={1} />
      <NoticeBox notice={props.notice} />
      <PanelControlsFooter
        canChooseAction={canChooseAction}
        isEntranceActive={props.isEntranceActive ?? false}
      />
    </>
  );
}

export function GameActionsPanel(props: GameActionsPanelProps) {
  const {
    isMyTurn,
    statusContext,
    shouldShowActions = true,
    isEntranceActive = false,
  } = props;

  const canChooseAction =
    !isEntranceActive &&
    shouldShowActions &&
    (isMyTurn || statusContext.isPendingSideshowTarget);
  const isPulseOn = useActionPulse(canChooseAction);
  const status = getStatusDisplayInfo(statusContext);
  const panelTitle = statusContext.isPendingSideshowTarget
    ? 'SIDESHOW REQUEST'
    : 'YOUR MOVE';
  const menuItems = formatMenuItems(props.actionItems);
  const borderColor = isEntranceActive
    ? 'cyanBright'
    : canChooseAction
      ? 'yellow'
      : 'gray';

  return (
    <Box
      borderStyle="round"
      borderColor={borderColor}
      flexDirection="column"
      paddingX={1}
      width={45}
      height={38}
      marginLeft={1}
    >
      <PanelHeader
        isEntranceActive={isEntranceActive}
        canChooseAction={canChooseAction}
        isPulseOn={isPulseOn}
        panelTitle={panelTitle}
        status={status}
      />
      <PanelContentGroup
        props={props}
        canChooseAction={canChooseAction}
        menuItems={menuItems}
        status={status}
      />
    </Box>
  );
}
