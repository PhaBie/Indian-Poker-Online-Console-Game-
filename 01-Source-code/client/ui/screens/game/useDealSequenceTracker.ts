import { useEffect, useRef, useState } from 'react';

export interface DealSequenceInfo {
  readonly dealSequence: number;
  readonly isSubsequentRound: boolean;
  readonly isPlayerCountChanged: boolean;
}

/**
 * Hook สำหรับติดตามลำดับรอบการแจกไพ่ (Deal Sequence Tracker)
 * ตรวจจับการเปลี่ยนผ่านจากรอบที่จบไปสู่รอบใหม่ เพื่อเพิ่มลำดับรอบ (Sequence Number)
 * และตรวจสอบว่ามีจำนวนผู้เล่นเปลี่ยนแปลงไปหรือไม่ เพื่อใช้ควบคุมแอนิเมชันการแจกไพ่
 */
export function useDealSequenceTracker(
  isRoundEnded: boolean,
  playerCount: number = 2,
): DealSequenceInfo {
  const wasRoundEndedRef = useRef(isRoundEnded);
  const previousPlayerCountRef = useRef(playerCount);
  const [dealSequence, setDealSequence] = useState(1);
  const [isPlayerCountChanged, setIsPlayerCountChanged] = useState(false);

  useEffect(() => {
    if (wasRoundEndedRef.current && !isRoundEnded) {
      setDealSequence((previousSequence) => previousSequence + 1);
      const hasCountChanged = playerCount !== previousPlayerCountRef.current;
      setIsPlayerCountChanged(hasCountChanged);
      previousPlayerCountRef.current = playerCount;
    }
    wasRoundEndedRef.current = isRoundEnded;
  }, [isRoundEnded, playerCount]);

  return {
    dealSequence,
    isSubsequentRound: dealSequence > 1,
    isPlayerCountChanged,
  };
}
