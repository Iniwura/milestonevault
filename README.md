# MilestoneVault

MilestoneVault is a funded multi-stage deliverable settlement application for GenLayer. A client freezes a project packet before funding: immutable milestone definitions, natural-language acceptance criteria, evidence requirements, exact GEN tranches, predecessor rules, repair allowance, and client-supplied UTC deadlines.

The application answers a different question from a one-off promise or binary escrow:

> Which exact funded stage of a multi-stage project has earned release, and what does that do to dependent future stages?

## Start with the live application

The primary reviewer route is the wallet-free, chain-backed proof page:

- Production: https://milestonevault-production.vercel.app/proof
- GitHub: https://github.com/Iniwura/milestonevault
- Network: GenLayer Studio Dev, chain 61997

The proof page reads the deployed contract directly and shows the canonical project milestonevault-live-20261009-b: M1 PAID, M2 REJECTED, M3 BLOCKED, M4 UNRESOLVED, project CLOSED, 0.01 GEN paid, and 0.03 GEN refunded.

## Current implementation

- contracts/milestone_vault.py — the immutable Intelligent Contract source.
- tests/direct/test_milestone_vault.py — 21 adversarial Direct Mode cases covering the 22 required behaviors.
- frontend/ — project registry, dependency-map dossier, milestone evidence dossier, builder, wallet adapter, and wallet-free proof route.
- docs/ — state machine, schema, invariants, threat model, architecture, and live proof report.

The deployed Studio Dev contract is 0x8Af37bf06f8eE5A5eeCDe628F4bAD9f8501b5EE8.
Its deployment transaction is
0xf81ff8cb64715cab460501c0fb8ebd0c83615095d28fa6cf578bf52fec97b554.
The failed milestonevault-live-20261009-a attempt is preserved as incident history; the canonical retry milestonevault-live-20261009-b completed and closed with one exact payout and an exact unused-value refund.

## Verification

The proven local Direct Mode command is:

~~~bash
/home/ini/proofgate/.venv/bin/gltest tests/direct -q
~~~

Result: 21 passed.

The actual contract source, including its real pinned Studio Dev dependency header, passes the GenVM gates with the proven local compatibility root:

~~~bash
GENVMROOT=/tmp/milestonevault-studio-current-compat GENVM_VERSION=vstudio-dev /home/ini/groundshift/.venv/bin/genvm-lint check contracts/milestone_vault.py
GENVMROOT=/tmp/milestonevault-studio-current-compat GENVM_VERSION=vstudio-dev /home/ini/groundshift/.venv/bin/genvm-lint validate --json contracts/milestone_vault.py
GENVMROOT=/tmp/milestonevault-studio-current-compat GENVM_VERSION=vstudio-dev /home/ini/groundshift/.venv/bin/genvm-lint schema --json contracts/milestone_vault.py
PATH="/home/ini/groundshift/.venv/bin:$PATH" GENVM_VERSION=vstudio-dev /home/ini/groundshift/.venv/bin/genvm-lint typecheck contracts/milestone_vault.py --json
~~~

requirements.txt pins pyright==1.1.411; no dependency addition was needed. The compatibility root is tooling configuration only. It does not alter the contract header or source.

The frontend gates are:

~~~bash
cd frontend
npm test
npm run typecheck
npm run build
~~~

The audited results are: 5 passed, TypeScript exit 0, and Vite production build exit 0. The production bundle is built with the deployed contract address above.

## State and settlement

Projects move DRAFT → FUNDED → ACTIVE → COMPLETED → CLOSED. Milestones move through LOCKED, AVAILABLE, SUBMITTED, ACCEPTED, REJECTED, UNRESOLVED, REPAIRABLE, PAID, or BLOCKED.

GenLayer sees only frozen contract data and fetched evidence. It returns criterion-level SATISFIED, VIOLATED, or UNRESOLVED with bounded witnesses. The contract derives the outcome. The model cannot choose an amount, recipient, dependency, repair count, or settlement action.

Native transfers use the current _Recipient(Address).emit_transfer(value=amount) path. The frontend uses genlayer-js for reads and writes.

## Release packet

- [Canonical live proof report](docs/live-proof/20261009-b-report.md)
- [Adversarial and accounting audit](docs/)
- [Complete application submission packet](PORTAL_SUBMISSION.md)
