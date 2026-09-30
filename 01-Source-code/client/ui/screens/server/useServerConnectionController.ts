import { useState, useCallback } from 'react';
import { useInput } from 'ink';
import type { ServerConnectionMode, ServerConnectionScreenProps } from './types';

/**
 * Hook ควบคุมตรรกะการทำงานของหน้าจอเชื่อมต่อเซิร์ฟเวอร์ (Server Connection Controller)
 * จัดการสถานะโหมดการทำงาน (เลือกเมนู หรือ ป้อน IP), การแปลงรูปแบบ URL,
 * การตรวจสอบสถานะการเชื่อมต่อ และการตอบสนองต่อปุ่มลัดจากคีย์บอร์ด
 */
export function useServerConnectionController({
  serverUrl,
  isConnected,
  onConnect,
  onConnectedSuccess,
  onBack,
}: ServerConnectionScreenProps) {
  const [mode, setMode] = useState<ServerConnectionMode>('SELECT_ACTION');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [ipInput, setIpInput] = useState<string>('');

  /**
   * ส่งคำขอเชื่อมต่อไปยังเซิร์ฟเวอร์เป้าหมาย พร้อมทั้งปรับสถานะกำลังเชื่อมต่อ (Loading State)
   */
  const attemptConnect = useCallback(
    async (targetUrl: string) => {
      setIsConnecting(true);
      const isSuccess = await onConnect(targetUrl);
      setIsConnecting(false);
      if (isSuccess) {
        onConnectedSuccess(targetUrl);
      }
    },
    [onConnect, onConnectedSuccess],
  );

  /**
   * จัดการตรวจสอบและปรับรูปแบบ URL จากข้อความที่ผู้ใช้กรอก
   * - กรณีที่ขึ้นต้นด้วยโปรโตคอล ws:// หรือ wss:// แล้ว จะส่งค่านั้นไปใช้งานโดยตรงโดยไม่เติมพอร์ตเพิ่มเติม
   * - กรณีที่ไม่ได้ระบุโปรโตคอล จะเติม ws:// นำหน้า และหากไม่มีเครื่องหมายโคลอน (:) ในข้อความ จะต่อท้ายด้วย :8080
   */
  const handleIpSubmit = useCallback(() => {
    const trimmed = ipInput.trim();
    if (!trimmed) return;
    const formattedUrl =
      trimmed.startsWith('ws://') || trimmed.startsWith('wss://')
        ? trimmed
        : `ws://${trimmed}${trimmed.includes(':') ? '' : ':8080'}`;
    attemptConnect(formattedUrl);
  }, [ipInput, attemptConnect]);

  /**
   * ดักจับปุ่มลัดสำหรับนำทางและสั่งการ:
   * - ปุ่ม Escape: ย้อนกลับจากโหมดกรอก IP ไปหน้าเลือกคำสั่ง หรือย้อนกลับออกจากหน้าจอนี้
   * - ปุ่ม 1: สลับเข้าสู่โหมดกรอก IP เซิร์ฟเวอร์ใหม่
   * - ปุ่ม 2 หรือ R: สั่งลองเชื่อมต่อไปยัง URL เดิมซ้ำอีกครั้ง
   */
  useInput((input, key) => {
    if (isConnecting) return;
    if (key.escape) {
      if (mode === 'INPUT_IP') {
        setMode('SELECT_ACTION');
      } else {
        onBack();
      }
      return;
    }
    if (mode === 'SELECT_ACTION') {
      if (input === '1') setMode('INPUT_IP');
      if (input === '2' || input.toLowerCase() === 'r') attemptConnect(serverUrl);
    }
  });

  return { mode, isConnecting, ipInput, setIpInput, handleIpSubmit, isConnected };
}
