import { useState, useCallback } from 'react';
import { useInput } from 'ink';
import { GAME_CONSTANTS } from '../../../shared/constants';

export const MIN_USERNAME_LENGTH = GAME_CONSTANTS.MIN_USERNAME_LENGTH;
export const MAX_USERNAME_LENGTH = GAME_CONSTANTS.MAX_USERNAME_LENGTH;

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errorMessage: string | null;
}

export function sanitizeUsernameInput(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (trimmed.toLowerCase().startsWith('name ')) {
    return trimmed.substring(5).trim();
  }
  return trimmed;
}

export function clampUsernameInput(
  rawInput: string,
  maxLength: number = MAX_USERNAME_LENGTH,
): string {
  const isLegacyPrefix = rawInput.toLowerCase().startsWith('name ');
  const maxAllowedLength = isLegacyPrefix ? 5 + maxLength : maxLength;
  return rawInput.length > maxAllowedLength
    ? rawInput.slice(0, maxAllowedLength)
    : rawInput;
}

export function validateUsernameLength(username: string): ValidationResult {
  if (username.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Username cannot be empty',
    };
  }
  if (username.length < MIN_USERNAME_LENGTH) {
    return {
      isValid: false,
      errorMessage: `Username must be at least ${MIN_USERNAME_LENGTH} characters`,
    };
  }
  if (username.length > MAX_USERNAME_LENGTH) {
    return {
      isValid: false,
      errorMessage: `Username must not exceed ${MAX_USERNAME_LENGTH} characters`,
    };
  }
  return {
    isValid: true,
    errorMessage: null,
  };
}

export interface UseUsernameInputParams {
  readonly onSubmit: (username: string) => void;
  readonly onBack?: () => void;
  readonly initialValue?: string;
}

function resolveSubmitError(submitError: unknown): string {
  if (submitError instanceof Error) {
    return submitError.message;
  }
  return 'Failed to connect to server';
}

export function useUsernameInput({ onSubmit, onBack, initialValue = '' }: UseUsernameInputParams) {
  const [rawInput, setRawInput] = useState<string>(initialValue);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sanitizedName = sanitizeUsernameInput(rawInput);
  const characterCount = sanitizedName.length;
  const isLengthValid =
    characterCount >= MIN_USERNAME_LENGTH && characterCount <= MAX_USERNAME_LENGTH;

  useInput((_, key) => {
    if (key.escape && onBack) {
      onBack();
    }
  });

  const handleInputChange = useCallback((value: string) => {
    const clamped = clampUsernameInput(value);
    setRawInput(clamped);
    setErrorMessage(null);
  }, []);

  const handleInputSubmit = useCallback(
    (_submittedValue: string) => {
      const finalName = sanitizeUsernameInput(rawInput);
      const validation = validateUsernameLength(finalName);

      if (!validation.isValid) {
        setErrorMessage(validation.errorMessage);
        return;
      }

      try {
        setErrorMessage(null);
        onSubmit(finalName);
      } catch (submitError: unknown) {
        setErrorMessage(resolveSubmitError(submitError));
      }
    },
    [rawInput, onSubmit],
  );

  return {
    rawInput,
    sanitizedName,
    characterCount,
    isLengthValid,
    errorMessage,
    handleInputChange,
    handleInputSubmit,
  };
}
