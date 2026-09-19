import { useState, useCallback } from 'react';
import type { GameActionType } from '../../../../shared/types';
import type { SocketClient } from '../../../network/socketClient';
import type { ActionMenuItem } from './types';

export const ACTION_MENU_ITEMS: readonly ActionMenuItem[] = [
  { label: 'Bet/Raise', value: 'BET' },
  { label: 'Call', value: 'CALL' },
  { label: 'Fold', value: 'FOLD' },
  { label: 'Seen (ดูไพ่)', value: 'SEEN' },
  { label: 'Sideshow (ดวล)', value: 'SIDESHOW' },
  { label: 'Show Hand', value: 'SHOW' },
];

export const SIDESHOW_ACTION_ITEMS: readonly ActionMenuItem[] = [
  { label: 'Accept Sideshow', value: 'ACCEPT_SIDESHOW' },
  { label: 'Reject Sideshow', value: 'REJECT_SIDESHOW' },
];

export function useGameActionController(socketClient: SocketClient) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'menu' | 'input_bet'>('menu');
  const [betAmount, setBetAmount] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<GameActionType | null>(null);

  const handleActionSelect = useCallback(
    (item: { label: string; value: string }) => {
      setLocalError(null);
      const action = item.value as GameActionType;

      if (action === 'BET' || action === 'RAISE') {
        setSelectedAction(action);
        setInputMode('input_bet');
        setBetAmount('');
      } else {
        socketClient.send({ type: 'PLAYER_ACTION', payload: { action } });
      }
    },
    [socketClient],
  );

  const handleBetSubmit = useCallback(
    (value: string) => {
      const amount = parseInt(value, 10);
      if (isNaN(amount) || amount <= 0) {
        setLocalError('จำนวนเงินไม่ถูกต้อง');
        setInputMode('menu');
        return;
      }

      socketClient.send({
        type: 'PLAYER_ACTION',
        payload: { action: selectedAction || 'BET', amount },
      });
      setInputMode('menu');
    },
    [socketClient, selectedAction],
  );

  return {
    localError,
    inputMode,
    betAmount,
    setBetAmount,
    handleActionSelect,
    handleBetSubmit,
  };
}
