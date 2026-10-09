# Threat model

## In scope

- client attempting to rewrite a funded plan;
- contributor attempting to rewrite a submitted revision or self-declare acceptance;
- wrong project/milestone evidence binding;
- malformed or adversarial model results;
- validator disagreement;
- prompt injection inside rendered evidence;
- dependency cycles and accidental unlocks;
- duplicate payout and refund theft;
- native GEN accounting drift.

## Controls

- stored roles and caller checks;
- exact funding and per-milestone tranche accounting;
- immutable fingerprints and revision history;
- bounded JSON, URL, content, source, milestone, and dependency limits;
- deterministic graph validation and availability refresh;
- criterion-level result validation and contract-derived outcomes;
- independent evidence retrieval by leader and validator;
- explicit fail-closed behavior;
- current GenLayer native transfer interface;
- latest-nonfinal reads in the frontend.

## Residual risks

The contract cannot prove that a public evidence source is truthful, that a client invokes adjudication promptly, or that a wallet holder is the intended human. A source commitment proves rendered-content equality, not real-world provenance. Production deployment requires a fresh Studio Dev source/schema readback, live balance-before/after transfer proof, and anonymous reviewer replay.
