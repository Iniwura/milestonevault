# MilestoneVault submission packet

MilestoneVault is a complete production-style application for dependency-aware funded project settlement. The public reviewer experience starts at the wallet-free proof route:

https://milestonevault-production.vercel.app/proof

## One-line description

MilestoneVault freezes a funded multi-stage project plan, evaluates each stage against criterion-level evidence, releases only the exact earned tranche, and applies predecessor rules to downstream work.

## Distinction

The application is not a one-condition promise, binary escrow, freelancer marketplace, or single commercial document matcher. Its core object is a bounded dependency graph of funded milestone tranches with an explicit ledger and fail-closed adjudication.

## Application and chain

- GitHub: https://github.com/Iniwura/milestonevault
- Production: https://milestonevault-production.vercel.app
- Primary walkthrough: https://milestonevault-production.vercel.app/proof
- Network: GenLayer Studio Dev, chain 61997
- Contract explorer: https://explorer-studio-dev.genlayer.com/address/0x8Af37bf06f8eE5A5eeCDe628F4bAD9f8501b5EE8
- Contract address: 0x8Af37bf06f8eE5A5eeCDe628F4bAD9f8501b5EE8
- Deployment transaction: 0xf81ff8cb64715cab460501c0fb8ebd0c83615095d28fa6cf578bf52fec97b554
- Canonical project: milestonevault-live-20261009-b

## Canonical proof outcomes

- Initial escrow: 0.04 GEN
- M1 design: PAID; contributor receives exactly 0.01 GEN
- M2 implementation: REJECTED; material failure; no payout
- M3 handoff: BLOCKED by rejected M2
- M4 unavailable evidence: terminal UNRESOLVED; no payout
- Project: CLOSED
- Client refund: exactly 0.03 GEN
- Contract principal remaining after close: 0 GEN

The failed milestonevault-live-20261009-a attempt remains documented as incident history and is not presented as successful proof.

## Evidence in this repository

- Contract: contracts/milestone_vault.py
- Direct Mode adversarial tests: tests/direct/test_milestone_vault.py
- UI proof route: frontend/src/main.tsx at /proof
- Architecture and security packet: docs/
- Canonical live proof report: docs/live-proof/20261009-b-report.md

## Verification gates

- Direct Mode: 21 passed
- Contract lint: passed against the actual final source and pinned Studio Dev header
- Contract semantic validation: passed
- Contract schema extraction: passed
- Contract typecheck: passed through the GenVM linter Pyright integration
- Frontend regression suite: 5 passed
- Frontend TypeScript: passed, exit 0
- Frontend production build: passed, exit 0
- Production bundle: verified to use contract 0x8Af37bf06f8eE5A5eeCDe628F4bAD9f8501b5EE8
- Anonymous proof read: chain-backed, no wallet required

Portal submission itself has not been performed.
