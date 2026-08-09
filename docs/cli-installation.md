# CLI installation

## Install or upgrade

```bash
curl -fsSL https://github.com/locus84/gb-cli-distributions/releases/latest/download/install.sh | sh
```

The public distribution release contains:

- `gb-darwin-arm64`
- `gb-darwin-x64`
- `gb-linux-arm64`
- `gb-linux-x64`
- `checksums.txt`
- `install.sh`

The installer selects the native binary for the current OS and architecture. Release artifacts can also be downloaded and verified manually from [GitHub Releases](https://github.com/locus84/gb-cli-distributions/releases).

## Verify

```bash
gb version
gb help
gb upgrade --dry-run
```

## Authentication

Use the interactive CLI authentication flow or an explicitly scoped automation token. Never place player access tokens, operator refresh tokens, API keys, provider credentials, or managed-session tokens in shell history, source control, images, or logs.

Run `gb help` for the commands available in the installed release.
