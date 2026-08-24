# Project and authentication setup

This guide assumes a gb Backend is already deployed and you have an operator account for its Operations API. Game clients use the separate Runtime API and never receive operator credentials.

## Create a development game

Install the CLI, then initialize the checkout:

```bash
gb init
```

There is no default backend. The interactive flow asks for the Operations URL, logs in if needed, selects an organisation, and lets you select or create a game. For automation, provide every required target value explicitly:

```bash
gb init --base-url https://ops.example.com --runtime-base-url https://runtime.example.com --org org_xxx --game game_dev_xxx
gb context
gb doctor
```

`game-backend.json` supplies local Ops/Runtime URLs, organisation, and game selection. Register additional games by immutable ID with `gb context add game_xxx`; CI should still use explicit `GB_GAME` and protected credentials.

## Apply the public starter

```bash
git clone https://github.com/locus84/gb-cli-distributions.git
cd gb-cli-distributions/samples/game-project-starter

gb sync diff --source .
gb sync apply --source . --dry-run
gb sync apply --source .
```

Always inspect the diff and dry run before mutation. The starter contains only non-secret definitions.

## Export client bootstrap configuration

```bash
gb sdk export --game game_dev_xxx --target unity \
  --out Assets/GameBackend/gamebackend.json

gb sdk export --game game_dev_xxx --target typescript \
  --out gamebackend.json

gb sdk verify --game game_dev_xxx
```

The export contains the Runtime URL, WebSocket URL, organisation ID, and game group key. A client combines these values with its application version to resolve a concrete game ID at startup.

## Operator auth and player auth are different

| Value | Client bundle? | Purpose |
| --- | --- | --- |
| Runtime URL | Yes | Player-facing API origin. |
| Organisation ID | Yes | Public game resolution. |
| Game group key / publishable client key | Yes | Runtime bootstrap, not operator authority. |
| Concrete game ID | Yes, if deliberately pinned | Tenant routing after resolution. |
| Player access/refresh token | Runtime storage only | Current player session; never commit or log. |
| `GB_TOKEN` / bot deployer token | **No** | Operations automation and protected deploys. |
| Provider client secret, IAP key, push credential | **No** | Server-side provider verification/delivery. |

Start a runtime test player only when needed:

```bash
gb auth anonymous --game game_dev_xxx \
  --game-group-key <publishable-group-key> \
  --save-player dev-player device-local-1
```

The saved player session is separate from operator credentials and must remain local.

## Protected production

Create production separately and protect it before applying content:

```bash
gb game create --protect mygame-prod  # copy returned game.id as PROD_GAME_ID
gb context add game_prod_xxx
gb launch checklist --game game_prod_xxx --target production
```

Use a game-scoped deployer bot in protected CI. Store `GB_BASE_URL`, `GB_GAME`, and `GB_TOKEN` as protected variables/secrets, run `gb sync diff`, and require a reviewed `gb sync apply --dry-run` before apply. Never copy a human refresh token into CI.
