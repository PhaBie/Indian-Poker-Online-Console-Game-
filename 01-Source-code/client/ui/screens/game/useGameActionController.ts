import { useState, useCallback } from 'react';
import type { GameActionType } from '../../../../shared/types';
import type { SocketClient } from '../../../network/socketClient';

/**
 * Hook ควบคุมการสั่งการและจัดการสถานะแอคชันของผู้เล่นในเกม (Game Action Controller)
 * จัดการสลับโหมดระหว่าง:
 * - 'menu': เมนูเลือกแอคชันทั่วไปบนหน้าจอ (เช่น CALL, BET, FOLD, SHOW)
 * - 'input_bet': โหมดกรอกจำนวนเงินเดิมพันเพิ่มเติม (ตัวควบคุมรองรับทั้งคำสั่ง BET และ RAISE เพื่อเปิดโหมดนี้)
 * พร้อมทั้งตรวจสอบความถูกต้องของจำนวนเงินก่อนส่งคำสั่ง PLAYER_ACTION ไปยังเซิร์ฟเวอร์
 */
export function useGameActionController(socketClient: SocketClient) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'menu' | 'input_bet'>('menu');
  const [betAmount, setBetAmount] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<GameActionType | null>(null);
  const handleBetChange = useCallback((value: string) => {
    setBetAmount(value.replace(/\D/g, ''));
  }, []);

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

  const cancelBetInput = useCallback(() => {
    setLocalError(null);
    setBetAmount('');
    setSelectedAction(null);
    setInputMode('menu');
  }, []);

  return {
    localError,
    inputMode,
    betAmount,
    handleBetChange,
    handleActionSelect,
    handleBetSubmit,
    cancelBetInput,
  };
}
