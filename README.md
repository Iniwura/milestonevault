# MilestoneVault

MilestoneVault is a funded multi-stage deliverable settlement application for GenLayer. A client freezes a project packet before funding: immutable milestone definitions, natural-language acceptance criteria, evidence requirements, exact GEN tranches, predecessor rules, repair allowance, and client-supplied UTC deadlines.

The application answers a different question from a one-off promise or binary escrow:

> Which exact funded stage of a multi-stage project has earned release, and what does that do to dependent future stages?

## Current implementation

- `contracts/milestone_vault.py` — the Intelligent Contract.
- `tests/direct/test_milestone_vault.py` — 21 adversarial Direct Mode cases covering the 22 required behaviors.
- `frontend/` — project registry, dependency-map dossier, milestone evidence dossier, builder, wallet adapter, and wallet-free proof route.
- `docs/` — state machine, schema, invariants, threat model, architecture, and proof plan.

The contract is intentionally not deployed by this implementation pass. No GEN was published or spent. The live-proof route contains no invented transaction hashes.

## Verification

The proven local Direct Mode command is:

```bash
/home/ini/proofgate/.venv/bin/gltest tests/direct -q
```

Result: `21 passed`.

The actual contract source, including its real pinned Studio Dev dependency header, passes the GenVM gates with the proven local compatibility root:

```bash
GENVMROOT=/tmp/matchpay-genvmroot GENVM_VERSION=vstudio-dev /home/ini/groundshift/.venv/bin/genvm-lint check contracts/milestone_vault.py
GENVMROOT=/tmp/matchpay-genvmroot GENVM_VERSION=vstudio-dev /home/ini/groundshift/.venv/bin/genvm-lint validate --json contracts/milestone_vault.py
GENVMROOT=/tmp/matchpay-genvmroot GENVM_VERSION=vstudio-dev /home/ini/groundshift/.venv/bin/genvm-lint schema --json contracts/milestone_vault.py
PATH="/home/ini/groundshift/.venv/bin:$PATH" GENVM_VERSION=vstudio-dev /home/ini/groundshift/.venv/bin/genvm-lint typecheck contracts/milestone_vault.py --json
```

`requirements.txt` already pins `pyright==1.1.411`; no dependency addition was needed. `genvm-lint typecheck` is the release command because it invokes Pyright with the extracted Studio Dev SDK paths and its documented SDK-compatibility suppressions. A bare Pyright invocation without those SDK paths cannot resolve GenLayer imports and is not the project typecheck command.

The frontend gates are:

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

The target runtime is Studio Dev chain `61997` with the official `genlayer-js` adapter and latest-nonfinal reads. The compatibility root is tooling configuration only; it does not alter the contract header or source.

## State and settlement

Projects move `DRAFT → FUNDED → ACTIVE → COMPLETED → CLOSED`. Milestones move through `LOCKED`, `AVAILABLE`, `SUBMITTED`, `ACCEPTED`, `REJECTED`, `UNRESOLVED`, `REPAIRABLE`, `PAID`, or `BLOCKED`.

GenLayer sees only frozen contract data and fetched evidence. It returns criterion-level `SATISFIED`, `VIOLATED`, or `UNRESOLVED` with bounded witnesses. The contract derives the outcome. The model cannot choose an amount, recipient, dependency, repair count, or settlement action.

Native transfers use the current `_Recipient(Address).emit_transfer(value=amount)` path. The frontend uses `genlayer-js` for reads and writes.
