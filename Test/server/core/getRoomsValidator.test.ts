import { describe, expect, test } from 'bun:test';
import { Validator } from '../../../src/server/utils/validator';

describe('Validator - GET_ROOMS event validation', () => {
  const validator = new Validator();

  test('validates GET_ROOMS event object successfully', () => {
    const validEvent = { type: 'GET_ROOMS' };
    const result = validator.validateClientEvent(validEvent);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('GET_ROOMS');
  });

  test('validates GET_ROOMS json string successfully', () => {
    const jsonString = JSON.stringify({ type: 'GET_ROOMS' });
    const result = validator.validateClientEvent(jsonString);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('GET_ROOMS');
  });

  test('rejects GET_ROOMS event with unexpected extra payload', () => {
    const invalidEvent = { type: 'GET_ROOMS', extra: 123 };
    const result = validator.validateClientEvent(invalidEvent);
    expect(result).not.toBeNull();
  });
});
