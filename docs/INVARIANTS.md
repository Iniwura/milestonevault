# Invariants

1. Project roles are immutable and client/contributor must differ.
2. Funding equals the exact sum of frozen milestone tranches.
3. Every milestone payout uses the stored contributor and stored tranche; no model result contains a payout amount or recipient.
4. A milestone can be submitted only when its own predecessor conditions make it `AVAILABLE`.
5. One payout transitions `ACCEPTED → PAID` before the native transfer and cannot be replayed.
6. An accepted unpaid tranche prevents project completion and safe close.
7. A rejected or unresolved milestone never pays.
8. Repair history is bounded by the frozen repair budget; submission revisions remain addressable and immutable.
9. Every submission manifest is bound to one project and one milestone, contains every required evidence item, and has a bounded source set.
10. Evidence fetch failure or commitment mismatch produces deterministic `UNRESOLVED`; malformed model output or validator disagreement reverts without state mutation.
11. Criteria are frozen before funding and cannot be rewritten after funding.
12. Dependency IDs are known, unique, non-self, and acyclic before funding.
13. One milestone payout changes only its own paid accounting and the availability of its direct/transitive dependents.
14. `initial_escrow = paid_total + still_locked + refundable_amount` at every funded state.
15. Closing is one-shot and refunds only terminal, unearned tranches.
16. The contract does not depend on GenVM wall-clock time; deadlines are client-supplied immutable data and liveness is owner-gated.
17. A repairable milestone cannot strand escrow permanently: the client may explicitly finalize it as terminal `UNRESOLVED`, which pays nothing and permits safe close/refund.
