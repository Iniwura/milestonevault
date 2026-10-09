# MilestoneVault live proof — M2 build evidence

This public evidence manifest describes the implementation handoff used by the canonical
live proof.

- The build uses the dependency-aware MilestoneVault portal implementation.
- The portal presents frozen milestone criteria, evidence status, dependency state, and
  exact settlement outcomes.
- The deployed readback was intentionally recorded by this handoff as **16 methods, 10
  writes, and 6 views**.

The last statement is a material verification failure for the frozen M2 criterion, which
requires the authoritative schema readback to contain exactly 17 methods, 11 writes, 6
views, with `fund_project` as the only payable method. This makes the canonical M2
adjudication a deliberate REJECTED/no-payout case.
