# Security boundaries

## Credentials

Use independent scopes:

- a game-scoped provider token is stored only in protected Backend configuration;
- `GB_SESSION_TOKEN` authorizes only its managed Session's server APIs;
- `GB_JOIN_TOKEN_KEY` verifies player admission only for one Session;
- each player receives only its own compact `gbj1` credential.

Do not place long-lived operator tokens, game API keys, or provider credentials in a game-server image.

## Logging

Never log:

- access or refresh tokens;
- API keys;
- Gameye/provider tokens;
- `GB_SESSION_TOKEN`;
- `GB_JOIN_TOKEN_KEY`;
- player join tokens or Authorization headers.

Admission diagnostics may include a sanitized rejection category and, only after successful verification, the resolved player ID. Provider Session IDs and production endpoints should remain restricted operational evidence rather than public documentation examples.

## Fail-closed rules

Managed startup and admission must fail closed when:

- required Session scope is missing;
- the mapped Gameye public endpoint is missing or malformed;
- the player credential is malformed, expired, incorrectly signed, or scoped to another Game/Match/Session;
- the player is not in the Backend-authoritative roster;
- capacity or admission phase is closed.

Environment variables such as open-slot counts can describe capacity but must not grant authorization.

## Backend authority after credential issuance

Cryptographic expiry does not override operational state. The Backend must suppress player credentials and reject server calls after Session expiry, completion, failure, or termination, even when an immutable credential has remaining lifetime.

## Public documentation export

This site is exported from an explicit allowlist in the private source repository. The export must reject obvious secrets, private filesystem paths, and production identifiers. Internal test evidence, private game implementation details, and operational credentials are not published.
