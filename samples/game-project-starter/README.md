# gb game-project starter

A non-secret, file-managed starter for a development game. It demonstrates currencies, catalog items, an atomic player transaction, weighted game tables, notices/events, attendance rewards, and guild policies.

## Preview and apply

Configure a development-game project first:

```bash
gb login --base-url https://ops.example.com
gb init --base-url https://ops.example.com --game game_dev_xxx
```

Then run from this directory:

```bash
gb sync diff --source .
gb sync apply --source . --dry-run
gb sync apply --source .
```

The committed `game-backend.sync.json` manages only `game-data/`; Cloud Code remains separate. Use the public Cloud Code cookbook if the project needs game-specific server logic.

## Contents

- `economy-currencies.json`: gold, gems, and replenishing energy.
- `economy-items.json`: starter consumable, chest, and material definitions.
- `economy-transactions.json`: `buy_starter_chest`, which atomically spends gold and grants an item.
- `game-tables.json`: weighted starter drops and enemy-wave configuration.
- `schedules.json`: example notice and event. Update the time window before applying.
- `attendance-calendars.json`: seven-day login rewards.
- `guild-policies.json`: sample guild creation/join limits.

## Safety

- Use this against a development game first and review `diff` plus `--dry-run` output.
- Definitions are non-secret; operator/deployer tokens are not.
- Player clients should execute predefined transaction IDs. Never let a client submit arbitrary spend/grant specifications.
- Premium currency and reward definitions are examples, not payment fulfillment.
- The sample omits IAP/provider credentials, player data, production identifiers, and Cloud Code.
- Managed sync may disable or delete resources according to the selected command flags. Protect production and deploy through reviewed CI.
