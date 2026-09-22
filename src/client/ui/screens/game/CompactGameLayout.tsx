import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type { Card } from '../../../../shared/types';
import {
  formatCardRank,
  getCardSuitSymbol,
  getStatusDisplayInfo,
} from './gameLayoutHelpers';
import type { ActionMenuItem, GamePlayerItem, StatusStateContext } from './types';

interface CompactGameLayoutProps {
  readonly roomId: string;
  readonly hostName?: string;
  readonly players: readonly GamePlayerItem[];
  readonly myPlayerId: string | null;
  readonly currentTurnPlayerId: string | null;
  readonly pot: number;
  readonly currentStake: number;
  readonly myCards: readonly Card[];
  readonly statusContext: StatusStateContext;
  readonly actionItems: readonly ActionMenuItem[];
  readonly inputMode: 'menu' | 'input_bet';
  readonly betAmount: string;
  readonly notice: string | null;
  readonly isInputDisabled: boolean;
  readonly shouldShowActions: boolean;
  readonly onActionSelect: (item: { label: string; value: string }) => void;
  readonly onBetChange: (amount: string) => void;
  readonly onBetSubmit: (amount: string) => void;
}

function compactPlayerLabel(
  player: GamePlayerItem,
  myPlayerId: string | null,
  currentTurnPlayerId: string | null,
): string {
  const marker =
    player.id === currentTurnPlayerId ? '▶' : player.status === 'FOLDED' ? '×' : ' ';
  const name = player.id === myPlayerId ? 'YOU' : player.name;
  const state = player.status === 'FOLDED' ? 'FOLD' : player.isBlind ? 'BLIND' : 'SEEN';
  return `${marker} ${name.slice(0, 16).padEnd(16)} $${player.chips}  B:$${player.bet}  ${state}`;
}

function CompactCards({ cards }: { readonly cards: readonly Card[] }) {
  if (cards.length === 0) return null;
  return (
    <Box marginTop={1}>
      <Text color="cyanBright">YOUR CARDS: </Text>
      <Text color="white">
        {cards
          .map((card) => `${formatCardRank(card.rank)}${getCardSuitSymbol(card.suit)}`)
          .join('  ')}
      </Text>
    </Box>
  );
}

function CompactActionArea({
  actionItems,
  inputMode,
  betAmount,
  isInputDisabled,
  shouldShowActions,
  statusContext,
  onActionSelect,
  onBetChange,
  onBetSubmit,
}: Pick<
  CompactGameLayoutProps,
  | 'actionItems'
  | 'inputMode'
  | 'betAmount'
  | 'isInputDisabled'
  | 'shouldShowActions'
  | 'statusContext'
  | 'onActionSelect'
  | 'onBetChange'
  | 'onBetSubmit'
>) {
  const status = getStatusDisplayInfo(statusContext);
  const canChooseAction =
    shouldShowActions &&
    !isInputDisabled &&
    (statusContext.isMyTurn || statusContext.isPendingSideshowTarget);

  if (!canChooseAction) {
    return <Text color={status.color}>{status.text}</Text>;
  }

  if (inputMode === 'input_bet') {
    return (
      <Box>
        <Text color="yellow" bold>
          BET $
        </Text>
        <TextInput
          value={betAmount}
          onChange={onBetChange}
          onSubmit={onBetSubmit}
          focus
        />
        <Text color="gray"> Enter confirm · Esc back</Text>
      </Box>
    );
  }

  return (
    <SelectInput
      items={actionItems.map((item) => ({
        label: item.hint ? `${item.label}  ${item.hint}` : item.label,
        value: item.value,
      }))}
      onSelect={onActionSelect}
      isFocused
    />
  );
}

export function CompactGameLayout(props: CompactGameLayoutProps) {
  return (
    <Box
      borderStyle="round"
      borderColor="cyanBright"
      width={76}
      paddingX={1}
      flexDirection="column"
    >
      <Box justifyContent="space-between">
        <Text color="yellowBright" bold>
          TEEN PATTI
        </Text>
        <Text color="gray">
          {props.hostName ?? 'Table'} · #{props.roomId.slice(0, 6)}
        </Text>
      </Box>
      <Box marginTop={1} justifyContent="space-between">
        <Text color="yellowBright" bold>
          POT ${props.pot}
        </Text>
        <Text color="gray">STAKE ${props.currentStake}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {props.players.map((player) => (
          <Text
            key={player.id}
            color={
              player.id === props.currentTurnPlayerId
                ? 'yellowBright'
                : player.status === 'FOLDED'
                  ? 'gray'
                  : 'white'
            }
          >
            {compactPlayerLabel(player, props.myPlayerId, props.currentTurnPlayerId)}
          </Text>
        ))}
      </Box>
      <CompactCards cards={props.myCards} />
      <Box
        marginTop={1}
        borderStyle="single"
        borderLeft={false}
        borderRight={false}
        borderBottom={false}
        borderColor="gray"
        flexDirection="column"
      >
        {props.notice && <Text color="redBright">[!] {props.notice}</Text>}
        <CompactActionArea {...props} />
      </Box>
      <Text color="gray">↑↓ choose · Enter confirm · Esc leave</Text>
    </Box>
  );
}
