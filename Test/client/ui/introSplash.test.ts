import { expect, test, describe } from 'bun:test';
import {
  calculateDealSequence,
  ROYAL_TRAIL_CARDS,
  INTRO_DEAL_DELAY_MS,
} from '../../../src/client/ui/components/GameIntroSplash';
import { UI_COLORS } from '../../../src/client/ui/theme/colors';

describe('12. Game Intro Card Deal Opening', () => {
  describe('Royal Trail Cards Definition', () => {
    test('[ROYAL_TRAIL_CARDS] defines exactly three cards matching Teen Patti trio A-K-Q', () => {
      expect(ROYAL_TRAIL_CARDS.length).toBe(3);

      const firstCard = ROYAL_TRAIL_CARDS[0];
      const secondCard = ROYAL_TRAIL_CARDS[1];
      const thirdCard = ROYAL_TRAIL_CARDS[2];

      expect(firstCard.rank).toBe('A');
      expect(firstCard.suit).toBe('♠');
      expect(firstCard.color).toBe(UI_COLORS.suitSpade);

      expect(secondCard.rank).toBe('K');
      expect(secondCard.suit).toBe('♥');
      expect(secondCard.color).toBe(UI_COLORS.suitHeart);

      expect(thirdCard.rank).toBe('Q');
      expect(thirdCard.suit).toBe('♦');
      expect(thirdCard.color).toBe(UI_COLORS.suitDiamond);
    });

    test('[INTRO_DEAL_DELAY_MS] total sequence duration is set to 1200ms', () => {
      expect(INTRO_DEAL_DELAY_MS).toBe(1200);
    });
  });

  describe('Smooth Deal & Flip Sequence Timeline', () => {
    test('[calculateDealSequence] initial 0-180ms deals first card face-down', () => {
      const state = calculateDealSequence(50);
      expect(state.visibleCardCount).toBe(1);
      expect(state.flippedCardCount).toBe(0);
      expect(state.isTitleVisible).toBe(false);
      expect(state.isSubtitleVisible).toBe(false);
    });

    test('[calculateDealSequence] 180-360ms flips first card and deals second card face-down', () => {
      const state = calculateDealSequence(200);
      expect(state.visibleCardCount).toBe(2);
      expect(state.flippedCardCount).toBe(1);
      expect(state.isTitleVisible).toBe(false);
      expect(state.isSubtitleVisible).toBe(false);
    });

    test('[calculateDealSequence] 360-540ms flips second card and deals third card face-down', () => {
      const state = calculateDealSequence(400);
      expect(state.visibleCardCount).toBe(3);
      expect(state.flippedCardCount).toBe(2);
      expect(state.isTitleVisible).toBe(false);
      expect(state.isSubtitleVisible).toBe(false);
    });

    test('[calculateDealSequence] 540-720ms flips third card revealing full royal trail', () => {
      const state = calculateDealSequence(600);
      expect(state.visibleCardCount).toBe(3);
      expect(state.flippedCardCount).toBe(3);
      expect(state.isTitleVisible).toBe(false);
      expect(state.isSubtitleVisible).toBe(false);
    });

    test('[calculateDealSequence] 720-920ms illuminates brand title with subtitle hidden', () => {
      const state = calculateDealSequence(800);
      expect(state.visibleCardCount).toBe(3);
      expect(state.flippedCardCount).toBe(3);
      expect(state.isTitleVisible).toBe(true);
      expect(state.isSubtitleVisible).toBe(false);
    });

    test('[calculateDealSequence] 920ms onwards reveals subtitle with full hierarchy', () => {
      const state = calculateDealSequence(1000);
      expect(state.visibleCardCount).toBe(3);
      expect(state.flippedCardCount).toBe(3);
      expect(state.isTitleVisible).toBe(true);
      expect(state.isSubtitleVisible).toBe(true);
    });
  });
});
