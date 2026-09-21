import { useEffect, useRef, useState } from 'react';

export interface DealSequenceInfo {
  readonly dealSequence: number;
  readonly isSubsequentRound: boolean;
}

export function useDealSequenceTracker(isRoundEnded: boolean): DealSequenceInfo {
  const wasRoundEndedRef = useRef(isRoundEnded);
  const [dealSequence, setDealSequence] = useState(1);

  useEffect(() => {
    if (wasRoundEndedRef.current && !isRoundEnded) {
      setDealSequence((previousSequence) => previousSequence + 1);
    }
    wasRoundEndedRef.current = isRoundEnded;
  }, [isRoundEnded]);

  return {
    dealSequence,
    isSubsequentRound: dealSequence > 1,
  };
}
