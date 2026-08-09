# CloudCode gameplay cookbook

Executable CloudCode recipes for common in-game features. Use this pack when a feature is game-specific enough to start as CloudCode instead of a first-class backend domain.

> [!WARNING]
> These are adaptation examples, not production anti-fraud policy. Fixtures intentionally provide balances, ownership, claim history, reward definitions, probability inputs, and progression state so each module can run by itself. A player-callable production function must resolve those values from authoritative state or trusted server events.

## Recipes

These recipes are implemented as executable modules with assertion fixtures:

| Recipe | Status | Notes |
| --- | --- | --- |
| `quest.progress` | implemented | Increment progress, write quest state, and queue a completion reward. |
| `idle.claimOffline` | implemented | Compute capped offline income with ad/VIP multipliers, queue currency, and write claim state. |
| `gacha.roll` | implemented | Deterministic weighted roll with pity, duplicate conversion, queued reward, roll history write, and `gacha_roll` analytics event. |
| `crafting.craftItem` | implemented | Validate materials from input, queue crafted item grant, and write a craft record. |
| `eventShop.purchase` | implemented | Validate schedule and purchase limits, queue reward, and write purchase counter state. |
| `attendance.claimDaily` | implemented | Validate a calendar day, queue the day reward, and write streak/claim state. |
| `battlePass.addXp` | implemented | Add XP, compute pass level changes, and write progress state. |
| `battlePass.claimReward` | implemented | Validate free/premium reward eligibility, queue rewards, and write claim state. |
| `upgrade.enhanceItem` | implemented | Run a deterministic success/fail enhancement roll, queue success/compensation rewards, and write upgrade state. |
| `tutorial.claimReward` | implemented | Validate one-time tutorial step rewards, queue grants, and write tutorial claim state. |
| Authoritative inventory mutation | covered by patterns | `crafting.craftItem`, `eventShop.purchase`, and `upgrade.enhanceItem` demonstrate `economy.transaction` and expected-version item updates; add a standalone recipe only if users need a simpler focused example. |
| Fixture-based tests | implemented | Every module has `cloudcode/fixtures/<name>.json` using the `expect.result`, `expect.ops`, and `expect.opCount` envelope. |

The CLI scaffold templates are intentionally smaller than this cookbook: `gb cloudcode init --template` currently supports `hello`, `quest-progress`, `idle-income`, and `gacha-roll`. Use the cookbook directly for battle pass, attendance, crafting, event shop, tutorial, and upgrade examples until those patterns prove common enough for first-class templates.

## Local validation

All fixtures use the assertion envelope supported by `gb cloudcode test --fixture`.

```bash
gb cloudcode lint --source gameops-cloudcode-cookbook/cloudcode
gb cloudcode test --source gameops-cloudcode-cookbook/cloudcode quest.progress --fixture gameops-cloudcode-cookbook/cloudcode/fixtures/quest.progress.json
gb cloudcode test --source gameops-cloudcode-cookbook/cloudcode idle.claimOffline --fixture gameops-cloudcode-cookbook/cloudcode/fixtures/idle.claimOffline.json
gb cloudcode test --source gameops-cloudcode-cookbook/cloudcode gacha.roll --fixture gameops-cloudcode-cookbook/cloudcode/fixtures/gacha.roll.json
gb cloudcode test --source gameops-cloudcode-cookbook/cloudcode crafting.craftItem --fixture gameops-cloudcode-cookbook/cloudcode/fixtures/crafting.craftItem.json
gb cloudcode test --source gameops-cloudcode-cookbook/cloudcode eventShop.purchase --fixture gameops-cloudcode-cookbook/cloudcode/fixtures/eventShop.purchase.json
gb cloudcode test --source gameops-cloudcode-cookbook/cloudcode attendance.claimDaily --fixture gameops-cloudcode-cookbook/cloudcode/fixtures/attendance.claimDaily.json
gb cloudcode test --source gameops-cloudcode-cookbook/cloudcode battlePass.addXp --fixture gameops-cloudcode-cookbook/cloudcode/fixtures/battlePass.addXp.json
gb cloudcode test --source gameops-cloudcode-cookbook/cloudcode battlePass.claimReward --fixture gameops-cloudcode-cookbook/cloudcode/fixtures/battlePass.claimReward.json
gb cloudcode test --source gameops-cloudcode-cookbook/cloudcode upgrade.enhanceItem --fixture gameops-cloudcode-cookbook/cloudcode/fixtures/upgrade.enhanceItem.json
gb cloudcode test --source gameops-cloudcode-cookbook/cloudcode tutorial.claimReward --fixture gameops-cloudcode-cookbook/cloudcode/fixtures/tutorial.claimReward.json
```

To deploy the pack into the current game profile:

```bash
gb sync diff --source gameops-cloudcode-cookbook
gb sync apply --source gameops-cloudcode-cookbook --dry-run
gb sync apply --source gameops-cloudcode-cookbook
```

## Adaptation rules

- Keep fixtures next to each recipe and update `expect.result`, `expect.ops`, and `expect.opCount` whenever behavior changes.
- Never trust fixture-style client inputs for balances, inventory, premium ownership, prior claims, reward tables, probabilities, timestamps, or progression state in production.
- Preserve the same request identity across transport retries and add game-level idempotency keys for claims and rewards.
- Prefer compact config in fixture `input` until a repeated pattern deserves shared game-data tables or a first-class platform domain.
- Do not mutate balances or inventory directly from CloudCode. Prefer predefined economy transaction ids for client-callable flows, and use queued CloudCode service ops (`economy.executeTransaction`, `economy.transaction`, `documents.putAuthoritative`) for server-side logic.
- `crafting.craftItem`, `eventShop.purchase`, and `upgrade.enhanceItem` demonstrate `economy.transaction` for material/currency spend, item grants, and expectedVersion item mutation.

## When to promote to first-class support

Keep these as CloudCode while rules are game-specific and low-risk: tutorial rewards, per-game attendance calendars, simple quest progress, and simple idle calculations.

Promote a pattern to a first-class backend primitive when several games converge on the same schema/API or when risk demands shared guarantees:

- **Transactional economy spend/check-and-grant** now covers currency spend, item/material spend, item grants, and expectedVersion instance mutation for real crafting, upgrades, paid gacha, or event-shop purchases. CloudCode should not directly mutate or trust client-supplied balance/inventory state.
- **Battle pass** may deserve first-class support once premium ownership, paid rewards, seasons, legal/audit reporting, and duplicate-claim idempotency repeat across games.
- **Gacha** may deserve first-class support when probability disclosure, pity audit, purchase currency separation, or regulatory evidence is required.
- **Event shops/crafting/upgrades** may deserve first-class support when spend validation, rollback, fraud checks, and reward reversal need shared operations.
