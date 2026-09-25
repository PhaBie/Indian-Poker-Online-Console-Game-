import { dlopen, FFIType, ptr, type Pointer } from 'bun:ffi';
import type { TerminalWindowController } from '../hooks/useTerminalSize';

const SW_MAXIMIZE = 3;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const STD_OUTPUT_HANDLE = -11;
const VK_CONTROL = 0x11;
const VK_OEM_MINUS = 0xbd;
const KEYEVENTF_KEYUP = 0x0002;
const INPUT_KEYBOARD = 1;
const INPUT_SIZE = 40;
const KEYSTROKE_COUNT = 4;
const CONSOLE_FONT_INFOEX_SIZE = 84;

const user32Symbols = {
  GetForegroundWindow: { args: [], returns: FFIType.ptr },
  GetWindowThreadProcessId: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.u32,
  },
  ShowWindow: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.bool },
  IsZoomed: { args: [FFIType.ptr], returns: FFIType.bool },
  SendInput: {
    args: [FFIType.u32, FFIType.ptr, FFIType.i32],
    returns: FFIType.u32,
  },
} as const;

const kernel32Symbols = {
  OpenProcess: {
    args: [FFIType.u32, FFIType.bool, FFIType.u32],
    returns: FFIType.ptr,
  },
  QueryFullProcessImageNameW: {
    args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.ptr],
    returns: FFIType.bool,
  },
  CloseHandle: { args: [FFIType.ptr], returns: FFIType.bool },
  GetConsoleWindow: { args: [], returns: FFIType.ptr },
  GetStdHandle: { args: [FFIType.i32], returns: FFIType.ptr },
  GetCurrentConsoleFontEx: {
    args: [FFIType.ptr, FFIType.bool, FFIType.ptr],
    returns: FFIType.bool,
  },
  SetCurrentConsoleFontEx: {
    args: [FFIType.ptr, FFIType.bool, FFIType.ptr],
    returns: FFIType.bool,
  },
} as const;

function getWindowProcessName(
  windowHandle: bigint | Pointer,
  user32: ReturnType<typeof dlopen<typeof user32Symbols>>['symbols'],
  kernel32: ReturnType<typeof dlopen<typeof kernel32Symbols>>['symbols'],
): string | null {
  const processId = new Uint32Array(1);
  user32.GetWindowThreadProcessId(windowHandle, ptr(processId));
  if (!processId[0]) return null;

  const processHandle = kernel32.OpenProcess(
    PROCESS_QUERY_LIMITED_INFORMATION,
    false,
    processId[0],
  );
  if (!processHandle) return null;

  try {
    const nameBuffer = new Uint16Array(512);
    const nameLength = new Uint32Array([nameBuffer.length]);
    if (
      !kernel32.QueryFullProcessImageNameW(
        processHandle,
        0,
        ptr(nameBuffer),
        ptr(nameLength),
      )
    ) {
      return null;
    }
    const fullName = String.fromCharCode(...nameBuffer.subarray(0, nameLength[0]));
    return fullName.split('\\').at(-1)?.toLowerCase() ?? null;
  } finally {
    kernel32.CloseHandle(processHandle);
  }
}

export function buildDecreaseFontInput(): Uint8Array {
  const input = new Uint8Array(INPUT_SIZE * KEYSTROKE_COUNT);
  const view = new DataView(input.buffer);
  const keys = [
    [VK_CONTROL, 0],
    [VK_OEM_MINUS, 0],
    [VK_OEM_MINUS, KEYEVENTF_KEYUP],
    [VK_CONTROL, KEYEVENTF_KEYUP],
  ] as const;

  keys.forEach(([virtualKey, flags], index) => {
    const offset = index * INPUT_SIZE;
    view.setUint32(offset, INPUT_KEYBOARD, true);
    view.setUint16(offset + 8, virtualKey, true);
    view.setUint32(offset + 12, flags, true);
  });

  return input;
}

function sendDecreaseFontShortcut(
  user32: ReturnType<typeof dlopen<typeof user32Symbols>>['symbols'],
): boolean {
  const input = buildDecreaseFontInput();
  return user32.SendInput(KEYSTROKE_COUNT, ptr(input), INPUT_SIZE) === KEYSTROKE_COUNT;
}

function decreaseConsoleFont(
  kernel32: ReturnType<typeof dlopen<typeof kernel32Symbols>>['symbols'],
): boolean {
  const outputHandle = kernel32.GetStdHandle(STD_OUTPUT_HANDLE);
  if (!outputHandle) return false;

  const fontInfo = new Uint8Array(CONSOLE_FONT_INFOEX_SIZE);
  const view = new DataView(fontInfo.buffer);
  view.setUint32(0, CONSOLE_FONT_INFOEX_SIZE, true);
  if (!kernel32.GetCurrentConsoleFontEx(outputHandle, false, ptr(fontInfo))) return false;

  const width = view.getInt16(8, true);
  const height = view.getInt16(10, true);
  if (height <= 8) return false;
  const nextHeight = Math.max(8, height - 2);
  view.setInt16(8, Math.max(4, Math.round((width * nextHeight) / height)), true);
  view.setInt16(10, nextHeight, true);
  return kernel32.SetCurrentConsoleFontEx(outputHandle, false, ptr(fontInfo));
}

export function openWindowsTerminalWindow(): TerminalWindowController | null {
  const user32 = dlopen('user32.dll', user32Symbols);
  const kernel32 = dlopen('kernel32.dll', kernel32Symbols);
  const windowHandle = user32.symbols.GetForegroundWindow();
  const processName = windowHandle
    ? getWindowProcessName(windowHandle, user32.symbols, kernel32.symbols)
    : null;
  const isWindowsTerminal =
    processName === 'windowsterminal.exe' && Boolean(process.env.WT_SESSION);
  const isConsoleHost =
    (processName === 'conhost.exe' || processName === 'openconsole.exe') &&
    windowHandle === kernel32.symbols.GetConsoleWindow();

  if (!windowHandle || (!isWindowsTerminal && !isConsoleHost)) {
    user32.close();
    kernel32.close();
    return null;
  }

  return {
    maximize: () => {
      user32.symbols.ShowWindow(windowHandle, SW_MAXIMIZE);
      return user32.symbols.IsZoomed(windowHandle);
    },
    reduceFont: () => {
      if (user32.symbols.GetForegroundWindow() !== windowHandle) return false;
      return isWindowsTerminal
        ? sendDecreaseFontShortcut(user32.symbols)
        : decreaseConsoleFont(kernel32.symbols);
    },
    close: () => {
      user32.close();
      kernel32.close();
    },
  };
}
