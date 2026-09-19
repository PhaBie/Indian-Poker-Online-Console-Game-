import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { ShimmeringHeader } from '../components/ShimmeringHeader';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { getGameContainerWidth } from './MainMenuScreen';
import {
  getTerminalSizeStatus,
  TerminalOutOfRangeScreen,
} from '../components/ScreenSizeGuard';
import { UI_COLORS } from '../theme/colors';

export interface JoinRoomScreenProps {
  onBack: () => void;
  onJoinSubmit: (method: 'LAN' | 'INTERNET', target: string) => void;
  serverError?: string | null;
}

type JoinMethod = 'LAN' | 'INTERNET';

interface JoinMethodOptionProps {
  readonly number: string;
  readonly title: string;
  readonly detail: string;
  readonly color: string;
  readonly isSelected: boolean;
}

function JoinMethodOption({
  number,
  title,
  detail,
  color,
  isSelected,
}: JoinMethodOptionProps) {
  return (
    <Box flexDirection="row" alignItems="center">
      <Box width={4}>
        <Text bold={isSelected} color={isSelected ? color : UI_COLORS.mutedText}>
          {isSelected ? '❯' : ' '}
        </Text>
      </Box>
      <Box width={18}>
        <Text bold={isSelected} color={isSelected ? color : UI_COLORS.inactiveTitle}>
          [{number}] {title}
        </Text>
      </Box>
      <Text color={isSelected ? UI_COLORS.primaryText : UI_COLORS.inactiveDesc}>
        {detail}
      </Text>
    </Box>
  );
}

function JoinMethodStep({ selectedNetwork }: { readonly selectedNetwork: 1 | 2 }) {
  return (
    <Box flexDirection="column" alignItems="center">
      <Box flexDirection="column" width={46} alignItems="center">
        <Text color={UI_COLORS.mutedText}>Select connection mode to join a room</Text>
        <Box flexDirection="column" marginTop={2} marginBottom={1} width={46}>
          <JoinMethodOption
            number="1"
            title="LAN Mode"
            detail="Local WiFi (Host IPv4)"
            color={UI_COLORS.activeGreen}
            isSelected={selectedNetwork === 1}
          />
          <Box marginTop={1}>
            <JoinMethodOption
              number="2"
              title="Online Mode"
              detail="Internet (Room Code)"
              color={UI_COLORS.activeBlue}
              isSelected={selectedNetwork === 2}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function selectJoinMethod(
  selected: 1 | 2,
  setSelectedNetwork: (value: 1 | 2) => void,
  setMethod: (value: JoinMethod) => void,
  setStep: (value: 1 | 2) => void,
  setInput: (value: string) => void,
  setError: (value: string) => void,
  onJoinSubmit: (method: JoinMethod, target: string) => void,
) {
  const selectedMethod: JoinMethod = selected === 1 ? 'LAN' : 'INTERNET';
  setSelectedNetwork(selected);
  setMethod(selectedMethod);
  setError('');

  if (selectedMethod === 'LAN') {
    onJoinSubmit('LAN', '');
    return;
  }

  setStep(2);
  setInput('join ');
}

function JoinInputStep({
  method,
  input,
  error,
  serverError,
  onChange,
  onSubmit,
}: {
  readonly method: JoinMethod;
  readonly input: string;
  readonly error: string;
  readonly serverError?: string | null;
  readonly onChange: (value: string) => void;
  readonly onSubmit: (value: string) => void;
}) {
  const isLan = method === 'LAN';
  const errorMessage = error || serverError;

  return (
    <Box flexDirection="column" alignItems="center">
      <Box width={54} flexDirection="column">
        <Box flexDirection="row" alignItems="center" marginBottom={1}>
          <Text bold color={isLan ? UI_COLORS.activeGreen : UI_COLORS.activeBlue}>
            {isLan ? '[ LAN MODE ]' : '[ ONLINE MODE ]'}
          </Text>
          <Text color={UI_COLORS.dimText}>  •  </Text>
          <Text color={UI_COLORS.primaryText}>
            {isLan ? 'Connect to a host' : 'Enter a room code'}
          </Text>
        </Box>

        <Text color={UI_COLORS.mutedText}>
          {isLan
            ? 'Enter the host IPv4 address and port below.'
            : 'Enter the 6-character code shared by the host.'}
        </Text>

        <Box marginTop={2} flexDirection="column">
          <Text color={UI_COLORS.dimText}>
            Format:{' '}
            <Text color={UI_COLORS.goldHighlight}>
              {isLan ? 'connect <ip>:<port>' : 'join <code>'}
            </Text>
          </Text>
          <Text color={UI_COLORS.inactiveDesc}>
            Example: {isLan ? 'connect 192.168.1.10:8080' : 'join A1B2C9'}
          </Text>
        </Box>

        {errorMessage ? (
          <Box marginTop={2}>
            <Text bold color={UI_COLORS.errorRed}>✕ {errorMessage}</Text>
          </Box>
        ) : null}
      </Box>

      <Box
        width={54}
        borderStyle="round"
        borderColor={isLan ? UI_COLORS.activeGreen : UI_COLORS.activeBlue}
        paddingX={2}
        marginTop={2}
      >
        <Text bold color={UI_COLORS.goldHighlight}>$ </Text>
        <TextInput value={input} onChange={onChange} onSubmit={onSubmit} />
      </Box>
    </Box>
  );
}

function JoinRoomHelpFooter({ isInputStep }: { readonly isInputStep: boolean }) {
  return (
    <Box justifyContent="center" marginTop={1} gap={1}>
      {!isInputStep && (
        <>
          <Text color={UI_COLORS.mutedText}>
            <Text bold color={UI_COLORS.goldBorder}>UP/DOWN</Text> Navigate
          </Text>
          <Text color={UI_COLORS.mutedText}>•</Text>
          <Text color={UI_COLORS.mutedText}>
            <Text bold color={UI_COLORS.goldBorder}>ENTER</Text> Select
          </Text>
        </>
      )}
      {isInputStep && (
        <Text color={UI_COLORS.mutedText}>
          <Text bold color={UI_COLORS.goldBorder}>ENTER</Text> Join
        </Text>
      )}
      <Text color={UI_COLORS.mutedText}>•</Text>
      <Text color={UI_COLORS.mutedText}>
        <Text bold color={UI_COLORS.goldBorder}>ESC</Text> Back
      </Text>
    </Box>
  );
}

export function JoinRoomScreen({ onBack, onJoinSubmit, serverError }: JoinRoomScreenProps) {
  const { columns, rows } = useTerminalSize();
  const [step, setStep] = useState<1 | 2>(1);
  const [method, setMethod] = useState<JoinMethod>('LAN');
  const [input, setInput] = useState('connect ');
  const [error, setError] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<1 | 2>(1);

  useInput((inputKey, key) => {
    if (key.escape) {
      if (step === 2) {
        setStep(1);
        setError('');
      } else {
        onBack();
      }
      return;
    }

    if (step !== 1) return;

    if (key.upArrow || key.downArrow) {
      setSelectedNetwork((previous) => (previous === 1 ? 2 : 1));
    } else if (key.return || inputKey === '1' || inputKey === '2') {
      const selected = inputKey === '2' ? 2 : inputKey === '1' ? 1 : selectedNetwork;
      selectJoinMethod(
        selected,
        setSelectedNetwork,
        setMethod,
        setStep,
        setInput,
        setError,
        onJoinSubmit,
      );
    }
  });

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    const command = method === 'LAN' ? 'connect ' : 'join ';

    if (!trimmed.toLowerCase().startsWith(command)) {
      setError(
        `Invalid command. Use: ${command}<${method === 'LAN' ? 'ip>:<port' : 'code'}>`,
      );
      return;
    }

    const target = trimmed.substring(command.length).trim();
    if (!target) {
      setError(method === 'LAN' ? 'Host IP and port are required.' : 'Room code is required.');
      return;
    }
    if (method === 'INTERNET' && target.length !== 6) {
      setError('Room code must be exactly 6 characters.');
      return;
    }

    onJoinSubmit(method, method === 'INTERNET' ? target.toUpperCase() : target);
  };

  const sizeStatus = getTerminalSizeStatus(columns, rows);
  if (sizeStatus !== 'OPTIMAL') {
    return (
      <TerminalOutOfRangeScreen
        currentColumns={columns}
        currentRows={rows}
        status={sizeStatus}
        onExit={onBack}
      />
    );
  }

  const containerWidth = getGameContainerWidth(columns);

  return (
    <Box
      flexDirection="column"
      width="100%"
      height={rows}
      alignItems="center"
      justifyContent="center"
    >
      <Box width={containerWidth} flexDirection="column">
        <ShimmeringHeader containerWidth={containerWidth} pageTitle="JOIN ROOM" />
        <Box
          width="100%"
          borderStyle="round"
          borderColor={UI_COLORS.goldBorder}
          flexDirection="column"
          justifyContent="center"
          paddingX={3}
          paddingY={1}
        >
          {step === 1 ? (
            <JoinMethodStep selectedNetwork={selectedNetwork} />
          ) : (
            <JoinInputStep
              method={method}
              input={input}
              error={error}
              serverError={serverError}
              onChange={(value) => {
                setInput(value);
                setError('');
              }}
              onSubmit={handleSubmit}
            />
          )}
        </Box>
        <JoinRoomHelpFooter isInputStep={step === 2} />
      </Box>
    </Box>
  );
}
