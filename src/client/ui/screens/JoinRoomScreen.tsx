import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

export interface JoinRoomScreenProps {
  onBack: () => void;
  onJoinSubmit: (method: 'LAN' | 'INTERNET', target: string) => void;
  serverError?: string | null;
}

export function JoinRoomScreen({
  onBack,
  onJoinSubmit,
  serverError,
}: JoinRoomScreenProps) {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<'LAN' | 'INTERNET' | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<1 | 2>(1);

  useInput((inputKey, key) => {
    // Only handle global keys in step 1. In step 2, TextInput handles typing.
    // Wait, if TextInput is active, useInput still receives keys but TextInput also does.
    // To prevent double handling, we should only use useInput for step 1.
    if (step === 1) {
      if (key.escape || inputKey === '0') {
        onBack();
        return;
      }
      if (key.upArrow || key.downArrow) {
        setSelectedNetwork((prev) => (prev === 1 ? 2 : 1));
      } else if (key.return) {
        if (selectedNetwork === 1) {
          setMethod('LAN');
          setStep(2);
          setInput('connect ');
        } else {
          setMethod('INTERNET');
          setStep(2);
          setInput('join ');
        }
      } else if (inputKey === '1') {
        setSelectedNetwork(1);
        setMethod('LAN');
        setStep(2);
        setInput('connect ');
      } else if (inputKey === '2') {
        setSelectedNetwork(2);
        setMethod('INTERNET');
        setStep(2);
        setInput('join ');
      }
    } else if (step === 2 && (key.escape || inputKey === '0')) {
      // If in step 2 and user types 0, but they might be typing an IP with a 0.
      // So only escape key should go back, or 0 if it's the exact string '0' maybe?
      // Better to only rely on escape key for step 2.
      if (key.escape) {
        setStep(1);
        setMethod(null);
        setInput('');
        setError('');
      }
    }
  });

  const handleSubmit = (value: string) => {
    if (step !== 2) return;

    const trimmed = value.trim();
    if (method === 'LAN') {
      if (!trimmed.toLowerCase().startsWith('connect ')) {
        setError('Invalid command. Use: connect <ip>:<port>');
        return;
      }
      const target = trimmed.substring(8).trim();
      if (!target) {
        setError('IP and Port are required');
        return;
      }
      onJoinSubmit('LAN', target);
    } else {
      if (!trimmed.toLowerCase().startsWith('join ')) {
        setError('Invalid command. Use: join <code>');
        return;
      }
      const target = trimmed.substring(5).trim();
      if (!target || target.length !== 6) {
        setError('Room code must be 6 characters');
        return;
      }
      onJoinSubmit('INTERNET', target.toUpperCase());
    }
  };

  const getTitle = () => {
    if (step === 2 && method === 'LAN') {
      return (
        <Box borderStyle="round" borderColor="yellow" justifyContent="center">
          <Text color="red">JOIN </Text>
          <Text color="yellowBright">VIA </Text>
          <Text color="greenBright">IPv4 </Text>
          <Text color="magentaBright">(LAN)</Text>
        </Box>
      );
    }
    if (step === 2 && method === 'INTERNET') {
      return (
        <Box borderStyle="round" borderColor="yellow" justifyContent="center">
          <Text color="red">JOIN </Text>
          <Text color="yellowBright">VIA </Text>
          <Text color="cyanBright">ROOM CODE </Text>
          <Text color="magentaBright">(Internet)</Text>
        </Box>
      );
    }
    return (
      <Box borderStyle="round" borderColor="yellow" justifyContent="center">
        <Text color="red">JOIN </Text>
        <Text color="cyanBright">ROOM</Text>
      </Box>
    );
  };

  const renderStep1 = () => (
    <Box flexDirection="column">
      <Text color="magentaBright">เลือกวิธีเข้าร่วมห้อง (Choose method):</Text>
      <Box flexDirection="column" paddingX={6} marginTop={4}>
        <Box marginBottom={1}>
          <Box width={26}>
            <Text color={selectedNetwork === 1 ? 'greenBright' : 'gray'}>
              {selectedNetwork === 1 ? '> ' : '  '}[1] Join via IPv4
            </Text>
          </Box>
          <Text color="gray">(เล่นใน LAN)</Text>
        </Box>
        <Box>
          <Box width={26}>
            <Text color={selectedNetwork === 2 ? 'cyanBright' : 'gray'}>
              {selectedNetwork === 2 ? '> ' : '  '}[2] Join via Room Code
            </Text>
          </Box>
          <Text color="gray">(เล่นผ่าน Net)</Text>
        </Box>
      </Box>
      <Box marginTop={2} paddingX={4}>
        <Text color="gray">Use Up/Down Arrow keys to select, then press Enter</Text>
      </Box>
    </Box>
  );

  const renderStep2 = () => (
    <Box flexDirection="column">
      <Text color="blueBright">
        {method === 'LAN'
          ? 'กรอก IP Address และ Port ของห้อง'
          : 'กรอกรหัสห้อง 6 หลักที่ได้รับจากเพื่อน'}
      </Text>

      <Box flexDirection="column" alignItems="center" marginTop={4}>
        {method === 'LAN' ? (
          <>
            <Text color="greenBright">Command: connect &lt;ip&gt;:&lt;port&gt;</Text>
            <Text color="gray">ตัวอย่าง: connect 192.168.1.10:5000</Text>
          </>
        ) : (
          <>
            <Text color="greenBright">Command: join &lt;code&gt;</Text>
            <Text color="gray">ตัวอย่าง: join A1B2C9</Text>
          </>
        )}
        {error || serverError ? (
          <Box marginTop={2}>
            <Text color="red">{error || serverError}</Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  );

  return (
    <Box flexDirection="column" width={60}>
      {getTitle()}

      <Box
        borderStyle="round"
        borderColor="yellow"
        flexDirection="column"
        paddingY={1}
        paddingX={2}
        minHeight={15}
      >
        <Box flexGrow={1} flexDirection="column">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </Box>
        <Box alignSelf="center" marginTop={1}>
          <Text color="gray">Press 0 or Esc to go back</Text>
        </Box>
      </Box>

      {step === 2 ? (
        <Box borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text>&gt; </Text>
          <TextInput
            value={input}
            onChange={(val) => {
              setInput(val);
              setError('');
            }}
            onSubmit={handleSubmit}
          />
        </Box>
      ) : (
        <Box borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text>&gt; _</Text>
        </Box>
      )}
    </Box>
  );
}
