# Unity SDK quickstart

The GameBackend Unity package requires Unity 6 or newer. The public release tarball includes the HTTP-first SDK, samples, and supported native P2P plugins.

## Install

Download the package from the latest public release:

```bash
curl -fL \
  https://github.com/locus84/gb-cli-distributions/releases/latest/download/gamebackend-unity-sdk.tgz \
  -o gamebackend-unity-sdk.tgz
```

In Unity, open **Window → Package Manager**, choose **+ → Add package from tarball**, and select `gamebackend-unity-sdk.tgz`. The installed package name is `com.gamebackend.unity`.

Generate public client configuration from an authenticated operator workstation:

```bash
gb sdk export --game game_dev_xxx --target unity \
  --out Assets/GameBackend/gamebackend.json
gb sdk verify --game game_dev_xxx
```

Do not place operator credentials or `GB_TOKEN` in the Unity project.

## Bootstrap and anonymous sign-in

```csharp
using GameBackend.Unity;
using UnityEngine;

await GB.Init("https://runtime.example.com", "publishable-game-group-key");

if (!GB.Auth.IsSignedIn)
{
    await GB.Auth.SignInAnonymousAsync(SystemInfo.deviceUniqueIdentifier);
}

var me = await GB.Auth.GetMeAsync();
var wallet = await GB.Economy.GetWalletAsync();
var config = await GB.Config.GetDocumentAsync();

Debug.Log($"Player {me.UserId}, gold={wallet.GetBalance("gold")}");
```

The group key is publishable bootstrap configuration. The SDK resolves the concrete game from organisation/group/version configuration when that flow is used; it sends the resolved game ID on later Runtime calls.

For scene-driven setup, create **Assets → Create → GameBackend → Settings**, fill it from `gb sdk export`, add `BackendSdkBehaviour` to the boot scene, and await `BackendSdkBehaviour.Instance.ReadyAsync()`.

## Session and error behavior

- Tokens use `PlayerPrefsTokenStore` by default; provide a platform-appropriate `ITokenStore` for production requirements.
- On authenticated `401`, concurrent calls share one refresh and each request is retried once.
- Failed refresh clears the local session.
- Safe `GET` calls use bounded transient retry; mutations are not blindly retried.
- Backend failures surface as typed SDK exceptions with HTTP status, error code, message, and request ID.
- Replayed mutation idempotency keys surface as `ReconnectRequiredException`; resync authoritative state instead of repeating the mutation with a new key.

## Cloud Code and authoritative economy

```csharp
var result = await GB.CloudCode.CallAsync<QuestInput, QuestResult>(
    "quest.progress",
    new QuestInput { questId = "daily_kill_10", amount = 1 }
);

await GB.Economy.ExecuteTransactionAsync(
    "buy_starter_chest",
    idempotencyKey: System.Guid.NewGuid().ToString("N")
);
```

Use client-writable saves/documents only for non-authoritative preferences or progress that is safe to trust. Currency, paid inventory, claim history, IAP fulfillment, rewards, and competitive progression belong in dedicated APIs, transactions, trusted server runtime, or hardened Cloud Code.

## Managed matchmaking handoff

```csharp
var ticket = await GB.Matchmaking.CreateTicketWithQosAsync("solo");
ticket = await GB.Matchmaking.WaitForTicketActionAsync(ticket.id);

// Polling is authoritative. When the Match allocation becomes ready:
var session = await GB.Matchmaking.GetCurrentSessionAsync();
```

QoS uses Gameye ping targets, not the allocated game server. If ICMP is unavailable, ticket creation continues without measurements and Backend location fallback applies.

The SDK returns Session handoff data; game code starts its networking client with the returned Session name, region, endpoint metadata, and join token. Backend Solo does not require a Photon Lobby connection. See [Gameye + Photon Fusion](gameye-fusion.md) for the dedicated-server side.

## Realtime recovery

Realtime events are hints, not durable history. After disconnect, reconnect, restore subscriptions, then read persisted state over HTTP:

```csharp
await GB.Realtime.ReconnectAsync();
var messages = await GB.Chat.ListMessagesAsync(channelId);
```

Merge by stable IDs in game code. Validate `ClientWebSocket` and native/WebGL transport support on every shipping target.
