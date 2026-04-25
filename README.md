# Sentrix Faucet — moved

> ## ⚠ This repository has moved.
>
> Sentrix Faucet now lives in the SentrisCloud frontend monorepo:
>
> **[`sentriscloud/frontend`](https://github.com/Sentriscloud/frontend) → [`apps/faucet/`](https://github.com/Sentriscloud/frontend/tree/main/apps/faucet)**
>
> All future development, issues, and pull requests should go there.
> This repository is kept read-only for historical reference.

---

## Why the move

Per the SentrisCloud architecture decision (April 2026), all user-facing TypeScript apps consolidate into a single `pnpm` + Turborepo monorepo at `sentriscloud/frontend`. The `sentrix-labs` org is reserved for the protocol foundation; products live under the `sentriscloud` org.

## Where to find what was here

| Old path | New path |
| --- | --- |
| `sentrix-labs/sentrix-faucet` (root) | `sentriscloud/frontend/apps/faucet/` |
| `src/` | same, under `apps/faucet/src/` |
| `package.json` (`"name": "sentrix-faucet"`) | `apps/faucet/package.json` (`"name": "@sentriscloud/faucet"`) |
| Standalone `npm install` | Workspace-level: `pnpm install` at monorepo root |

Git history is preserved in the monorepo as a squashed migration commit.
