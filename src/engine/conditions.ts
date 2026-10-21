/**
 * Condition mini-language used by scene routes.
 *
 *   trust >= 3
 *   trust >= 3 && fluency > 6
 *   chose:e1_c3b && chose:e1_c5c
 *   fluency <= 4 || chose:e3_c3b
 *   !chose:e2_c1a
 *
 * `&&` binds tighter than `||`. No parentheses (keep content simple).
 */

export const STAT_KEYS = ["trust", "fluency"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export type ConditionContext = { stats: Stats; chosen: ReadonlySet<string> };

type Clause =
  | { kind: "stat"; stat: StatKey; op: Op; value: number }
  | { kind: "chose"; choiceId: string; negate: boolean }
  | { kind: "true" };
type Op = ">=" | "<=" | ">" | "<" | "==" | "!=";
export type Condition = Clause[][]; // OR of ANDs

const STAT_RE = /^(trust|fluency)\s*(>=|<=|==|!=|>|<)\s*(-?\d+)$/;
const CHOSE_RE = /^(!?)chose:([A-Za-z0-9_-]+)$/;

export function parseCondition(expr: string): Condition {
  const trimmed = expr.trim();
  if (!trimmed) throw new Error("empty condition");
  return trimmed.split("||").map((orPart) =>
    orPart.split("&&").map((raw): Clause => {
      const part = raw.trim();
      if (part === "true") return { kind: "true" };
      const s = part.match(STAT_RE);
      if (s) return { kind: "stat", stat: s[1] as StatKey, op: s[2] as Op, value: Number(s[3]) };
      const c = part.match(CHOSE_RE);
      if (c) return { kind: "chose", choiceId: c[2], negate: c[1] === "!" };
      throw new Error(`cannot parse condition clause "${part}" in "${expr}"`);
    }),
  );
}

/** Choice ids referenced by a condition (for validation). */
export function referencedChoices(expr: string): string[] {
  return parseCondition(expr)
    .flat()
    .flatMap((c) => (c.kind === "chose" ? [c.choiceId] : []));
}

function compare(a: number, op: Op, b: number): boolean {
  switch (op) {
    case ">=": return a >= b;
    case "<=": return a <= b;
    case ">": return a > b;
    case "<": return a < b;
    case "==": return a === b;
    case "!=": return a !== b;
  }
}

export function evaluateCondition(expr: string, ctx: ConditionContext): boolean {
  return parseCondition(expr).some((andGroup) =>
    andGroup.every((clause) => {
      switch (clause.kind) {
        case "true": return true;
        case "stat": return compare(ctx.stats[clause.stat], clause.op, clause.value);
        case "chose": return ctx.chosen.has(clause.choiceId) !== clause.negate;
      }
    }),
  );
}
