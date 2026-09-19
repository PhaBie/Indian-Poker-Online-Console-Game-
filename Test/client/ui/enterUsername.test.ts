import { describe, it, expect } from 'bun:test';
import {
  sanitizeUsernameInput,
  validateUsernameLength,
  clampUsernameInput,
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
} from '../../../src/client/ui/hooks/useUsernameInput';

describe('useUsernameInput - sanitizeUsernameInput', () => {
  it('should preserve standard alphanumeric nickname without alterations', () => {
    expect(sanitizeUsernameInput('Maverick')).toBe('Maverick');
  });

  it('should trim surrounding whitespace from nickname', () => {
    expect(sanitizeUsernameInput('   Alice   ')).toBe('Alice');
  });

  it('should extract name when prefixed with legacy name command in lowercase', () => {
    expect(sanitizeUsernameInput('name Bob')).toBe('Bob');
  });

  it('should extract name when prefixed with legacy name command in uppercase', () => {
    expect(sanitizeUsernameInput('NAME Charlie')).toBe('Charlie');
  });

  it('should handle whitespace between name prefix and alias', () => {
    expect(sanitizeUsernameInput('name    Dan   ')).toBe('Dan');
  });
});

describe('useUsernameInput - validateUsernameLength', () => {
  it('should fail validation when username is empty string', () => {
    const result = validateUsernameLength('');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Username cannot be empty');
  });

  it('should fail validation when username is under minimum boundary', () => {
    const result = validateUsernameLength('ab');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe(
      `Username must be at least ${MIN_USERNAME_LENGTH} characters`,
    );
  });

  it('should pass validation when username is exactly minimum boundary', () => {
    const result = validateUsernameLength('Ace');
    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBeNull();
  });

  it('should pass validation when username is within optimal range', () => {
    const result = validateUsernameLength('LuckyStrike');
    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBeNull();
  });

  it('should pass validation when username is exactly maximum boundary', () => {
    const result = validateUsernameLength('TwelveLetter');
    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBeNull();
  });

  it('should fail validation when username exceeds maximum boundary', () => {
    const result = validateUsernameLength('ThirteenChars');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe(
      `Username must not exceed ${MAX_USERNAME_LENGTH} characters`,
    );
  });
});

describe('useUsernameInput - clampUsernameInput', () => {
  it('should not truncate string when length is within limit', () => {
    expect(clampUsernameInput('Maverick')).toBe('Maverick');
  });

  it('should truncate string to exactly 12 characters when exceeding limit', () => {
    expect(clampUsernameInput('sdsdsddddsdsdsdssdsdsds')).toBe('sdsdsddddsds');
    expect(clampUsernameInput('sdsdsddddsdsdsdssdsdsds').length).toBe(12);
  });

  it('should account for legacy name prefix when calculating max allowed length', () => {
    expect(clampUsernameInput('name sdsdsddddsdsdsdssdsdsds')).toBe('name sdsdsddddsds');
  });
});

describe('EnterUsernameScreen - Component Module Exports', () => {
  it('should successfully export EnterUsernameScreen component', async () => {
    const module = await import('../../../src/client/ui/screens/EnterUsernameScreen');
    expect(typeof module.EnterUsernameScreen).toBe('function');
  });

  it('should successfully export UsernameCard subcomponent', async () => {
    const module = await import('../../../src/client/ui/screens/username/UsernameCard');
    expect(typeof module.UsernameCard).toBe('function');
  });

  it('should successfully export UsernameInputField subcomponent', async () => {
    const module =
      await import('../../../src/client/ui/screens/username/UsernameInputField');
    expect(typeof module.UsernameInputField).toBe('function');
  });
});
