export type GameInputMode = 'menu' | 'input_bet';
export type GameEscapeAction = 'cancel_bet' | 'open_exit' | null;

export function getGameEscapeAction(
  isEscapePressed: boolean,
  inputMode: GameInputMode,
  isExitDialogOpen: boolean,
): GameEscapeAction {
  if (!isEscapePressed || isExitDialogOpen) {
    return null;
  }

  return inputMode === 'input_bet' ? 'cancel_bet' : 'open_exit';
}
