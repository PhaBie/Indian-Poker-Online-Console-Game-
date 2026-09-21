import type { GameStatePayload } from './types';

type SideshowResult = NonNullable<GameStatePayload['sideshowResult']>;

export function getSideshowPresentationKey(result: SideshowResult): string {
  const cards = Object.entries(result.cards)
    .sort(([firstPlayerId], [secondPlayerId]) =>
      firstPlayerId.localeCompare(secondPlayerId),
    )
    .map(
      ([playerId, hand]) =>
        `${playerId}:${hand.map((card) => `${card.rank}-${card.suit}`).join(',')}`,
    )
    .join('|');

  return [
    result.challengerId,
    result.targetId,
    result.winnerId,
    result.loserId,
    cards,
  ].join('|');
}

export function getVisibleSideshowResult(
  result: SideshowResult | null | undefined,
  dismissedPresentationKey: string | null,
): SideshowResult | null {
  if (!result || getSideshowPresentationKey(result) === dismissedPresentationKey) {
    return null;
  }
  return result;
}
