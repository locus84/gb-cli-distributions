# Cloud Code samples

The public repository includes an executable Cloud Code cookbook with ten gameplay patterns, manifests, and fixture-based tests. Treat these as adaptation examples, not drop-in production game rules.

[:material-github: Browse the cookbook source](https://github.com/locus84/gb-cli-distributions/tree/main/samples/cloudcode-cookbook){ .md-button .md-button--primary }

## Start with a generated function

Create the smallest local project without connecting to a Backend:

```bash
gb cloudcode init --source ./cloudcode --name hello
gb cloudcode lint --source ./cloudcode
gb cloudcode test --source ./cloudcode hello --fixture ./cloudcode/fixtures/hello.json
```

`init` creates the function, `manifest.json`, local type declarations, and a fixture. Local tests execute the module and assert its result and queued service operations; they do not write production data.

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

!!! warning "Examples are not anti-fraud policy"
    Fixture inputs intentionally make each example self-contained. A production player-callable function must not trust client-supplied balances, inventory, claim history, premium ownership, probability tables, reward definitions, timestamps, or progression state. Replace those inputs with authoritative reads or trusted server-triggered values.

## Manifest and least privilege

Every deployed module is declared in [`cloudcode/manifest.json`](https://github.com/locus84/gb-cli-distributions/blob/main/samples/cloudcode-cookbook/cloudcode/manifest.json). Keep its permissions narrow:

- `roles` controls which authenticated role may invoke the function.
- `scopes` controls the Cloud Code call capability.
- `serviceScopes` controls which Backend operations the sandbox may queue or read. Public snapshot/profile reads require `documents.readPublic` and `profile.readPublic`; premium-access checks require `iap.readEntitlements`. Use `documents.writePublic` only for `services.documents.putPublic` / `patchPublic`, which create server-authored `player_public_readonly` snapshots.
- A module using `tables.read` must also declare its bounded `tableIds`. Read tables asynchronously with `await services.tables.get(id, version?)`; the parent pins one immutable snapshot per table/version for the invocation and reuses a bounded process cache after revalidating the enabled version, instead of injecting the game's full table catalog.
- Remove every unused service scope when adapting a recipe.

Uploaded modules execute as untrusted data in a restricted sandbox. They do not receive arbitrary filesystem, network, environment-variable, or process access.

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

## Retries and side effects

Cloud Code service operations are ordered and retry-safe only when the caller preserves the same request identity. If a transport retry creates a new request identity, rewards or writes can be repeated. Keep a stable request ID for retries and design game-level claim keys and transactions to be idempotent.

Promote a recipe into a first-class Backend feature when several games share its schema or when fraud, payment, legal, rollback, or audit requirements need stronger centralized guarantees.
