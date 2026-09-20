// Set the public endpoint here when distributing a preconfigured client.
// Never place the ngrok authtoken in client code or client configuration.
export const DEFAULT_ONLINE_SERVER_URL = '';

export function getOnlineServerUrl(): string {
  return process.env.POKER_ONLINE_URL || DEFAULT_ONLINE_SERVER_URL;
}
