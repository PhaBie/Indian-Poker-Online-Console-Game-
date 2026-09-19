import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { SocketClient } from '../../network/socketClient';
import { getLocalIPv4 } from '../../index';
export interface CreateRoomScreenProps {
  socketClient: SocketClient;
  onBack: () => void;
  roomId: string | null;
  serverUrl: string;
  playerName?: string;
  onModeSelect?: (mode: 'LAN' | 'INTERNET') => void;
}

export function CreateRoomScreen({
  socketClient,
  onBack,
  roomId,
  serverUrl,
  playerName = 'Host',
  onModeSelect,
}: CreateRoomScreenProps) {
  const [step, setStep] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [networkMode, setNetworkMode] = useState<'LAN' | 'INTERNET' | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<1 | 2>(1);

  useInput((input, key) => {
    if (key.escape || input === '0') {
      if (step === 1) {
        onBack();
      } else if (step === 2) {
        setStep(1);
      } else if (step === 3) {
        onBack();
      }
      return;
    }

    if (step === 1) {
      if (key.upArrow) {
        setMaxPlayers((prev) => Math.max(prev - 1, 1));
      } else if (key.downArrow) {
        setMaxPlayers((prev) => Math.min(prev + 1, 4));
      } else if (key.return) {
        setStep(2);
      } else if (['1', '2', '3', '4'].includes(input)) {
        setMaxPlayers(parseInt(input, 10));
        setStep(2);
      }
    } else if (step === 2) {
      if (key.upArrow || key.downArrow) {
        setSelectedNetwork((prev) => (prev === 1 ? 2 : 1));
      } else if (key.return) {
        handleMethodSelect(selectedNetwork.toString());
      } else if (input === '1' || input === '2') {
        setSelectedNetwork(parseInt(input, 10) as 1 | 2);
        handleMethodSelect(input);
      }
    }
  });

  const handleMethodSelect = (val: string) => {
    if (val === '1') {
      setNetworkMode('LAN');
      if (onModeSelect) onModeSelect('LAN');
      createRoomOnServer();
    } else if (val === '2') {
      setNetworkMode('INTERNET');
      if (onModeSelect) onModeSelect('INTERNET');
      createRoomOnServer();
    }
  };

  const createRoomOnServer = () => {
    socketClient.send({
      type: 'CREATE_ROOM',
      payload: { playerName, bootAmount: 50, maxPlayers },
    });
    setStep(3);
  };

  const renderStep1 = () => (
    <Box flexDirection="column">
      <Text color="greenBright">Step 1: กำหนดจำนวนผู้เล่นในห้อง (1-4)</Text>
      <Box flexDirection="column" paddingX={4} marginTop={1}>
        {[1, 2, 3, 4].map((num) => (
          <Text key={num} color={maxPlayers === num ? 'cyanBright' : 'gray'}>
            {maxPlayers === num ? '> ' : '  '}[{num}] {num} Player{num > 1 ? 's' : ''}
          </Text>
        ))}
      </Box>
      <Box marginTop={1} paddingX={4}>
        <Text color="gray">Use Up/Down Arrow keys to select, then press Enter</Text>
      </Box>
    </Box>
  );

  const renderStep2 = () => (
    <Box flexDirection="column">
      <Text color="magentaBright">Step 2: เลือกรูปแบบเครือข่าย (Network)</Text>
      <Text color="gray">Players: {maxPlayers}</Text>
      <Box flexDirection="column" paddingX={4} marginTop={1}>
        <Box marginBottom={1}>
          <Box width={22}>
            <Text color={selectedNetwork === 1 ? 'greenBright' : 'gray'}>
              {selectedNetwork === 1 ? '> ' : '  '}[1] LAN Mode
            </Text>
          </Box>
          <Text color="gray">(ใช้ IPv4)</Text>
        </Box>
        <Box>
          <Box width={22}>
            <Text color={selectedNetwork === 2 ? 'cyanBright' : 'gray'}>
              {selectedNetwork === 2 ? '> ' : '  '}[2] Internet Mode
            </Text>
          </Box>
          <Text color="gray">(ใช้ Room Code)</Text>
        </Box>
      </Box>
      <Box marginTop={1} paddingX={4}>
        <Text color="gray">Use Up/Down Arrow keys to select, then press Enter</Text>
      </Box>
    </Box>
  );

  const renderStep3 = () => {
    if (!roomId) {
      return <Text color="yellow">กำลังสร้างห้อง...</Text>;
    }

    if (networkMode === 'LAN') {
      const urlObj = new URL(serverUrl);
      const hostIp = getLocalIPv4();
      const port = urlObj.port || '8080';

      return (
        <Box flexDirection="column">
          <Text color="greenBright">
            ห้องของคุณพร้อมแล้ว! แชร์ข้อมูลด้านล่างให้เพื่อนที่อยู่ในวง Network เดียวกัน
          </Text>
          <Box flexDirection="column" paddingX={4} marginTop={2} marginBottom={2}>
            <Text color="gray">Host IP : {hostIp}</Text>
            <Text color="gray">Port : {port}</Text>
            <Text color="gray">Max Player : {maxPlayers || 4}</Text>
          </Box>
          <Text color="redBright">กำลังรอผู้เล่นเชื่อมต่อ...</Text>
        </Box>
      );
    } else {
      return (
        <Box flexDirection="column">
          <Text color="greenBright">ห้องของคุณพร้อมแล้ว! ส่งรหัสนี้ให้เพื่อน</Text>
          <Text color="cyanBright">ROOM CODE: {roomId}</Text>
          <Box flexDirection="column" paddingX={4} marginTop={2} marginBottom={2}>
            <Text color="gray">Max Player : {maxPlayers || 4}</Text>
            <Text color="gray">Server : Connected (Relay)</Text>
          </Box>
          <Text color="redBright">กำลังรอผู้เล่นเข้าห้องด้วยรหัสนี้...</Text>
        </Box>
      );
    }
  };

  const getTitle = () => {
    if (step === 3 && networkMode === 'LAN') {
      return (
        <Box borderStyle="round" borderColor="yellow" justifyContent="center">
          <Text color="red">ROOM </Text>
          <Text color="greenBright">CREATED </Text>
          <Text color="blueBright">(LAN </Text>
          <Text color="magentaBright">MODE)</Text>
        </Box>
      );
    }
    if (step === 3 && networkMode === 'INTERNET') {
      return (
        <Box borderStyle="round" borderColor="yellow" justifyContent="center">
          <Text color="red">ROOM </Text>
          <Text color="greenBright">CREATED </Text>
          <Text color="cyanBright">(INTERNET </Text>
          <Text color="magentaBright">MODE)</Text>
        </Box>
      );
    }
    return (
      <Box borderStyle="round" borderColor="yellow" justifyContent="center">
        <Text color="red">CREATE </Text>
        <Text color="blueBright">ROOM</Text>
      </Box>
    );
  };

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
          {step === 3 && renderStep3()}
        </Box>
        <Box alignSelf="center" marginTop={1}>
          <Text color="gray">Press 0 or Esc to go back</Text>
        </Box>
      </Box>
      <Box borderStyle="round" borderColor="yellow" paddingX={1}>
        <Text>&gt; </Text>
      </Box>
    </Box>
  );
}
