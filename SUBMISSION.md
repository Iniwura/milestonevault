# MilestoneVault submission packet

## One-line description

MilestoneVault is dependency-aware funded project settlement: every tranche is released only after its own immutable deliverable packet passes criterion-level GenLayer review, and only the correct downstream stages become available.

## Distinction

The application is not a one-condition promise, binary escrow, freelancer marketplace, or single commercial document matcher. Its core object is a bounded dependency graph of funded milestone tranches.

## Evidence in this repository

- Contract: `contracts/milestone_vault.py`
- Direct Mode adversarial tests: `tests/direct/test_milestone_vault.py`
- UI proof route: `frontend/src/main.tsx` at `/proof`
- Architecture and security packet: `docs/`

## Verification boundary

Local Direct Mode: 21 cases pass, covering the 22 adversarial behaviors in the audit matrix. GenVM lint, semantic validation, schema extraction, and the Pyright-backed contract typecheck pass against the actual pinned Studio Dev header. The frontend regression suite has 5 passing tests; frontend TypeScript and production build pass. Live Studio Dev deployment, native balance delta, source/schema readback, and observed transaction hashes remain pending the authorized public-release execution.
