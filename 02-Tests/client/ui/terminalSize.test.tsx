import React from 'react';
import { describe, expect, test } from 'bun:test';
import { renderToString } from 'ink';
import {
  preparePlayableTerminal,
  requestPlayableTerminalSize,
} from '../../../01-Source-code/client/ui/shared/hooks/useTerminalSize';
import { TerminalOutOfRangeScreen } from '../../../01-Source-code/client/ui/shared/components/ScreenSizeGuard';
import { buildDecreaseFontInput } from '../../../01-Source-code/client/ui/shared/windows/windowsTerminalWindow';

describe('20. ระบบเตรียมขนาดหน้าต่างเทอร์มินัล (Terminal Window Sizing)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test('[requestPlayableTerminalSize] 20.1 หน้าต่างเล็กกว่าเกณฑ์ → ส่งคำขอปรับขนาดเป็น 150 × 41 ช่อง', () => {
      const writes: string[] = [];
      const output = {
        isTTY: true,
        columns: 120,
        rows: 30,
        write: (value: string) => writes.push(value),
      };

      expect(requestPlayableTerminalSize(output)).toBe(true);
      expect(writes).toEqual(['\x1b[8;41;150t']);
    });

    test('[preparePlayableTerminal] 20.2 หน้าต่างยังไม่พอหลังขยาย → ลดขนาดอักษรจนแสดงเกมได้', async () => {
      const events: string[] = [];
      const output = {
        isTTY: true,
        columns: 80,
        rows: 24,
        write: () => events.push('request'),
      };
      const controller = {
        maximize: () => {
          events.push('maximize');
          output.columns = 120;
          output.rows = 30;
          return true;
        },
        reduceFont: () => {
          events.push('reduceFont');
          output.columns = 150;
          output.rows = 41;
          return true;
        },
        close: () => {},
      };

      await preparePlayableTerminal(output, controller, async () => {});
      expect(events).toEqual(['request', 'maximize', 'reduceFont']);
      expect(output.columns).toBe(150);
      expect(output.rows).toBe(41);
    });

    test('[preparePlayableTerminal] 20.3 ค่าขนาดจาก Bun ไม่อัปเดตหลังขยายหน้าต่าง → ใช้ขนาดจริง 150 × 41 ช่องก่อนแสดงเกม', async () => {
      const output = {
        isTTY: true,
        columns: 80,
        rows: 24,
        write: () => {},
      };
      let actualSize = { columns: 80, rows: 24 };
      const controller = {
        maximize: () => {
          actualSize = { columns: 150, rows: 41 };
          return true;
        },
        reduceFont: () => {
          throw new Error('ไม่ควรลดขนาดอักษรเมื่อหน้าต่างมีพื้นที่เพียงพอ');
        },
        close: () => {},
      };

      await preparePlayableTerminal(
        output,
        controller,
        async () => {},
        () => actualSize,
      );

      expect(output.columns).toBe(150);
      expect(output.rows).toBe(41);
    });

    test('[buildDecreaseFontInput] 20.4 ปรับขนาดอักษรบน Windows → ส่ง Ctrl+Minus และปล่อยปุ่มทั้งสอง', () => {
      const input = buildDecreaseFontInput();
      const view = new DataView(input.buffer);
      const keys = [0x11, 0xbd, 0xbd, 0x11];
      const flags = [0, 0, 2, 2];

      for (let index = 0; index < 4; index++) {
        const offset = index * 40;
        expect(view.getUint32(offset, true)).toBe(1);
        expect(view.getUint16(offset + 8, true)).toBe(keys[index]);
        expect(view.getUint32(offset + 12, true)).toBe(flags[index]);
      }
    });
  });

  describe('กรณีข้อผิดพลาดและขอบเขตข้อมูล (Unhappy Paths & Boundaries)', () => {
    test('[requestPlayableTerminalSize] 20.5 หน้าต่างพร้อมเล่นหรือไม่ได้เชื่อมต่อ TTY → ไม่ส่งคำขอปรับขนาด', () => {
      const writes: string[] = [];
      const write = (value: string) => writes.push(value);

      expect(
        requestPlayableTerminalSize({ isTTY: true, columns: 160, rows: 45, write }),
      ).toBe(false);
      expect(
        requestPlayableTerminalSize({ isTTY: false, columns: 80, rows: 24, write }),
      ).toBe(false);
      expect(writes).toEqual([]);
    });

    test('[requestPlayableTerminalSize] 20.6 หน้าต่างใหญ่กว่าเกณฑ์ขั้นต่ำ → ไม่ลดขนาดหน้าต่าง', () => {
      const writes: string[] = [];
      expect(
        requestPlayableTerminalSize({
          isTTY: true,
          columns: 1201,
          rows: 400,
          write: (value) => writes.push(value),
        }),
      ).toBe(false);
      expect(writes).toEqual([]);
    });

    test('[preparePlayableTerminal] 20.7 เทอร์มินัลไม่ตอบสนองต่อการลดขนาดอักษร → หยุดปรับและคืนทรัพยากร', async () => {
      let fontAttempts = 0;
      let isClosed = false;
      await preparePlayableTerminal(
        { isTTY: true, columns: 80, rows: 24, write: () => {} },
        {
          maximize: () => true,
          reduceFont: () => {
            fontAttempts++;
            return true;
          },
          close: () => {
            isClosed = true;
          },
        },
        async () => {},
      );

      expect(fontAttempts).toBe(2);
      expect(isClosed).toBe(true);
    });

    test('[TerminalOutOfRangeScreen] 20.8 พื้นที่จอมีขนาดมากผิดปกติ → จำกัดพื้นที่แสดงคำเตือน', () => {
      const output = renderToString(
        <TerminalOutOfRangeScreen
          currentColumns={1000}
          currentRows={500}
          status="TOO_LARGE"
        />,
        { columns: 1000 },
      );

      expect(output).toContain('TERMINAL WINDOW TOO LARGE');
      expect(output.length).toBeLessThan(2500);
    });
  });
});
