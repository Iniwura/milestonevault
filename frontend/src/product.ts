export type ProjectState = "DRAFT" | "FUNDED" | "ACTIVE" | "COMPLETED" | "CLOSED" | string;
export type MilestoneState = "LOCKED" | "AVAILABLE" | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "UNRESOLVED" | "REPAIRABLE" | "PAID" | "BLOCKED" | string;
export type ProductRole = "client" | "contributor" | "observer";

export type MilestoneSummary = {
  milestone_id: string;
  state: MilestoneState;
  dependencies?: string[];
};

export type AccountingSummary = {
  initial_escrow?: number | string | bigint;
  paid_total?: number | string | bigint;
  still_locked?: number | string | bigint;
  refundable_amount?: number | string | bigint;
  balanced?: boolean;
};

export const TERMINAL_MILESTONE_STATES = ["PAID", "REJECTED", "UNRESOLVED", "BLOCKED"] as const;

export function isTerminalMilestoneState(state: string): boolean {
  return TERMINAL_MILESTONE_STATES.includes(state as (typeof TERMINAL_MILESTONE_STATES)[number]);
}

export function stateTone(state: string): "good" | "bad" | "warn" | "blue" | "ink" {
  if (["PAID", "ACCEPTED", "COMPLETED", "CLOSED", "SATISFIED"].includes(state)) return "good";
  if (["REJECTED", "BLOCKED", "VIOLATED"].includes(state)) return "bad";
  if (["UNRESOLVED", "REPAIRABLE"].includes(state)) return "warn";
  if (state === "AVAILABLE") return "blue";
  return "ink";
}

export function stateLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

export function dependencyPresentation(milestone: MilestoneSummary, milestones: MilestoneSummary[]) {
  const dependencies = milestone.dependencies || [];
  const byId = new Map(milestones.map((item) => [item.milestone_id, item]));
  const blockedBy = dependencies.filter((id) => ["REJECTED", "UNRESOLVED", "BLOCKED"].includes(byId.get(id)?.state || ""));
  const available = milestone.state === "AVAILABLE";
  const locked = milestone.state === "LOCKED" || milestone.state === "REPAIRABLE";
  return {
    status: milestone.state === "BLOCKED" || blockedBy.length ? "blocked" as const : available ? "available" as const : locked ? "locked" as const : "settled" as const,
    blockedBy,
    dependencyCount: dependencies.length,
    canSubmit: available,
  };
}

function toWei(value: number | string | bigint | undefined): bigint {
  try {
    return BigInt(value ?? 0);
  } catch {
    return 0n;
  }
}

export function accountingPresentation(accounting: AccountingSummary) {
  const values = {
    initialEscrow: toWei(accounting.initial_escrow),
    paidTotal: toWei(accounting.paid_total),
    stillLocked: toWei(accounting.still_locked),
    refundableAmount: toWei(accounting.refundable_amount),
  };
  const balancedByValues = values.initialEscrow === values.paidTotal + values.stillLocked + values.refundableAmount;
  return {
    values,
    balanced: accounting.balanced === true && balancedByValues,
    rows: [
      { key: "paid", label: "Paid", value: values.paidTotal },
      { key: "locked", label: "Still locked", value: values.stillLocked },
      { key: "refundable", label: "Refundable", value: values.refundableAmount },
    ],
  };
}

export type ActionKind = "FUND" | "ACTIVATE" | "REVIEW" | "CLOSE" | "SUBMIT" | "ADJUDICATE" | "REPAIR" | "FINALIZE_UNRESOLVED" | "SETTLE" | "NONE";

export function projectActionFor(state: ProjectState, role: ProductRole): ActionKind {
  if (state === "DRAFT" && role === "client") return "FUND";
  if (state === "FUNDED" && role === "client") return "ACTIVATE";
  if (state === "ACTIVE") return "REVIEW";
  if (state === "COMPLETED" && role === "client") return "CLOSE";
  return "NONE";
}

export function milestoneActionFor(state: MilestoneState, projectState: ProjectState, role: ProductRole): ActionKind {
  if (state === "AVAILABLE" && projectState === "ACTIVE" && role === "contributor") return "SUBMIT";
  if (state === "SUBMITTED" && projectState === "ACTIVE" && role === "client") return "ADJUDICATE";
  if (state === "REPAIRABLE" && projectState === "ACTIVE" && role === "contributor") return "REPAIR";
  if (state === "REPAIRABLE" && projectState === "ACTIVE" && role === "client") return "FINALIZE_UNRESOLVED";
  if (state === "ACCEPTED" && ["ACTIVE", "COMPLETED"].includes(projectState) && role === "contributor") return "SETTLE";
  return "NONE";
}

export type ProofCaseKey = "accepted" | "rejected" | "unresolved";

export function canonicalProofCase(key: ProofCaseKey) {
  const cases = {
    accepted: { route: "accepted-paid", milestoneState: "PAID", settlementLaw: "exact payout" },
    rejected: { route: "rejected-blocked", milestoneState: "REJECTED", settlementLaw: "hold tranche" },
    unresolved: { route: "unresolved-fail-closed", milestoneState: "UNRESOLVED", settlementLaw: "fail closed" },
  } as const;
  return cases[key];
}
