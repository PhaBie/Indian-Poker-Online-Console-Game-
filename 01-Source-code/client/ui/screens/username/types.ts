export interface UsernameInputFieldProps {
  readonly rawInput: string;
  readonly characterCount: number;
  readonly isLengthValid: boolean;
  readonly hasError: boolean;
  readonly onInputChange: (value: string) => void;
  readonly onInputSubmit: (value: string) => void;
}

export interface UsernameStatusMessageProps {
  readonly errorMessage: string | null;
  readonly isLengthValid: boolean;
  readonly characterCount: number;
}

export interface UsernameCardHeaderProps {
  readonly networkMode?: 'LAN' | 'INTERNET';
  readonly intent?: 'create' | 'join' | null;
}

export interface UsernameCardProps {
  readonly paddingX: number;
  readonly rawInput: string;
  readonly characterCount: number;
  readonly isLengthValid: boolean;
  readonly errorMessage: string | null;
  readonly onInputChange: (value: string) => void;
  readonly onInputSubmit: (value: string) => void;
  readonly networkMode?: 'LAN' | 'INTERNET';
  readonly intent?: 'create' | 'join' | null;
}
