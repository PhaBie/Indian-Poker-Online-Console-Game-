import { Box, Text } from 'ink';

export interface PotDisplayBoxProps {
  readonly pot: number;
  readonly currentStake: number;
  readonly isAmountVisible?: boolean;
}

export function formatPotAmount(potAmount: number): string {
  return `$${potAmount.toLocaleString()}`;
}

export function formatStakeAmount(stakeAmount: number): string {
  return `$${stakeAmount.toLocaleString()}`;
}

export function getStakeLabel(formattedStake: string): string {
  return formattedStake.length > 4 ? 'STAKE · ' : 'CURRENT STAKE · ';
}

export function PotDisplayBox({
  pot,
  currentStake,
  isAmountVisible = true,
}: PotDisplayBoxProps) {
  const formattedPot = formatPotAmount(pot);
  const formattedStake = formatStakeAmount(currentStake);
  const displayAmount = isAmountVisible ? formattedPot : ' '.repeat(formattedPot.length);

  return (
    <Box
      borderStyle="round"
      borderColor="yellowBright"
      width={19}
      height={5}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Text color="yellowBright" bold>
        TOTAL POT
      </Text>
      <Text color="greenBright" bold>
        {displayAmount}
      </Text>
      <Box flexDirection="row" alignItems="center">
        <Text color="gray">STAKE </Text>
        <Text color="white" bold>
          {formattedStake}
        </Text>
      </Box>
    </Box>
  );
}
