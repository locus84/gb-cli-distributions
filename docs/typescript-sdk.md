# TypeScript SDK quickstart

`@gamebackend/sdk` is a dependency-free, player-safe SDK for modern browsers and Node.js 18+. It uses the standard Fetch API and excludes operator/admin endpoints.

## Install

The package is distributed as a tarball with each public Backend release:

```bash
npm install \
  https://github.com/locus84/gb-cli-distributions/releases/latest/download/gamebackend-typescript-sdk.tgz
```

Export public Runtime configuration from an authenticated operator workstation:

```bash
gb sdk export --game game_dev_xxx --target typescript --out gamebackend.json
gb sdk verify --game game_dev_xxx
```

## Initialize and sign in

```ts
import { GameBackendClient } from '@gamebackend/sdk'
import config from './gamebackend.json' with { type: 'json' }

const gb = await GameBackendClient.create({
  ...config,
  version: '1.0.0',
})

const status = await gb.getGameStatus()
if (status.status === 'maintenance') {
  showMaintenance(status.maintenance)
} else if (!gb.auth.isSignedIn) {
  await gb.auth.signInAnonymous(getOrCreateInstallationId(), {
    platform: 'web',
  })
}

const me = await gb.auth.me()
const wallet = await gb.economy.getWallet()
await gb.events.track({ name: 'level_up', props: { level: 3 } })
```

The application version participates in organisation/group-key resolution. A resolved game ID is applied to later Runtime requests.

## Token storage and errors

The default `MemoryTokenStore` keeps credentials only in the current page/process. Implement `TokenStore` only after choosing storage appropriate for the browser, desktop shell, mobile wrapper, or server process.

- Authenticated `401` responses share one refresh and retry each original call once.
- Failed refresh clears credentials and throws `SessionExpiredError`.
- Other failures throw `GameBackendError` with `status`, `errorCode`, `message`, and optional `requestId`/`details`.
- Safe reads use bounded retry for network, timeout, rate-limit, and server failures.
- Mutations should use stable idempotency keys and resync after ambiguous outcomes.

Never put `GB_TOKEN`, deployer sessions, provider secrets, IAP keys, or player refresh tokens in source control or a browser bundle. The exported game group key is intentionally publishable.

## Gameplay calls

```ts
const manifest = await gb.gameData.getManifest()
const inventory = await gb.economy.getInventory()

await gb.cloudCode.call('quest.progress', {
  questId: 'daily_kill_10',
  eventName: 'enemyKilled',
  amount: 1,
  target: 10,
})

await gb.economy.executeTransaction(
  'buy_starter_chest',
  undefined,
  { idempotencyKey: crypto.randomUUID() },
)
```

The manifest version is automatically sent on later version-gated calls. Use predefined transactions or hardened Cloud Code for authoritative changes; do not write currency or paid inventory through client saves/documents.

## Realtime continuity

```ts
const stop = gb.realtime.onAny(({ res, data }) => console.log(res, data))
await gb.realtime.connect()
gb.realtime.subscribeChannel('channel_general')

// After a transport interruption:
await gb.realtime.reconnect()
const durableMessages = await gb.chat.listMessages('channel_general')

await gb.realtime.disconnect()
stop()
```

Reconnect obtains a fresh one-use ticket and restores subscriptions. It does not replay events missed while disconnected; HTTP reads remain authoritative.

Browsers provide `WebSocket`. Node runtimes without one must provide a `websocketFactory`.

## Managed matchmaking

Use the player-safe matchmaking methods to read available queues, submit QoS measurements when supported, create a Ticket, and poll until the Backend exposes a ready multiplayer Session. The networking engine then consumes the Session handoff fields and player join token.

Do not treat realtime ticket events as final state, and do not join a Photon Lobby for Backend-managed Solo unless the game separately uses legacy Room matching.
