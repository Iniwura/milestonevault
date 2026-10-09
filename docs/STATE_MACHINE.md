# State machine

## Project

```text
DRAFT ──fund exact sum──> FUNDED ──activate──> ACTIVE
                                               │
                         all milestones terminal│
                                               ▼
                                          COMPLETED
                                               │
                                      safe close/refund
                                               ▼
                                            CLOSED
```

`DRAFT` permits adding milestones and editing dependencies. Funding validates and freezes the packet. `ACTIVE` permits submissions, adjudication, bounded repairs, and exact payout. `COMPLETED` is reached only when no milestone is still actionable, submitted, accepted-unpaid, or repairable. `CLOSED` returns only terminal unearned tranches.

## Milestone

```text
LOCKED ──predecessors paid──> AVAILABLE ──submit──> SUBMITTED
   ▲                                               │
   │                                               │ adjudicate
   │                                               ├──all required SATISFIED──> ACCEPTED ──pay──> PAID
   │                                               ├──required VIOLATED───────> REJECTED
   │                                               └──otherwise────────────────> UNRESOLVED
   │
   └────────── rejected/unresolved with budget ── REPAIRABLE ──repair──> SUBMITTED
                                                    │
                                                    └──client finalizes──> UNRESOLVED

A terminal failed predecessor can make a dependent milestone `BLOCKED`. A predecessor that is still `REPAIRABLE` keeps the dependent `LOCKED` so its tranche is not refundable before the repair window is resolved.
```

The first revision is `1`. A repair is allowed only when the current revision is less than or equal to the frozen repair budget, so a budget of `1` permits exactly one revision after the initial submission.

## Settlement law

- `ACCEPTED` → exact stored milestone tranche is payable to the stored contributor.
- `REJECTED` → no contributor payout.
- `UNRESOLVED` → no contributor payout.
- `PAID` → replay impossible.
- `CLOSED` → only unused, terminal tranches may have been refunded.
