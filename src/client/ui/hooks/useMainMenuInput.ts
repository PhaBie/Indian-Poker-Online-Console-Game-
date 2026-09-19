import { useInput } from 'ink';
import type { Key } from 'ink';
import type { MainMenuOption } from '../screens/MainMenuScreen';
import { determineNextFocus } from '../screens/MainMenuScreen';
import { MENU_CARD_DEFINITIONS } from '../components/MainMenuCards';

const EXIT_MENU_INDEX = MENU_CARD_DEFINITIONS.findIndex(
  (item) => item.optionId === 'EXIT',
);

export interface UseMainMenuInputParams {
  readonly focusedIndex: number;
  readonly isSubmitting: boolean;
  readonly onSelectOption: (option: MainMenuOption) => void;
  readonly setFocusedIndex: (updater: (prev: number) => number) => void;
  readonly onTriggerSubmit: () => void;
}

interface HandleInputKeyParams {
  readonly key: Key;
  readonly focusedIndex: number;
  readonly isSubmitting: boolean;
  readonly onSelectOption: (option: MainMenuOption) => void;
  readonly setFocusedIndex: (updater: (prev: number) => number) => void;
  readonly onTriggerSubmit: () => void;
}

function handleInputKeypress({
  key,
  focusedIndex,
  isSubmitting,
  onSelectOption,
  setFocusedIndex,
  onTriggerSubmit,
}: HandleInputKeyParams): void {
  if (key.escape) {
    onSelectOption('EXIT');
    return;
  }
  if (isSubmitting) {
    return;
  }
  if (key.upArrow) {
    setFocusedIndex((prev) => determineNextFocus(prev, 'PREVIOUS'));
    return;
  }
  if (key.downArrow) {
    setFocusedIndex((prev) => determineNextFocus(prev, 'NEXT'));
    return;
  }
  if (key.return) {
    if (focusedIndex === EXIT_MENU_INDEX) {
      onSelectOption('EXIT');
      return;
    }
    onTriggerSubmit();
  }
}

export function useMainMenuInput(params: UseMainMenuInputParams) {
  useInput(
    (_input, key) => {
      handleInputKeypress({ key, ...params });
    },
    { isActive: Boolean(process.stdin.isTTY) },
  );
}
