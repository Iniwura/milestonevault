# Canonical live proof plan

This is the exact proof sequence to run after an explicit deployment/funding confirmation. It is not a claim that a live deployment has already happened.

1. Create `mv-proof-001` with client and contributor roles.
2. Add four `0.01 GEN` milestones in order: `m1-design`; `m2-build` depending on M1; `m3-handoff` depending on M2; and independent `m4-unavailable` as the fail-closed case. Set all four repair budgets to `0` for a one-pass close proof. M4 therefore becomes terminal `UNRESOLVED` on its first unavailable-evidence adjudication; it does not require `finalize_unresolved()` in this canonical run.
3. Fund exactly `0.04 GEN`; verify `initial_escrow` and the frozen packet fingerprint.
4. Activate; verify M1 and M4 are `AVAILABLE`, while M2 and M3 are `LOCKED`.
5. Submit committed design evidence; run GenLayer adjudication with all required criteria satisfied; verify `ACCEPTED` and no payout yet.
6. Settle M1; verify the contributor balance increases by exactly `0.01 GEN`, M1 is `PAID`, M2 is `AVAILABLE`, and M3 remains `LOCKED`.
7. Immediately replay `settle_milestone(M1)`; verify the write is rejected and no second transfer occurs.
8. Submit implementation evidence with one material failure; verify M2 is `REJECTED`, no payout occurs, and M3 becomes `BLOCKED` only after M2 reaches its terminal failure.
9. Submit the independent M4 manifest pointing to a preflight-verified HTTPS source that is unavailable/404; adjudicate; verify `UNRESOLVED`, no payout, and no change to M3.
10. Verify the project is `COMPLETED`, `paid_total = 0.01 GEN`, `refundable_amount = 0.03 GEN`, and `balanced = true`; close once and verify the client receives exactly `0.03 GEN`. The exact lifecycle is `ACTIVE → COMPLETED → CLOSED`: the final terminal milestone transition sets `COMPLETED`, and the client-only close then sets `CLOSED` before returning only terminal unearned tranches. A second close must revert.
11. In a separate repair-budget rehearsal, verify one bounded repair and then either terminal exhaustion or client finalization to `UNRESOLVED`; verify the unused tranche can close/refund.

## Accounting language

The canonical run funds `0.04 GEN` of escrow. M1 is the only earned tranche, so the contributor receives exactly `0.01 GEN`. Closing returns the three unearned terminal tranches to the client: the client receives back exactly `0.03 GEN`. The contract principal remaining after close is `0 GEN`. The client's economic spend is `0.01 GEN` plus network/protocol fees; this is not described as zero principal cost.

## Signed transaction sequence

The canonical sequence uses one client, one contributor, and one funded project. The client signs steps 1–7, 9, 13, and 15–17; the contributor signs steps 8, 10–12, and 14. All writes are zero-value except step 6. The replay and second-close writes are deliberate expected failures.

1. Client: `create_project("mv-proof-001", contributor, ...)` — zero value.
2. Client: `add_milestone(..., "m1-design", tranche=0.01 GEN, dependencies=[], repair_budget=0, ...)` — zero value.
3. Client: `add_milestone(..., "m2-build", tranche=0.01 GEN, dependencies=["m1-design"], repair_budget=0, ...)` — zero value.
4. Client: `add_milestone(..., "m3-handoff", tranche=0.01 GEN, dependencies=["m2-build"], repair_budget=0, ...)` — zero value.
5. Client: `add_milestone(..., "m4-unavailable", tranche=0.01 GEN, dependencies=[], repair_budget=0, ...)` — zero value.
6. Client: `fund_project("mv-proof-001")` — payable value exactly `0.04 GEN`.
7. Client: `activate_project("mv-proof-001")` — zero value.
8. Contributor: `submit_milestone("m1-design", valid_manifest)` — zero value.
9. Client: `adjudicate_milestone("m1-design")` — zero value; expect `ACCEPTED`.
10. Contributor: `settle_milestone("m1-design")` — zero value; expect exact `0.01 GEN` transfer.
11. Contributor: replay `settle_milestone("m1-design")` — zero value; expect rejection and no second transfer.
12. Contributor: `submit_milestone("m2-build", materially_failing_manifest)` — zero value.
13. Client: `adjudicate_milestone("m2-build")` — zero value; expect `REJECTED`, no payout, and M3 `BLOCKED`.
14. Contributor: `submit_milestone("m4-unavailable", unavailable_https_manifest)` — zero value; use a preflight-verified unavailable/404 HTTPS source.
15. Client: `adjudicate_milestone("m4-unavailable")` — zero value; expect terminal `UNRESOLVED`, no payout.
16. Client: `close_project("mv-proof-001")` — zero value; expect `COMPLETED → CLOSED` and exactly `0.03 GEN` refund.
17. Client: replay `close_project("mv-proof-001")` — zero value; expect rejection and no second refund.

The proof record must contain observed transaction hashes, receipts, source/schema readbacks, and balance deltas. Hashes must never be prefilled or invented.
