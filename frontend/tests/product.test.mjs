import assert from "node:assert/strict";
import test from "node:test";
import {
  accountingPresentation,
  canonicalProofCase,
  dependencyPresentation,
  isTerminalMilestoneState,
  milestoneActionFor,
  projectActionFor,
  stateTone,
} from "../src/product.ts";

const wei = 10n ** 18n;

test("dependency presentation distinguishes available, locked, and blocked stages", () => {
  const m1 = { milestone_id: "m1", state: "PAID", dependencies: [] };
  const m2 = { milestone_id: "m2", state: "AVAILABLE", dependencies: ["m1"] };
  const m3 = { milestone_id: "m3", state: "LOCKED", dependencies: ["m2"] };
  assert.equal(dependencyPresentation(m2, [m1, m2, m3]).status, "available");
  assert.equal(dependencyPresentation(m3, [m1, m2, m3]).status, "locked");
  const rejectedM2 = { ...m2, state: "REJECTED" };
  const blockedM3 = { ...m3, state: "BLOCKED" };
  assert.deepEqual(dependencyPresentation(blockedM3, [m1, rejectedM2, blockedM3]).blockedBy, ["m2"]);
  assert.equal(dependencyPresentation(blockedM3, [m1, rejectedM2, blockedM3]).status, "blocked");
});

test("accounting presentation preserves the contract conservation equation", () => {
  const accounting = accountingPresentation({
    initial_escrow: 4n * wei,
    paid_total: wei,
    still_locked: wei,
    refundable_amount: 2n * wei,
    balanced: true,
  });
  assert.deepEqual(accounting.values, {
    initialEscrow: 4n * wei,
    paidTotal: wei,
    stillLocked: wei,
    refundableAmount: 2n * wei,
  });
  assert.equal(accounting.balanced, true);
  assert.deepEqual(accounting.rows.map((row) => row.key), ["paid", "locked", "refundable"]);
  assert.equal(accountingPresentation({ initial_escrow: 4n * wei, paid_total: wei, still_locked: 0n, refundable_amount: 0n, balanced: true }).balanced, false);
});

test("next-action derivation never offers a role-incompatible write", () => {
  assert.equal(projectActionFor("DRAFT", "client"), "FUND");
  assert.equal(projectActionFor("DRAFT", "contributor"), "NONE");
  assert.equal(projectActionFor("COMPLETED", "client"), "CLOSE");
  assert.equal(projectActionFor("CLOSED", "client"), "NONE");
  assert.equal(milestoneActionFor("AVAILABLE", "ACTIVE", "contributor"), "SUBMIT");
  assert.equal(milestoneActionFor("AVAILABLE", "ACTIVE", "client"), "NONE");
  assert.equal(milestoneActionFor("SUBMITTED", "ACTIVE", "client"), "ADJUDICATE");
  assert.equal(milestoneActionFor("ACCEPTED", "COMPLETED", "contributor"), "SETTLE");
  assert.equal(milestoneActionFor("REPAIRABLE", "ACTIVE", "contributor"), "REPAIR");
  assert.equal(milestoneActionFor("REPAIRABLE", "ACTIVE", "client"), "FINALIZE_UNRESOLVED");
});

test("terminal milestone states are presented as settled and have no write action", () => {
  for (const state of ["REJECTED", "UNRESOLVED", "BLOCKED", "PAID"]) {
    assert.equal(isTerminalMilestoneState(state), true);
    assert.equal(milestoneActionFor(state, "ACTIVE", "client"), "NONE");
    assert.equal(milestoneActionFor(state, "ACTIVE", "contributor"), "NONE");
  }
  assert.equal(stateTone("REJECTED"), "bad");
  assert.equal(stateTone("UNRESOLVED"), "warn");
  assert.equal(stateTone("BLOCKED"), "bad");
  assert.equal(stateTone("PAID"), "good");
});

test("proof route keys map to canonical settlement cases", () => {
  assert.deepEqual(canonicalProofCase("accepted"), { route: "accepted-paid", milestoneState: "PAID", settlementLaw: "exact payout" });
  assert.deepEqual(canonicalProofCase("rejected"), { route: "rejected-blocked", milestoneState: "REJECTED", settlementLaw: "hold tranche" });
  assert.deepEqual(canonicalProofCase("unresolved"), { route: "unresolved-fail-closed", milestoneState: "UNRESOLVED", settlementLaw: "fail closed" });
});
