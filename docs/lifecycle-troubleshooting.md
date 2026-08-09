# Lifecycle and troubleshooting

## Expected sequence

```text
QoS measurement
Ticket searching/forming/reserved/matched
Gameye allocation
Session registered
Dedicated Fusion startup
Server readiness acknowledgement
Session ready
Client Fusion join
Server admission
Game started
Authoritative results
Session completed
Gameye termination
Client connection-state cleanup
```

## `Disconnected: DisconnectByClientLogic`

This is a Fusion disconnect reason produced when client code intentionally shuts down a Runner. It is not a QoS response and does not by itself indicate a transport failure.

For a Backend-managed flow there should normally be no idle Photon Lobby Runner. In a legacy flow, an intentional lobby-to-game Runner handoff may produce:

```text
Disconnected: DisconnectByClientLogic
adding player [Player:N]
ClientBootstrap: Game started
```

The later admission and game-start messages determine whether the game connection succeeded.

## ICMP timeout or `Ping: Error receiving ICMP packet response`

QoS probes target Gameye-provided public ping addresses using `UnityEngine.Ping` where supported. Firewalls and networks commonly block ICMP. These errors mean a measurement was unavailable; they are not Fusion authentication or UDP transport failures.

Ticket creation continues with the successful measurements or placement fallbacks.

## `adding player` without game start

Photon reporting `adding player` proves that a Session-level admission attempt reached the server. It does not alone prove that Fusion direct UDP transport, scene synchronization, or gameplay startup completed.

Require a later application-level readiness signal such as `ClientBootstrap: Game started` and successful scene loading.

## `Expired` join rejection

Check that all three values use the same immutable credential expiry:

- expiry embedded in `GB_SESSION_TOKEN`;
- expiry embedded in the player's `gbj1` token;
- expected expiry configured in the dedicated server.

Do not mint a player token from a post-allocation operational Session expiry if the server received an earlier immutable expiry. Persist a dedicated credential expiry at allocation claim time and use it for every credential issued for that Session.

## `StartGame failed: OperationTimeout`

Investigate in this order:

1. server readiness was acknowledged only after Fusion startup;
2. server uses the correct Session name and Photon region;
3. Gameye's mapped UDP endpoint is supplied as server `CustomPublicAddress`;
4. client uses `GameMode.Client`, Session name, Photon region, and connection token;
5. managed admission did not reject the token;
6. Session remains operationally active and unexpired.

Do not “fix” this by bypassing admission, forcing relay, or creating an IP-only path that skips the Photon Session contract.

## Match ended but UI still shows Leave

The transport/controller state must observe natural `Finished` and server disconnect, shut down the owned Runner, restore temporary Photon configuration, and publish a disconnected UI snapshot. Clearing state only from the explicit Leave button produces a stale action after server-driven completion.

## Verification boundary

A complete managed multiplayer proof requires all of the following:

- provider allocation and mapped endpoint;
- authoritative server readiness;
- valid player admission;
- Fusion direct transport;
- expected game scene/start signal;
- result settlement;
- Session/provider cleanup.
