# Cloud Code samples

The public repository includes an executable Cloud Code cookbook with eleven gameplay patterns, manifests, and fixture-based tests. Treat these as adaptation examples, not drop-in production game rules.

[:material-github: Browse the cookbook source](https://github.com/locus84/gb-cli-distributions/tree/main/samples/cloudcode-cookbook){ .md-button .md-button--primary }

## Start with a generated function

Create the smallest local project without connecting to a Backend:

```bash
gb cloudcode init --source ./cloudcode --name hello
gb cloudcode lint --source ./cloudcode
gb cloudcode test --source ./cloudcode hello --fixture ./cloudcode/fixtures/hello.json
```

`init` creates the function, `manifest.json`, local type declarations, and a fixture. Local tests execute the module and record transaction operations for assertions; they do not write production data.

Available scaffold templates include `hello`, `quest-progress`, `idle-income`, and `gacha-roll`:

```bash
gb cloudcode init --source ./cloudcode --template quest-progress
```

## Download and test the cookbook

```bash
git clone https://github.com/locus84/gb-cli-distributions.git
cd gb-cli-distributions/samples/cloudcode-cookbook

gb cloudcode lint --source cloudcode
gb cloudcode test --source cloudcode quest.progress \
  --fixture cloudcode/fixtures/quest.progress.json
gb cloudcode test --source cloudcode crafting.craftItem \
  --fixture cloudcode/fixtures/crafting.craftItem.json
```

The complete fixture set covers:

| Module | Pattern demonstrated | Production adaptation required |
| --- | --- | --- |
| `quest.progress` | progress document and completion reward | Read progress and quest definitions from authoritative state. |
| `idle.claimOffline` | capped elapsed-time reward | Read the last claim and multipliers from authoritative state. |
| `gacha.roll` | weighted roll, pity, reward, analytics | Never accept weights, seed, pity, or ownership from a player; add regulatory/audit controls. |
| `crafting.craftItem` | atomic material spend and item grant | Resolve recipes server-side; do not accept arbitrary costs or outputs. |
| `eventShop.purchase` | schedule and purchase-limit pattern | Resolve schedules, limits, prices, and rewards server-side. |
| `attendance.claimDaily` | streak and daily reward | Read the calendar and prior claims from authoritative state. |
| `battlePass.addXp` | XP and level progression | Only trusted events should award XP. |
| `battlePass.claimReward` | free/premium reward tracks | Uses `iap.readEntitlements`; resolve level and prior claims from authoritative state. |
| `upgrade.enhanceItem` | atomic cost, deterministic outcome, expected version | Resolve upgrade tables server-side and define auditable randomness. |
| `tutorial.claimReward` | one-time step reward | Verify completion and prior claims server-side. |
| `gameState.incrementSharded` | game-owned private state with CAS and deterministic shards | Resolve shard count and state keys server-side; do not use one hot document for high-write workloads. |

!!! warning "Examples are not anti-fraud policy"
    Fixture inputs intentionally make each example self-contained. A production player-callable function must not trust client-supplied balances, inventory, claim history, premium ownership, probability tables, reward definitions, timestamps, or progression state. Replace those inputs with authoritative reads or trusted server-triggered values.

## Manifest and least privilege

Every deployed module is declared in [`cloudcode/manifest.json`](https://github.com/locus84/gb-cli-distributions/blob/main/samples/cloudcode-cookbook/cloudcode/manifest.json). Keep its permissions narrow:

- `roles` controls which authenticated role may invoke the function.
- `scopes` controls the Cloud Code call capability.
- `serviceScopes` controls which Backend operations the sandbox may read or execute. Reads are available from `services`; writes are available only from the `tx` object passed to `services.transaction`. `gameState.read` / `gameState.write` grant only game-scoped state access. Public snapshot/profile reads require `documents.readPublic` and `profile.readPublic`; premium-access checks require `iap.readEntitlements`. Use `documents.writePublic` only for `tx.documents.putPublic` / `patchPublic`, which create server-authored `player_public_readonly` snapshots.
- A module using `tables.read` must also declare its bounded `tableIds`. Read tables asynchronously with `await services.tables.get(id, version?)`; the parent pins one immutable snapshot per table/version for the invocation and reuses a bounded process cache after revalidating the enabled version, instead of injecting the game's full table catalog.
- Remove every unused service scope when adapting a recipe.

Uploaded modules execute as untrusted data in a restricted sandbox. They do not receive arbitrary filesystem, network, environment-variable, or process access.

Key lookups resolve `null` when the row does not exist: `gameState.get`, `documents.get` and `matchResults.getSettlement` (not settled yet). Other reads that need their target, such as `matchResults.get` for an unknown match, fail with `NOT_FOUND`.

Inside `services.transaction`, a `tx` call that fails rolls back the whole transaction, even when the function catches the error: nothing written in the transaction commits, and the invocation fails with that first call's error (for example `404 NOT_FOUND` or `412 VERSION_CONFLICT`) no matter what the function does after catching it. Check for `null` instead of catching misses, do reads that may fail for other reasons with the read services (`services.*`) before entering the transaction, and let a conflicting `expectedVersion` or other failed write fail the call so the request or job retry handles it.

An intentional game-domain rejection may throw an `Error` with a bounded uppercase `code`. Callers receive platform `errorCode: FUNCTION_DOMAIN_ERROR` plus the separate `functionErrorCode`; arbitrary messages, stacks, and properties never cross the sandbox boundary. Reserved platform codes cannot be used as function-domain codes.

## Preview and deploy

Configure a `gb` profile for the target Backend and game, then review the managed diff before applying it:

```bash
cd samples/cloudcode-cookbook
gb sync diff --source .
gb sync apply --source . --dry-run
gb sync apply --source .
```

Production deployments should run from protected CI/CD with a reviewed manifest and deployer credentials. Do not commit access tokens or Backend secrets to the cookbook.

Call a deployed function with an authenticated profile:

```bash
gb cloudcode call quest.progress \
  '{"questId":"daily_kill_10","eventName":"enemyKilled","amount":1,"target":10}'
```

Game clients call a function by name without a version. The Backend then runs the latest enabled version, so a fixed version or a `gb cloudcode rollback` takes effect without a client release. A client that pins a version keeps running that code after a fix ships, and gets `409 FUNCTION_VERSION_REVOKED` once a rollback revokes it. Keep a function's input and output backward compatible; for a breaking change, add a new function name. Pin versions only in server-side bindings such as triggers and competitions, which operators can repoint immediately.

## Transactions, conflicts, and replay

Wrap every write-bearing flow in one short transaction and use only the callback's `tx` services inside it:

```js
exports.default = async ({ userId, services }) => services.transaction(async (tx) => {
  const wallet = await tx.economy.addCurrency(userId, 'gold', 10, 'quest')
  const visible = await tx.economy.getWallet(userId) // read-your-writes
  return { wallet, visible }
})
```

The callback runs on one PostgreSQL connection pinned to the function's game placement (or the existing global placement for global functions). Its reads observe earlier writes, write calls return their real service results, and domain writes plus the successful invocation output commit together. A thrown error, denied RPC, sandbox timeout/crash, database deadline, or dry-run rolls the transaction back. Nested transactions, transaction calls in parallel, external provider/network work, and service calls after transaction entry are unsupported. Keep the block DB-only and short.

There is no automatic callback retry. `expectedVersion: 0` creates only when the state document is absent; a positive version must match exactly. A conflict returns `VERSION_CONFLICT`, and the caller decides whether to fetch fresh state and submit a new request. Split high-write state across bounded documents—for example by season and deterministic player bucket—rather than concentrating every player on one hot row.

A request ID commits writes at most once. Once an invocation with that request ID has committed writes, reusing it (sequentially or concurrently) returns `409 IDEMPOTENCY_REPLAYED`, the same contract as economy, rewards, IAP, and match results; a concurrent duplicate's writes roll back. The output is never stored or returned again, so refresh authoritative state instead of retrying. A failed invocation may be retried with the same request ID. The dedupe window is 7 days by default. A different request ID is a new invocation, so game-level claim keys and transactions must still encode business idempotency where needed.

Promote a recipe into a first-class Backend feature when several games share its schema or when fraud, payment, legal, rollback, or audit requirements need stronger centralized guarantees.
