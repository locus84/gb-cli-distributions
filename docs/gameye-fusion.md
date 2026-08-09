# Gameye + Photon Fusion integration

## Dedicated-server environment

A managed allocation receives short-lived Session-scoped values:

| Variable | Purpose |
| --- | --- |
| `GB_GAME_ID` | Backend game scope |
| `GB_MATCH_ID` | Frozen Match scope |
| `GB_SESSION_ID` | Managed Session scope |
| `GB_PLAYER_IDS` | Initial authoritative human roster |
| `GB_JOIN_TOKEN_KEY` | Per-Session key used only to verify player join credentials |
| `GB_SESSION_TOKEN` | Bearer credential for this Session's server APIs |
| `GB_RUNTIME_BASE_URL` | Runtime API origin reachable from Gameye |
| `SESSION_NAME` | Backend-derived Fusion Session name |
| `PHOTON_REGION` | Photon region mapped from the selected Gameye location |
| `GAMEYE_HOST` | Public mapped host advertised by Gameye |
| `GAMEYE_PORT_UDP_7777` | Example mapped public UDP port for local port 7777 |

Never include `GB_JOIN_TOKEN_KEY`, `GB_SESSION_TOKEN`, or their contents in logs or provider metadata.

## Bind address versus advertised address

The server binds its local Gameye container port and separately advertises the provider mapping:

```csharp
var args = new StartGameArgs
{
    GameMode = GameMode.Server,
    SessionName = sessionName,
    Address = NetAddress.Any(7777),
    CustomPublicAddress = NetAddress.CreateFromIpPort(gameyeHost, gameyeUdpPort),
};
```

`StartGameArgs.Address` is the peer's **local bind address**. It is not a client's remote endpoint. A client should not inject the Gameye public endpoint into `Address`; the client discovers the dedicated server through the Photon Session.

Managed startup should fail closed if the required mapped public host/port is absent or malformed.

## Player admission

The Backend returns a compact player-specific credential:

```text
gbj1.<base64url playerId>.<unix expiry>.<base64url HMAC-SHA256>
```

The client forwards its UTF-8 bytes through Fusion `ConnectionToken`. The server:

1. parses exactly the supported token version and fields;
2. verifies the HMAC in constant time using the Session-scoped key;
3. checks Game, Match, Session, expiry, and authoritative roster membership;
4. applies capacity, duplicate, reconnect, and admission-phase rules;
5. logs only a sanitized rejection category.

The immutable credential expiry used by the server token, player token, and expected server claims must be identical. The operational Session can expire earlier; once it does, the Backend suppresses player credentials and rejects server APIs even if the cryptographic credential has remaining time.

## Client Runner lifecycle

Backend-managed matchmaking does not require a persistent Photon Lobby Runner. The Backend already supplies the Session name and Photon region. The client can remain without a Fusion Runner while measuring QoS and waiting for allocation, then create the game Runner only when the Session is ready.

Legacy Session-list-based Room matching may join the Photon Lobby lazily when that flow starts. It should not force Backend matchmaking to maintain an idle Runner.

## Completion

At authoritative match completion, the server submits results with `GB_SESSION_TOKEN`. Successful settlement marks the Match/Session terminal and enqueues Gameye termination. The client should clear its managed-match debug/connection state on either authoritative `Finished` or server disconnect; an ended match must not leave a stale “Leave” action visible.
