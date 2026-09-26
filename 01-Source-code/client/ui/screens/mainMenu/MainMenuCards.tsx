import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { UI_COLORS } from '../../shared/theme/colors';
import { isAnimationEnabled } from '../../shared/components/ShimmeringHeader';

export interface MenuItemDefinition {
  readonly optionId: 'CREATE_ROOM' | 'JOIN_ROOM' | 'EXIT';
  readonly numericChoice: string;
  readonly title: string;
  readonly description: string;
}

export const MENU_CARD_DEFINITIONS: readonly MenuItemDefinition[] = [
  {
    optionId: 'CREATE_ROOM',
    numericChoice: '1',
    title: 'CREATE ROOM',
    description: 'Start a new private game',
  },
  {
    optionId: 'JOIN_ROOM',
    numericChoice: '2',
    title: 'JOIN ROOM',
    description: 'Connect to an existing room',
  },
  {
    optionId: 'EXIT',
    numericChoice: '3',
    title: 'EXIT',
    description: 'Close the application',
  },
];

export function getItemActiveColor(optionId: string): string {
  if (optionId === 'EXIT') {
    return UI_COLORS.activeRed;
  }
  if (optionId === 'JOIN_ROOM') {
    return UI_COLORS.activeBlue;
  }
  return UI_COLORS.activeGreen;
}

function getMenuItemColors(optionId: string, isSelected: boolean, isGliding: boolean) {
  if (!isSelected) {
    return {
      titleColor: UI_COLORS.inactiveTitle,
      descriptionColor: UI_COLORS.inactiveDesc,
      arrowColor: UI_COLORS.inactiveDesc,
    };
  }

  const activeColor = getItemActiveColor(optionId);
  return {
    titleColor: activeColor,
    descriptionColor: UI_COLORS.primaryText,
    arrowColor: isGliding ? UI_COLORS.goldHighlight : activeColor,
  };
}

interface ArrowMotionState {
  readonly glyph: string;
  readonly isGliding: boolean;
}

const ARROW_SPARK_DURATION_MS = 45;
const ARROW_SETTLE_DURATION_MS = 105;

function useArrowMotion(focusedIndex: number): ArrowMotionState {
  const isAnimationActive = isAnimationEnabled();
  const [motionState, setMotionState] = useState<ArrowMotionState>({
    glyph: '>',
    isGliding: false,
  });

  useEffect(() => {
    if (!isAnimationActive) {
      setMotionState({ glyph: '>', isGliding: false });
      return;
    }

    setMotionState({ glyph: '>', isGliding: true });

    const stepOneTimer = setTimeout(() => {
      setMotionState({ glyph: '>>', isGliding: false });
    }, ARROW_SPARK_DURATION_MS);

    const stepTwoTimer = setTimeout(() => {
      setMotionState({ glyph: '>', isGliding: false });
    }, ARROW_SETTLE_DURATION_MS);

    return () => {
      clearTimeout(stepOneTimer);
      clearTimeout(stepTwoTimer);
    };
  }, [focusedIndex, isAnimationActive]);

  return motionState;
}

interface MenuRowItemProps {
  readonly item: MenuItemDefinition;
  readonly isSelected: boolean;
  readonly isSubmitting: boolean;
  readonly isGliding: boolean;
  readonly isLastItem: boolean;
  readonly arrowGlyph: string;
  readonly arrowWidth: number;
  readonly titleWidth: number;
  readonly transitionStatusText: string | null;
}

function MenuRowItem({
  item,
  isSelected,
  isSubmitting,
  isGliding,
  isLastItem,
  arrowGlyph,
  arrowWidth,
  titleWidth,
  transitionStatusText,
}: MenuRowItemProps) {
  const { titleColor, descriptionColor, arrowColor } = getMenuItemColors(
    item.optionId,
    isSelected,
    isGliding,
  );

  const displayedArrow = isSelected
    ? arrowGlyph.padEnd(arrowWidth, ' ')
    : ' '.repeat(arrowWidth);

  return (
    <Box flexDirection="row" alignItems="center" marginBottom={isLastItem ? 0 : 1}>
      <Box width={arrowWidth}>
        <Text bold={isSelected} color={arrowColor}>
          {displayedArrow}
        </Text>
      </Box>

      <Box width={titleWidth}>
        <Text bold={isSelected} color={titleColor}>
          {item.title}
        </Text>
      </Box>

      <Box>
        <Text color={descriptionColor}>
          {isSelected && isSubmitting
            ? `${transitionStatusText ?? 'Opening...'}`
            : item.description}
        </Text>
      </Box>
    </Box>
  );
}

export interface MainMenuCardsProps {
  readonly focusedIndex: number;
  readonly containerWidth?: number;
  readonly isSubmitting?: boolean;
  readonly transitionStatusText?: string | null;
}

export function MainMenuCards({
  focusedIndex,
  containerWidth = 66,
  isSubmitting = false,
  transitionStatusText = null,
}: MainMenuCardsProps) {
  const { glyph, isGliding } = useArrowMotion(focusedIndex);
  const isWideMode = containerWidth >= 88;
  const paddingX = isWideMode ? 5 : 3;
  const arrowWidth = isWideMode ? 5 : 4;
  const titleWidth = isWideMode ? 20 : 16;

  return (
    <Box
      width="100%"
      borderStyle="round"
      borderColor={UI_COLORS.menuBorder}
      flexDirection="column"
      paddingX={paddingX}
      paddingY={1}
      marginY={0}
    >
      {MENU_CARD_DEFINITIONS.map((menuItem, itemIndex) => {
        const isSelected = focusedIndex === itemIndex;
        const isLastItem = itemIndex === MENU_CARD_DEFINITIONS.length - 1;
        return (
          <MenuRowItem
            key={menuItem.optionId}
            item={menuItem}
            isSelected={isSelected}
            isSubmitting={isSubmitting}
            isGliding={isGliding}
            isLastItem={isLastItem}
            arrowGlyph={glyph}
            arrowWidth={arrowWidth}
            titleWidth={titleWidth}
            transitionStatusText={transitionStatusText}
          />
        );
      })}
    </Box>
  );
}
