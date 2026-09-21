import { useEffect, useRef, useState } from 'react';

export interface DealSequenceInfo {
  readonly dealSequence: number;
  readonly isSubsequentRound: boolean;
  readonly isPlayerCountChanged: boolean;
}

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
