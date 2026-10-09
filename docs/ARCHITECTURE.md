# MilestoneVault architecture

## Boundary

MilestoneVault is settlement infrastructure for a funded project plan. It is not a marketplace, generic dispute app, freelancer escrow, or one-condition promise.

The client and contributor roles are stored at project creation and cannot be changed. The client funds the exact sum of immutable milestone tranches. The contributor submits immutable evidence revisions. The client invokes semantic adjudication and the contributor invokes a successful payout.

## Frozen packet

Each milestone stores:

- deliverable definition;
- criterion list with required/optional flags;
- evidence requirements;
- exact native GEN tranche;
- sorted predecessor IDs;
- maximum repair count;
- absolute UTC deadline string;
- milestone fingerprint.

Funding snapshots the full project packet into `project_fingerprint`. There is no post-funding update path for any settlement-relevant field.

## Dependency graph

The graph is bounded to 32 milestones and 12 predecessors per milestone. Unknown, duplicate, self, and cyclic edges are rejected. Availability is derived from stored predecessor state:

- no predecessors, or every predecessor `PAID` → `AVAILABLE`;
- a predecessor is still moving → `LOCKED`;
- a predecessor is rejected, terminal unresolved, or blocked → `BLOCKED`;
- a predecessor is still `REPAIRABLE` → the dependent remains `LOCKED` until that repair window resolves;
- unrelated milestones are not touched by another milestone's payout.

The graph is validated before funding and dependencies are frozen by the funding transition.

If a contributor does not use a remaining repair, the client can explicitly finalize the repairable milestone as terminal `UNRESOLVED`; this is a no-payout liveness action that unlocks safe refund/close and makes descendants terminally blocked.

## Consensus boundary

`adjudicate_milestone` performs one bounded nondeterministic adjudication. Leader and validator independently fetch only the committed HTTPS manifest and independently evaluate the same frozen packet. They compare the payment-relevant criterion status core. If evidence is unavailable, both sides derive the same `UNRESOLVED` packet. If model output is malformed or validators disagree, the transaction reverts and the submission remains `SUBMITTED`; no partial settlement state is written.

## Evidence trust model

Evidence URLs are HTTPS-only, credential-free, fragment-free, and bounded. A manifest item is bound to the exact project and milestone IDs. Optional SHA-256 commitments are checked against rendered text. The fetched text is untrusted data inside a prompt with explicit prompt-injection isolation. A source hash proves the observed rendered content matched the submitted commitment; it does not prove that the content is truthful.
