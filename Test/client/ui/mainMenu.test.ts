import { expect, test, describe } from 'bun:test';
import {
  parseMainMenuChoice,
  determineNextFocus,
  getGameContainerWidth,
} from '../../../src/client/ui/screens/MainMenuScreen';

import { MENU_CARD_DEFINITIONS } from '../../../src/client/ui/components/MainMenuCards';
import { getTerminalDimensions } from '../../../src/client/ui/hooks/useTerminalSize';
import {
  isTerminalSizeSufficient,
  isTerminalSizeOptimal,
  getTerminalSizeStatus,
  MIN_TERMINAL_COLUMNS,
  MAX_TERMINAL_COLUMNS,
  MIN_TERMINAL_ROWS,
  MAX_TERMINAL_ROWS,
} from '../../../src/client/ui/components/ScreenSizeGuard';

describe('11. Main Menu UI', () => {
  describe('Happy Paths', () => {
    test('[parseMainMenuChoice] 11.1 entering numeric choice 1 returns CREATE_ROOM option', () => {
      const selectedOption = parseMainMenuChoice('1');
      expect(selectedOption).toBe('CREATE_ROOM');
    });

    test('[parseMainMenuChoice] 11.2 entering numeric choice 2 returns JOIN_ROOM option', () => {
      const selectedOption = parseMainMenuChoice('2');
      expect(selectedOption).toBe('JOIN_ROOM');
    });

    test('[parseMainMenuChoice] 11.3 entering numeric choice 3 returns EXIT option', () => {
      const selectedOption = parseMainMenuChoice('3');
      expect(selectedOption).toBe('EXIT');
    });

    test('[parseMainMenuChoice] 11.4 input with leading or trailing whitespace trims and resolves valid option', () => {
      const optionWithLeadingWhitespace = parseMainMenuChoice('  1  ');
      const optionWithTrailingWhitespace = parseMainMenuChoice(' 2\n');
      const optionWithTabWhitespace = parseMainMenuChoice('\t3\t');

      expect(optionWithLeadingWhitespace).toBe('CREATE_ROOM');
      expect(optionWithTrailingWhitespace).toBe('JOIN_ROOM');
      expect(optionWithTabWhitespace).toBe('EXIT');
    });

    test('[MENU_CARD_DEFINITIONS] 11.6 command menu items map numeric choices to option IDs', () => {
      expect(MENU_CARD_DEFINITIONS.length).toBe(3);

      const createRoomItem = MENU_CARD_DEFINITIONS[0];
      expect(createRoomItem.optionId).toBe('CREATE_ROOM');
      expect(createRoomItem.numericChoice).toBe('1');

      const joinRoomItem = MENU_CARD_DEFINITIONS[1];
      expect(joinRoomItem.optionId).toBe('JOIN_ROOM');
      expect(joinRoomItem.numericChoice).toBe('2');

      const exitItem = MENU_CARD_DEFINITIONS[2];
      expect(exitItem.optionId).toBe('EXIT');
      expect(exitItem.numericChoice).toBe('3');
    });

    test('[determineNextFocus] 11.7 navigating forward increments focus index and loops back to 0', () => {
      const fromZeroToNext = determineNextFocus(0, 'NEXT');
      const fromOneToNext = determineNextFocus(1, 'NEXT');
      const fromTwoToNext = determineNextFocus(2, 'NEXT');

      expect(fromZeroToNext).toBe(1);
      expect(fromOneToNext).toBe(2);
      expect(fromTwoToNext).toBe(0);
    });

    test('[determineNextFocus] 11.8 navigating backward decrements focus index and loops back to 2', () => {
      const fromZeroToPrevious = determineNextFocus(0, 'PREVIOUS');
      const fromTwoToPrevious = determineNextFocus(2, 'PREVIOUS');
      const fromOneToPrevious = determineNextFocus(1, 'PREVIOUS');

      expect(fromZeroToPrevious).toBe(2);
      expect(fromTwoToPrevious).toBe(1);
      expect(fromOneToPrevious).toBe(0);
    });
  });

  describe('Unhappy Paths & Boundary Checks', () => {
    test('[parseMainMenuChoice] 11.11 numeric inputs outside 1-3 range return null', () => {
      const optionZero = parseMainMenuChoice('0');
      const optionFour = parseMainMenuChoice('4');
      const optionNegative = parseMainMenuChoice('-1');

      expect(optionZero).toBeNull();
      expect(optionFour).toBeNull();
      expect(optionNegative).toBeNull();
    });

    test('[parseMainMenuChoice] 11.12 alphabetic and symbolic non-numeric strings return null', () => {
      const textChoice = parseMainMenuChoice('create');
      const symbolChoice = parseMainMenuChoice('@#$');

      expect(textChoice).toBeNull();
      expect(symbolChoice).toBeNull();
    });

    test('[parseMainMenuChoice] 11.13 empty string or whitespace-only inputs return null', () => {
      const emptyInput = parseMainMenuChoice('');
      const whitespaceOnlyInput = parseMainMenuChoice('    ');

      expect(emptyInput).toBeNull();
      expect(whitespaceOnlyInput).toBeNull();
    });

    test('[getTerminalDimensions] 11.14 retrieves terminal columns and rows as positive numbers', () => {
      const dimensions = getTerminalDimensions();
      expect(dimensions.columns).toBeGreaterThan(0);
      expect(dimensions.rows).toBeGreaterThan(0);
    });

    test('[isTerminalSizeSufficient] 11.15 exact minimum boundary dimensions 80x24 returns true', () => {
      const isExactBoundaryValid = isTerminalSizeSufficient(80, 24);
      expect(isExactBoundaryValid).toBe(true);
    });

    test('[isTerminalSizeSufficient] 11.16 dimensions larger than boundary 81x24 and 80x25 return true', () => {
      const isOneColumnAboveValid = isTerminalSizeSufficient(81, 24);
      const isOneRowAboveValid = isTerminalSizeSufficient(80, 25);
      const isWidescreenValid = isTerminalSizeSufficient(120, 40);

      expect(isOneColumnAboveValid).toBe(true);
      expect(isOneRowAboveValid).toBe(true);
      expect(isWidescreenValid).toBe(true);
    });

    test('[isTerminalSizeSufficient] 11.17 terminal width 79 columns below boundary 80 returns false', () => {
      const isColumnTooNarrow = isTerminalSizeSufficient(79, 24);
      expect(isColumnTooNarrow).toBe(false);
    });

    test('[isTerminalSizeSufficient] 11.18 terminal height 23 rows below boundary 24 returns false', () => {
      const isRowTooShort = isTerminalSizeSufficient(80, 23);
      expect(isRowTooShort).toBe(false);
    });

    test('[isTerminalSizeSufficient] 11.19 both width and height below boundary returns false', () => {
      const isBothTooSmall = isTerminalSizeSufficient(79, 23);
      const isTinyWindow = isTerminalSizeSufficient(60, 15);

      expect(isBothTooSmall).toBe(false);
      expect(isTinyWindow).toBe(false);
    });

    test('[getGameContainerWidth] 11.20 responsive widths scale across compact, standard, and wide breakpoints', () => {
      expect(getGameContainerWidth(80)).toBe(66);
      expect(getGameContainerWidth(120)).toBe(66);
      expect(getGameContainerWidth(160)).toBe(70);
      expect(getGameContainerWidth(200)).toBe(88);
      expect(getGameContainerWidth(220)).toBe(92);
      expect(getGameContainerWidth(300)).toBe(92);
    });

    test('[getTerminalSizeStatus] 11.25 dimensions within standard boundary return OPTIMAL', () => {
      const minBoundaryStatus = getTerminalSizeStatus(
        MIN_TERMINAL_COLUMNS,
        MIN_TERMINAL_ROWS,
      );
      const maxBoundaryStatus = getTerminalSizeStatus(
        MAX_TERMINAL_COLUMNS,
        MAX_TERMINAL_ROWS,
      );
      const standardDesktopStatus = getTerminalSizeStatus(120, 30);

      expect(minBoundaryStatus).toBe('OPTIMAL');
      expect(maxBoundaryStatus).toBe('OPTIMAL');
      expect(standardDesktopStatus).toBe('OPTIMAL');
    });

    test('[getTerminalSizeStatus] 11.26 dimensions below minimum return TOO_SMALL', () => {
      const narrowWidthStatus = getTerminalSizeStatus(79, 24);
      const shortHeightStatus = getTerminalSizeStatus(80, 23);
      const bothUnderBoundaryStatus = getTerminalSizeStatus(60, 15);

      expect(narrowWidthStatus).toBe('TOO_SMALL');
      expect(shortHeightStatus).toBe('TOO_SMALL');
      expect(bothUnderBoundaryStatus).toBe('TOO_SMALL');
    });

    test('[getTerminalSizeStatus] 11.27 dimensions exceeding maximum return TOO_LARGE', () => {
      const excessiveWidthStatus = getTerminalSizeStatus(221, 30);
      const excessiveHeightStatus = getTerminalSizeStatus(120, 56);
      const ultraWideZoomedOutStatus = getTerminalSizeStatus(300, 80);

      expect(excessiveWidthStatus).toBe('TOO_LARGE');
      expect(excessiveHeightStatus).toBe('TOO_LARGE');
      expect(ultraWideZoomedOutStatus).toBe('TOO_LARGE');
    });

    test('[isTerminalSizeOptimal] 11.28 validates whether terminal size is within acceptable zoom levels', () => {
      const isValidSize = isTerminalSizeOptimal(120, 30);
      const isTooSmallSizeValid = isTerminalSizeOptimal(70, 20);
      const isTooLargeSizeValid = isTerminalSizeOptimal(250, 60);

      expect(isValidSize).toBe(true);
      expect(isTooSmallSizeValid).toBe(false);
      expect(isTooLargeSizeValid).toBe(false);
    });
  });
});
