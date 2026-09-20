# LAN and Online play

The two modes run separate PokerServer instances and independent room/session stores.
The shared lobby UI shows LAN LOBBY or ONLINE LOBBY, with the same table and controls.
Join Online opens the online room list. Room codes remain available inside the lobby.
Create Online creates a room on the central server, not on the player's computer.

## Administrator: online server

1. Set `NGROK_AUTHTOKEN` on the server machine (environment or a local `.env`).
2. Optionally set `NGROK_DOMAIN` to the hostname assigned to your ngrok account.
3. Run `bun run server:online`. The game server listens on loopback port 8081;
   ngrok forwards only to that port. `ONLINE_PORT` overrides it.
4. Copy the public `wss://` endpoint printed at startup into the client configuration.

The administrator must keep this process and machine running. The command fails
without credentials; it does not silently expose the LAN server. Stopping it closes
the tunnel and game server. Rooms live in memory and disappear on restart.

## Distribute the client

Set `DEFAULT_ONLINE_SERVER_URL` in `src/client/config.ts` before distributing the
client, so players only need to choose Create Online or Join Online. Alternatively,
set `POKER_ONLINE_URL` on a development machine. A secure URL passed to `bun run dev`
also configures the Online endpoint for that run. Changing the public endpoint
requires updating client configuration; there is no discovery/config service yet.

Never ship an ngrok authtoken in client code or configuration. Players do not need
ngrok accounts or ngrok software. The public endpoint is not a secret.

## LAN server

Run `bun run server:lan` (or `bun run server`). It binds a private local IPv4 address
on port 8080. Set `LAN_HOST` explicitly when there are multiple adapters/VPNs.
The server prints the address for LAN players. The client accepts private IPv4
addresses only for LAN; online endpoints must use WSS. Modes are checked during
the WebSocket upgrade, and Online clients cannot use a LAN endpoint or vice versa.

LAN accepts loopback and private peers on a local interface's subnet and rejects
forwarded HTTP requests. Keep firewall access limited to the intended local subnet;
do not port-forward or tunnel the LAN port. Software cannot prevent an administrator
from deliberately bridging a network or proxying traffic through an allowed local peer.

## Verification and limitations

Run `bun test ./Test` and `bunx tsc --noEmit`. Network integration tests use real local
WebSockets to check separate room lists and mode rejection. They do not contact ngrok.
An actual public smoke test needs the administrator's token and reachable endpoint:
start Online, configure two clients, create a room, join it from the other client,
then confirm the room is absent in LAN. ngrok plan limits apply to the central account.

This is a prototype central lobby, not a production account/authentication service.
