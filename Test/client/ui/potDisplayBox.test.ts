import { describe, expect, test } from 'bun:test';
import {
  formatPotAmount,
  formatStakeAmount,
  getStakeLabel,
} from '../../../src/client/ui/screens/game/PotDisplayBox';

describe('formatPotAmount', () => {
  test('formats zero pot amount correctly', () => {
    const zeroPotAmount = 0;
    const formattedResult = formatPotAmount(zeroPotAmount);
    expect(formattedResult).toBe('$0');
  });

  test('formats hundreds pot amount without commas', () => {
    const hundredsPotAmount = 100;
    const formattedResult = formatPotAmount(hundredsPotAmount);
    expect(formattedResult).toBe('$100');
  });

  test('formats thousands pot amount with commas', () => {
    const thousandsPotAmount = 25000;
    const formattedResult = formatPotAmount(thousandsPotAmount);
    expect(formattedResult).toBe('$25,000');
  });

  test('formats millions pot amount with commas', () => {
    const millionsPotAmount = 1500000;
    const formattedResult = formatPotAmount(millionsPotAmount);
    expect(formattedResult).toBe('$1,500,000');
  });
});

describe('formatStakeAmount', () => {
  test('formats zero stake amount correctly', () => {
    const zeroStakeAmount = 0;
    const formattedResult = formatStakeAmount(zeroStakeAmount);
    expect(formattedResult).toBe('$0');
  });

  test('formats standard stake amount correctly', () => {
    const standardStakeAmount = 50;
    const formattedResult = formatStakeAmount(standardStakeAmount);
    expect(formattedResult).toBe('$50');
  });

  test('formats thousands stake amount with commas', () => {
    const thousandsStakeAmount = 5000;
    const formattedResult = formatStakeAmount(thousandsStakeAmount);
    expect(formattedResult).toBe('$5,000');
  });
});

describe('getStakeLabel', () => {
  test('returns full label for standard stake amount', () => {
    const standardFormattedStake = '$50';
    const labelResult = getStakeLabel(standardFormattedStake);
    expect(labelResult).toBe('CURRENT STAKE · ');
  });

  test('returns full label for hundred stake amount', () => {
    const hundredFormattedStake = '$100';
    const labelResult = getStakeLabel(hundredFormattedStake);
    expect(labelResult).toBe('CURRENT STAKE · ');
  });

  test('returns shortened label for large stake amount to avoid overflow', () => {
    const largeFormattedStake = '$1,000';
    const labelResult = getStakeLabel(largeFormattedStake);
    expect(labelResult).toBe('STAKE · ');
  });
});
