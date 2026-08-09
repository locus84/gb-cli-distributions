# Managed multiplayer architecture

## Responsibility boundaries

| Component | Authoritative responsibility |
| --- | --- |
| gb Backend | Queue policy, Ticket ownership, Match roster, Session state, credentials, readiness, results, termination intent |
| Game client | QoS measurement, Ticket/proposal flow, retrieval of its own Session credential, Fusion client startup |
| Gameye | Image availability, process allocation, mapped public endpoint, provider lifecycle and billing |
| Dedicated server | Fusion startup, player credential validation, capacity/roster enforcement, gameplay and results |
| Photon Fusion | Named Session discovery and client/server game transport |

A Gameye allocation response is **not** proof that the game server is playable. A managed Session becomes `ready` only after the dedicated server has successfully started its authoritative Fusion Runner and acknowledged readiness to the Backend.

## End-to-end state flow

```text
Ticket:  searching -> forming -> reserved -> matched
Match:   forming -> proposed -> allocating -> ready -> active -> completed
Session: registered -> ready -> active -> completed
```

Cancellation, expiry, requeue, and failure branches can terminate or return an eligible Ticket to searching. Provider allocation runs while the Match is `allocating` and its Session is already `registered`; the Session advances to `ready` only after the dedicated server acknowledgement.

Only `searching`, `forming`, and `reserved` Tickets own the player's active matchmaking slot. A matched Ticket is historical membership; reconnect and handoff use Match/Session APIs.

## Client flow

1. Request Queue QoS targets from `GET /matchmaking/qos-targets?queueName=...`.
2. Measure the returned public Gameye ping addresses with ICMP where supported.
3. Create a Ticket with per-region latency/loss advice.
4. Poll the Ticket and accept a pending proposal when the game UX permits it.
5. Wait for the current multiplayer Session to become `ready`.
6. Read the Backend-selected Photon region, Fusion Session name convention, and player-specific `joinToken`.
7. Start Fusion in `GameMode.Client` with the Session name, selected Photon region, and UTF-8 join token as the connection token.

QoS selects placement **after** the roster is formed. It never reorders FIFO Ticket selection. Missing or blocked ICMP measurements fail open to country/availability placement.

## Allocation and readiness

The allocation worker:

1. resolves the immutable Queue runtime snapshot;
2. ranks locations from player QoS, country fallback, and current Gameye availability;
3. injects Session-scoped environment and allocates the immutable image;
4. stores the provider Session and mapped endpoint as `registered`;
5. waits for the server's authenticated readiness callback.

The dedicated server must call:

```http
POST /server/multiplayer/sessions/{sessionId}/ready
Authorization: Bearer {GB_SESSION_TOKEN}
```

The callback is Session-fenced and idempotent. It must happen only after Fusion startup succeeds.

## Optional pregame backfill

Pregame backfill is an explicit Queue policy for managed Gameye sessions. It is permitted only during the game's waiting/pregame phase and must close before gameplay selection or `Playing` begins.

The Backend remains authoritative for assignments and minimum-player policy. The server acknowledges the complete accepted roster; open slots are capacity information, not authorization. MMR and entry-cost Queues are not eligible for this backfill mode.
