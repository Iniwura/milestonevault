# Public schema

## Project creation

`create_project(project_id, contributor, title, scope)` stores the two frozen roles and project brief.

`add_milestone(project_id, milestone_id, title, deliverable_definition, criteria_json, evidence_requirements_json, tranche, dependencies_json, repair_budget, deadline_utc)` stores one immutable stage while the project is `DRAFT`.

Criterion JSON:

```json
{"criterion_id":"scope","requirement":"The artifact matches the frozen scope.","required":true}
```

Evidence requirement JSON:

```json
{"evidence_id":"deliverable","requirement":"Public deliverable packet.","required":true}
```

Submission manifest JSON:

```json
{"evidence_id":"deliverable","url":"https://example.com/artifact","sha256":"","project_id":"vault-1","milestone_id":"design"}
```

## Consensus result

```json
{
  "criteria":[
    {
      "criterion_id":"scope",
      "status":"SATISFIED",
      "witness_evidence_ids":["deliverable"],
      "observed_fact":"The committed artifact names the frozen scope."
    }
  ],
  "reasoning":"Bounded review metadata."
}
```

Only `status` for required criteria controls the derived outcome. `observed_fact` and `reasoning` are audit metadata.

## Reads

- `get_project_ids()`
- `get_project(project_id)`
- `get_milestone(project_id, milestone_id)`
- `get_submission(submission_id)`
- `get_project_fingerprint(project_id)`
- `get_accounting(project_id)`

## Writes

- `create_project(project_id, contributor, title, scope)`
- `add_milestone(project_id, milestone_id, title, deliverable_definition, criteria_json, evidence_requirements_json, tranche, dependencies_json, repair_budget, deadline_utc)`
- `set_dependencies(project_id, milestone_id, dependencies_json)`
- `fund_project(project_id)` — payable; exact native value must equal the sum of frozen tranches
- `activate_project(project_id)`
- `submit_milestone(project_id, milestone_id, manifest_json)`
- `repair_milestone(project_id, milestone_id, manifest_json)`
- `finalize_unresolved(project_id, milestone_id)` — client-gated terminalization of an unused repair window
- `adjudicate_milestone(project_id, milestone_id)`
- `settle_milestone(project_id, milestone_id)`
- `close_project(project_id)`

The extracted ABI contains 17 methods: 11 writes, 6 views, and exactly one payable method (`fund_project`).
