# gb game backend

`gb` is a game-backend CLI and runtime integration surface. This site contains the public installation and managed multiplayer integration contracts exported with each backend release.

## Install the CLI

```bash
curl -fsSL https://github.com/locus84/gb-cli-distributions/releases/latest/download/install.sh | sh
```

Verify the installation:

```bash
gb version
gb help
```

Native macOS and Linux binaries, checksums, and the install script are published in the [public release repository](https://github.com/locus84/gb-cli-distributions/releases).

## Cloud Code cookbook

The public repository includes ten executable gameplay recipes with least-privilege manifests and assertion fixtures. Start with the local workflow, inspect queued operations, then adapt every client-supplied rule to authoritative game state before production use.

- [Cloud Code samples and workflow](cloudcode-samples.md)
- [Browse the downloadable cookbook](https://github.com/locus84/gb-cli-distributions/tree/main/samples/cloudcode-cookbook)

## Managed multiplayer at a glance

```mermaid
sequenceDiagram
    participant C as Game client
    participant B as gb Backend
    participant W as Allocation worker
    participant G as Gameye
    participant S as Dedicated server
    participant P as Photon Fusion

    C->>B: Measure QoS and create Ticket
    B->>B: Form Match and freeze roster
    B->>W: Enqueue allocation
    W->>G: Allocate immutable server image
    G-->>W: Host and mapped ports
    S->>P: Start authoritative Fusion Session
    S->>B: Report ready
    B-->>C: Ready Session and player join token
    C->>P: Join named Fusion Session
    P->>S: Direct transport admission
    S->>B: Report authoritative results
    B->>W: Enqueue Gameye termination
```

The Backend remains authoritative for Ticket ownership, Match roster, Session lifecycle, player admission credentials, and result settlement. Gameye allocates the process; Photon Fusion provides Session discovery and game transport.

## Start here

- [Cloud Code samples and workflow](cloudcode-samples.md)
- [Managed multiplayer architecture](managed-multiplayer.md)
- [Gameye + Photon Fusion integration](gameye-fusion.md)
- [Lifecycle and troubleshooting](lifecycle-troubleshooting.md)
- [Security boundaries](security.md)
