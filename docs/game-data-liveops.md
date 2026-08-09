# Game Data and LiveOps workflow

Keep non-secret game definitions in source control, preview the server diff, and apply them through the same authenticated APIs used by operators. Validation, tenant scope, protection, and audit rules still apply.

[:material-github: Browse the game-project starter](https://github.com/locus84/gb-cli-distributions/tree/main/samples/game-project-starter){ .md-button .md-button--primary }

## File-managed resources

A game-data directory can manage:

- Economy currencies, items, and predefined transactions
- Game tables
- Notices and event schedules
- Attendance calendars
- Guild policies
- IAP product definitions when provider policy is ready

The public starter intentionally omits IAP/provider configuration and Cloud Code.

## Preview before apply

```bash
git clone https://github.com/locus84/gb-cli-distributions.git
cd gb-cli-distributions/samples/game-project-starter

gb sync diff --source .
gb sync apply --source . --dry-run
gb sync apply --source .
```

Use development first. For protected production, run the same source through a game-scoped deployer in reviewed CI.

`game-backend.sync.json` declares which directories are managed. A managed source is authoritative for its supported resources, so review planned disables/deletes carefully. Destructive operations remain behind explicit command flags.

## Pull and backup

Export normalized server definitions:

```bash
gb game-data pull --out ./game-data
```

Review pulled changes before committing them. For a portable logical configuration snapshot:

```bash
gb game backup create --game game_dev_xxx --out game-dev-backup.json
gb game backup inspect game-dev-backup.json
gb game backup restore \
  --from game-dev-backup.json \
  --to-game game_restore_xxx \
  --dry-run
```

Logical backups exclude player/runtime state, purchases and receipts, audit logs, events, provider secrets, and Cloud Code source. Keep Cloud Code in its own reviewed source directory.

## LiveOps schedules

`schedules.json` contains time-bounded notices and events. Clients read active state through the Runtime SDK:

```csharp
var notices = await GB.LiveOps.ListNoticesAsync();
var schedules = await GB.LiveOps.ListEventSchedulesAsync();
var gameStatus = await GB.Sdk.GetGameStatusAsync();
```

```ts
const notices = await gb.liveOps.listNotices()
const schedules = await gb.liveOps.listEventSchedules()
const maintenance = await gb.liveOps.listMaintenance()
```

Update example timestamps before apply. Server time determines activation; clients should not unlock authoritative rewards from local clock checks.

## Atomic player transactions

The starter defines `buy_starter_chest`: spend 100 gold and grant one chest as one predefined server transaction. Player clients submit only the transaction ID and an idempotency key.

```bash
# Operator preview of the definition is done through sync diff/dry-run.
gb sync diff --source .
```

Do not expose arbitrary spend/grant specifications to players. Resolve prices, outputs, schedules, limits, and premium ownership from server-managed definitions or authoritative state.

## Recommended promotion path

1. Start non-secret definitions in version-controlled Game Data.
2. Use Cloud Code for small game-specific authoritative orchestration.
3. Promote repeated or high-risk patterns to first-class Backend features when payment, fraud, rollback, regulatory, or cross-game consistency requirements demand centralized guarantees.
