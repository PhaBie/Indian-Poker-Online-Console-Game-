import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type { GameActionsPanelProps } from './types';

interface BetInputFormProps {
  readonly betAmount: string;
  readonly onBetChange: (value: string) => void;
  readonly onBetSubmit: (value: string) => void;
}

function BetInputForm({ betAmount, onBetChange, onBetSubmit }: BetInputFormProps) {
  return (
    <Box flexDirection="column">
      <Text color="cyanBright">Enter Bet Amount:</Text>
      <Box flexDirection="row">
        <Text color="white">&gt; </Text>
        <TextInput value={betAmount} onChange={onBetChange} onSubmit={onBetSubmit} />
      </Box>
      <Text color="gray">(Press Enter to confirm)</Text>
    </Box>
  );
}

export function GameActionsPanel({
  isMyTurn,
  inputMode,
  betAmount,
  isPendingSideshowTarget,
  actionItems,
  sideshowItems,
  onActionSelect,
  onBetChange,
  onBetSubmit,
}: GameActionsPanelProps) {
  return (
    <Box
      borderStyle="round"
      borderColor="magentaBright"
      flexDirection="column"
      paddingX={1}
      height={14}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text color="magentaBright" bold>
          ACTIONS
        </Text>
      </Box>

      {isMyTurn && inputMode === 'menu' && (
        <SelectInput items={[...actionItems]} onSelect={onActionSelect} />
      )}

      {isMyTurn && inputMode === 'input_bet' && (
        <BetInputForm
          betAmount={betAmount}
          onBetChange={onBetChange}
          onBetSubmit={onBetSubmit}
        />
      )}

      {isPendingSideshowTarget && (
        <Box flexDirection="column">
          <Text color="redBright">Sideshow Requested!</Text>
          <SelectInput items={[...sideshowItems]} onSelect={onActionSelect} />
        </Box>
      )}

      {!isMyTurn && !isPendingSideshowTarget && (
        <Box alignItems="center" justifyContent="center" flexGrow={1}>
          <Text color="gray">Waiting...</Text>
        </Box>
      )}
    </Box>
  );
}
