# Portal reviewer notes

MilestoneVault is a complete application, not only an Intelligent Contract. Begin the reviewer walkthrough at:

https://milestonevault-production.vercel.app/proof

The proof route is wallet-free and reads the canonical project directly from the deployed Studio Dev contract.

## Reviewer packet

- GitHub: https://github.com/Iniwura/milestonevault
- Production: https://milestonevault-production.vercel.app
- Proof route: https://milestonevault-production.vercel.app/proof
- Contract explorer: https://explorer-studio-dev.genlayer.com/address/0x8Af37bf06f8eE5A5eeCDe628F4bAD9f8501b5EE8
- Contract: 0x8Af37bf06f8eE5A5eeCDe628F4bAD9f8501b5EE8
- Chain: GenLayer Studio Dev, 61997
- Deployment transaction: https://explorer-studio-dev.genlayer.com/tx/0xf81ff8cb64715cab460501c0fb8ebd0c83615095d28fa6cf578bf52fec97b554
- Canonical project: milestonevault-live-20261009-b
- Failed historical attempt: milestonevault-live-20261009-a, retained only as incident history

The reviewer should see:

1. the frozen plan object and dependency map;
2. the criterion packet for each selected milestone;
3. M1 PAID with an exact 0.01 GEN contributor payout;
4. M2 REJECTED with no payout;
5. M3 BLOCKED because M2 failed;
6. M4 UNRESOLVED as an independent fail-closed unavailable-evidence case;
7. CLOSED project accounting: 0.04 GEN funded, 0.01 GEN paid, 0.03 GEN returned.

The frontend does not display fabricated transaction links. Production uses only the deployed contract address above and the actual chain-backed project read.
