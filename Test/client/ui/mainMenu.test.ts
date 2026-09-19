import { expect, test, describe } from 'bun:test';
import {
  parseMainMenuChoice,
  determineNextFocus,
  getGameContainerWidth,
} from '../../../src/client/ui/screens/MainMenuScreen';
import { UI_COLORS } from '../../../src/client/ui/theme/colors';
import {
  calculateShimmerColor,
  buildBrandTitleCharacters,
  CASINO_SUIT_SYMBOLS,
  isAnimationEnabled,
  APP_VERSION,
  FULL_HEADER_TITLE,
} from '../../../src/client/ui/components/ShimmeringHeader';

import {
  MENU_CARD_DEFINITIONS,
  getItemActiveColor,
} from '../../../src/client/ui/components/MainMenuCards';
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

    test('[UI Theme Tokens] 11.5 theme tokens and TUI color palette values are fully defined', () => {
      expect(UI_COLORS.goldBorder).toBe('#D8AD4A');
      expect(UI_COLORS.menuBorder).toBe('#8C743D');
      expect(UI_COLORS.activeGreen).toBe('#4CAF50');
      expect(UI_COLORS.activeBlue).toBe('#29B6F6');
      expect(UI_COLORS.activeRed).toBe('#EF5350');
      expect(UI_COLORS.logoTeen).toBe('#EF5350');
      expect(UI_COLORS.logoPatti).toBe('#4CAF50');
      expect(UI_COLORS.primaryText).toBe('#D7D7D7');
      expect(UI_COLORS.mutedText).toBe('#777777');
      expect(UI_COLORS.inactiveTitle).toBe('#BDBDBD');
      expect(UI_COLORS.inactiveDesc).toBe('#666666');
    });

    test('[MENU_CARD_DEFINITIONS] 11.6 command menu items contain accurate titles, descriptions, and option IDs', () => {
      expect(MENU_CARD_DEFINITIONS.length).toBe(3);

      const createRoomItem = MENU_CARD_DEFINITIONS[0];
      expect(createRoomItem.optionId).toBe('CREATE_ROOM');
      expect(createRoomItem.numericChoice).toBe('1');
      expect(createRoomItem.title).toBe('CREATE ROOM');
      expect(createRoomItem.description).toBe('Start a new private game');

      const joinRoomItem = MENU_CARD_DEFINITIONS[1];
      expect(joinRoomItem.optionId).toBe('JOIN_ROOM');
      expect(joinRoomItem.numericChoice).toBe('2');
      expect(joinRoomItem.title).toBe('JOIN ROOM');
      expect(joinRoomItem.description).toBe('Connect to an existing room');

      const exitItem = MENU_CARD_DEFINITIONS[2];
      expect(exitItem.optionId).toBe('EXIT');
      expect(exitItem.numericChoice).toBe('3');
      expect(exitItem.title).toBe('EXIT');
      expect(exitItem.description).toBe('Close the application');
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

    test('[buildBrandTitleCharacters] 11.9 generates brand header character items with colors', () => {
      const characterList = buildBrandTitleCharacters();
      const combinedTitleText = characterList.map((item) => item.char).join('');

      expect(combinedTitleText).toContain('TEEN PATTI - MAIN MENU');
      expect(CASINO_SUIT_SYMBOLS.spade).toBe('♠');
      expect(CASINO_SUIT_SYMBOLS.heart).toBe('♥');
    });

    test('[calculateShimmerColor] 11.10 shimmer distance calculations return appropriate color stops', () => {
      const zeroDistanceColor = calculateShimmerColor(5, 5, '#FFA000');
      const oneDistanceColor = calculateShimmerColor(4, 5, '#FFA000');
      const farDistanceColor = calculateShimmerColor(0, 10, '#FF5722');

      expect(zeroDistanceColor).toBe('#FFFFFF');
      expect(oneDistanceColor).toBe('#FFF9C4');
      expect(farDistanceColor).toBe('#FF5722');
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

    test('[APP_VERSION] 11.21 application version constant matches v0.1.0', () => {
      expect(APP_VERSION).toBe('v0.1.0');
    });

    test('[FULL_HEADER_TITLE] 11.22 full header title text matches TEEN PATTI - MAIN MENU', () => {
      expect(FULL_HEADER_TITLE).toBe('TEEN PATTI - MAIN MENU');
    });

    test('[isAnimationEnabled] 11.23 animation toggle returns boolean', () => {
      expect(typeof isAnimationEnabled()).toBe('boolean');
    });

    test('[getItemActiveColor] 11.24 returns emerald green for CREATE_ROOM, sky blue for JOIN_ROOM, and red for EXIT', () => {
      const createRoomColor = getItemActiveColor('CREATE_ROOM');
      const joinRoomColor = getItemActiveColor('JOIN_ROOM');
      const exitColor = getItemActiveColor('EXIT');

      expect(createRoomColor).toBe(UI_COLORS.activeGreen);
      expect(joinRoomColor).toBe(UI_COLORS.activeBlue);
      expect(exitColor).toBe(UI_COLORS.activeRed);
      expect(joinRoomColor).not.toBe(createRoomColor);
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
