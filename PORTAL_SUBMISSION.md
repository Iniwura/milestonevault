# MilestoneVault portal submission packet

MilestoneVault is a complete application for funded, dependency-aware project settlement. The reviewer walkthrough begins at the public proof route, not at a contract editor:

https://milestonevault-production.vercel.app/proof

## Public links

- GitHub: https://github.com/Iniwura/milestonevault
- Production: https://milestonevault-production.vercel.app
- Proof: https://milestonevault-production.vercel.app/proof
- Contract explorer: https://explorer-studio-dev.genlayer.com/address/0x8Af37bf06f8eE5A5eeCDe628F4bAD9f8501b5EE8

## Deployed contract

- Network: GenLayer Studio Dev
- Chain ID: 61997
- Contract: 0x8Af37bf06f8eE5A5eeCDe628F4bAD9f8501b5EE8
- Deployment transaction: https://explorer-studio-dev.genlayer.com/tx/0xf81ff8cb64715cab460501c0fb8ebd0c83615095d28fa6cf578bf52fec97b554
- Source: contracts/milestone_vault.py

## Canonical live proof

Project: milestonevault-live-20261009-b

The proof page reads the actual deployed contract without a wallet and presents:

- M1 PAID and the exact 0.01 GEN contributor payout.
- M2 REJECTED after material criterion failure, with no payout.
- M3 BLOCKED because M2 was rejected.
- M4 UNRESOLVED because unavailable evidence is terminal with repair budget zero.
- Project CLOSED.
- 0.04 GEN initial escrow, 0.01 GEN paid, 0.03 GEN refunded, and 0 GEN contract principal remaining after close.

The dependency consequence is explicit: M1 success → M2 unlocked; M2 rejection → M3 blocked. M4 is an independent fail-closed case. The failed milestonevault-live-20261009-a attempt is preserved as history and is not rewritten as successful proof.

## Final verification gates

- Direct Mode: 21 passed.
- Actual-contract lint: passed.
- Actual-contract semantic validation: passed.
- Actual-contract schema extraction: passed.
- Actual-contract typecheck: passed.
- Frontend tests: 5 passed.
- Frontend TypeScript: passed with exit 0.
- Frontend production build: passed with exit 0.
- Production routes: /, /projects, /projects/milestonevault-live-20261009-b, /projects/milestonevault-live-20261009-b/milestones/m1-design-b, /create, and /proof returned anonymous HTTP 200.
- Protection: password and SSO protection disabled; anonymous access verified.
- Production bundle: current contract address appears once; no superseded contract address appears.

## Portal status

This packet is prepared for review. No GenLayer Portal submission has been made.
