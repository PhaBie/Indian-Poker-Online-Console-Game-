export type NetworkMode = 'LAN' | 'INTERNET';

export function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  )
    return false;
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
  );
}

export function prepareConnectionUrl(target: string, mode: NetworkMode): string {
  const input = target.trim();
  if (!input) throw new Error('Online play is not configured yet.');
  const url = new URL(
    input.includes('://') ? input : `${mode === 'LAN' ? 'ws' : 'wss'}://${input}`,
  );
  if (url.protocol === 'https:') url.protocol = 'wss:';
  if (url.username || url.password || url.hash)
    throw new Error('Invalid server address.');
  if (mode === 'LAN') {
    if (url.protocol !== 'ws:' || !isPrivateIPv4(url.hostname)) {
      throw new Error('LAN requires a local IPv4 address.');
    }
    if (!url.port) url.port = '8080';
  } else if (url.protocol !== 'wss:') {
    throw new Error('Online play requires a secure server address.');
  }
  url.searchParams.set('mode', mode);
  return url.toString();
}
