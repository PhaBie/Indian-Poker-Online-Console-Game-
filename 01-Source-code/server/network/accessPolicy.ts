import os from 'os';
import type { IncomingMessage } from 'http';
import { isPrivateIPv4, type NetworkMode } from '../../shared/networkMode';

export function getLanBindAddress(): string {
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const entry of interfaces ?? []) {
      if (entry.family === 'IPv4' && !entry.internal && isPrivateIPv4(entry.address))
        return entry.address;
    }
  }
  return '127.0.0.1';
}

function isOnLocalSubnet(address: string): boolean {
  if (address.startsWith('127.')) return true;
  if (!isPrivateIPv4(address)) return false;
  const octets = address.split('.').map(Number);
  return Object.values(os.networkInterfaces()).some((entries) =>
    entries?.some((entry) => {
      if (entry.family !== 'IPv4' || entry.internal) return false;
      const local = entry.address.split('.').map(Number);
      return entry.netmask
        .split('.')
        .map(Number)
        .every((mask, index) => (octets[index] & mask) === (local[index] & mask));
    }),
  );
}

export function acceptsConnection(request: IncomingMessage, mode: NetworkMode): boolean {
  const requestedMode =
    new URL(request.url ?? '/', 'http://localhost').searchParams.get('mode') ?? 'LAN';
  if (requestedMode !== mode) return false;
  if (mode === 'INTERNET') return true;
  if (
    request.headers['x-forwarded-for'] ||
    request.headers.forwarded ||
    request.headers['x-forwarded-host']
  )
    return false;
  const address = request.socket.remoteAddress?.replace(/^::ffff:/, '') ?? '';
  return isOnLocalSubnet(address);
}
