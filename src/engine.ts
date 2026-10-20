export type Action = "C" | "D";
export const ids = [
  "cooperate",
  "defect",
  "tft",
  "generous",
  "grudger",
  "pavlov",
  "random",
  "opportunist",
] as const;
export type Strategy = (typeof ids)[number];
export type Payoff = { T: number; R: number; P: number; S: number };
export type Config = {
  payoff: Payoff;
  rounds: number;
  mode: "fixed" | "random";
  stop: number;
  noise: number;
  seed: number;
  forgiveness: number;
  cooperation: number;
  disguise: number;
  exploit: number;
  repeats: number;
  beta: number;
  mutation: number;
  generations: number;
  population: number[];
};
export const defaults: Config = {
  payoff: { T: 5, R: 3, P: 1, S: 0 },
  rounds: 30,
  mode: "fixed",
  stop: 0.05,
  noise: 0,
  seed: 2026,
  forgiveness: 0.3,
  cooperation: 0.5,
  disguise: 3,
  exploit: 0.8,
  repeats: 3,
  beta: 1,
  mutation: 0.01,
  generations: 100,
  population: ids.map(() => 1),
};
export type Round = {
  a: Action;
  b: Action;
  intendedA: Action;
  intendedB: Action;
  sa: number;
  sb: number;
};
export const meta: Record<
  Strategy,
  {
    name: string;
    short: string;
    color: string;
    symbol: string;
    rule: string;
    code: string;
    strength: string;
    weakness: string;
    environment: string;
  }
> = {
  cooperate: {
    name: "永远合作",
    short: "合作者",
    color: "#8bd4b5",
    symbol: "◎",
    rule: "无论历史如何，每一轮都选择合作。",
    code: "return C",
    strength: "与互惠策略建立稳定合作，获得 R。",
    weakness: "无法阻止持续利用自己的背叛者。",
    environment: "合作稳定、剥削风险低的环境",
  },
  defect: {
    name: "永远背叛",
    short: "背叛者",
    color: "#e5ad70",
    symbol: "◆",
    rule: "无论历史如何，每一轮都选择背叛。",
    code: "return D",
    strength: "在单次标准囚徒困境中占优。",
    weakness: "与报复策略长期互动会陷入低收益。",
    environment: "短期或无法再次相遇的互动",
  },
  tft: {
    name: "以牙还牙",
    short: "互惠者",
    color: "#85b9de",
    symbol: "⇄",
    rule: "首轮合作，随后复制对手上一轮的实际行动。",
    code: "round == 0 ? C : opponent.last",
    strength: "友善开局，及时报复，可重新合作。",
    weakness: "行动噪声可能触发报复循环。",
    environment: "重复相遇、误差较低的环境",
  },
  generous: {
    name: "宽容的以牙还牙",
    short: "宽恕者",
    color: "#b5c993",
    symbol: "✳",
    rule: "首轮合作。对手上轮合作则合作；背叛则以宽恕概率合作。",
    code: "opponent.last == D ? chance(g) : C",
    strength: "有机会打断误判造成的报复。",
    weakness: "宽恕过多时易被持续背叛者利用。",
    environment: "重复互动且存在少量噪声",
  },
  grudger: {
    name: "记仇者",
    short: "记仇者",
    color: "#d5979c",
    symbol: "⌁",
    rule: "开始合作；历史中观察到一次背叛后，永久背叛。",
    code: "opponent.history.includes(D) ? D : C",
    strength: "威慑利用行为。",
    weakness: "一次误差就可能永久破坏合作。",
    environment: "信号准确且背叛代价明确",
  },
  pavlov: {
    name: "赢则保持、输则改变",
    short: "适应者",
    color: "#b3a4de",
    symbol: "◈",
    rule: "首轮合作。上轮收益为 R 或 T 时保持自己的实际行动，否则切换。",
    code: "last.score in [R,T] ? own.last : flip(own.last)",
    strength: "可修复互惠中的偶发误差。",
    weakness: "面对持续背叛会交替受损。",
    environment: "收益反馈清晰的重复环境",
  },
  random: {
    name: "随机策略",
    short: "随机者",
    color: "#cfb3d2",
    symbol: "⁙",
    rule: "每轮独立，以配置的概率选择合作。",
    code: "rng() < cooperation ? C : D",
    strength: "行为不由对手历史直接预测。",
    weakness: "无法主动建立稳定互惠。",
    environment: "作为随机基线或不确定性对照",
  },
  opportunist: {
    name: "伪装型机会主义者",
    short: "机会者",
    color: "#c4bc8e",
    symbol: "◐",
    rule: "伪装期必合作；随后，若对手最近三轮至少两次合作，以利用概率背叛；否则复制对手上一轮。",
    code: "n < disguise ? C : recentC >= 2 ? chance(exploit,D,C) : opponent.last",
    strength: "利用持续合作的对手。",
    weakness: "会激活记仇和报复，长期收益受环境影响。",
    environment: "可观察历史且合作方较多",
  },
};
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const flip = (a: Action): Action => (a === "C" ? "D" : "C");
export function scores(a: Action, b: Action, p: Payoff): [number, number] {
  return a === "C"
    ? b === "C"
      ? [p.R, p.R]
      : [p.S, p.T]
    : b === "C"
      ? [p.T, p.S]
      : [p.P, p.P];
}
export function conditions(p: Payoff) {
  return {
    dilemma: p.T > p.R && p.R > p.P && p.P > p.S,
    cooperation: 2 * p.R > p.T + p.S,
  };
}
export function validate(c: Config) {
  const errors: string[] = [];
  for (const k of ["T", "R", "P", "S"] as const)
    if (!Number.isFinite(c.payoff[k]) || Math.abs(c.payoff[k]) > 100)
      errors.push(`${k} 必须在 -100 到 100 之间`);
  for (const k of [
    "noise",
    "stop",
    "forgiveness",
    "cooperation",
    "exploit",
    "mutation",
  ] as const)
    if (!Number.isFinite(c[k]) || c[k] < 0 || c[k] > 1)
      errors.push(`${k} 必须在 0 到 1 之间`);
  for (const [k, max] of [
    ["rounds", 500],
    ["repeats", 10],
    ["generations", 500],
    ["disguise", 100],
  ] as const)
    if (!Number.isInteger(c[k]) || c[k] < 1 || c[k] > max)
      errors.push(`${k} 必须是 1–${max} 的整数`);
  if (!["fixed", "random"].includes(c.mode)) errors.push("未知的终止规则");
  if (!Number.isInteger(c.seed) || c.seed < 0 || c.seed > 4294967295)
    errors.push("随机种子必须是 0–4294967295 的整数");
  if (!Number.isFinite(c.beta) || c.beta < 0 || c.beta > 20)
    errors.push("选择强度必须在 0–20 之间");
  if (
    c.population.length !== 8 ||
    c.population.some((v) => !Number.isFinite(v) || v < 0 || v > 100000) ||
    c.population.reduce((a, b) => a + b, 0) <= 0
  )
    errors.push("群体权重必须非负且总和大于零");
  return errors;
}
export function choose(
  s: Strategy,
  h: readonly Round[],
  side: "a" | "b",
  c: Config,
  random: () => number,
): Action {
  const other = side === "a" ? "b" : "a",
    last = h.at(-1),
    opp = last?.[other] ?? "C";
  switch (s) {
    case "cooperate":
      return "C";
    case "defect":
      return "D";
    case "tft":
      return opp;
    case "generous":
      return opp === "C" || random() < c.forgiveness ? "C" : "D";
    case "grudger":
      return h.some((r) => r[other] === "D") ? "D" : "C";
    case "pavlov":
      if (!last) return "C";
      return [c.payoff.R, c.payoff.T].includes(side === "a" ? last.sa : last.sb)
        ? last[side]
        : flip(last[side]);
    case "random":
      return random() < c.cooperation ? "C" : "D";
    case "opportunist":
      if (h.length < c.disguise) return "C";
      if (h.slice(-3).filter((r) => r[other] === "C").length >= 2)
        return random() < c.exploit ? "D" : "C";
      return opp;
  }
}
// Decide both intended actions against the same immutable past, then apply noise.
export function step(
  h: readonly Round[],
  a: Strategy | Action,
  b: Strategy,
  c: Config,
  random: () => number,
): Round {
  const intendedA = a === "C" || a === "D" ? a : choose(a, h, "a", c, random),
    intendedB = choose(b, h, "b", c, random);
  const actualA = random() < c.noise ? flip(intendedA) : intendedA,
    actualB = random() < c.noise ? flip(intendedB) : intendedB;
  const [sa, sb] = scores(actualA, actualB, c.payoff);
  return { a: actualA, b: actualB, intendedA, intendedB, sa, sb };
}
export function match(a: Strategy, b: Strategy, c: Config, seed = c.seed) {
  const errors = validate(c);
  if (errors.length) throw Error(errors.join("；"));
  const random = rng(seed),
    history: Round[] = [];
  for (let i = 0; i < c.rounds; i++) {
    history.push(step(history, a, b, c, random));
    if (c.mode === "random" && random() < c.stop) break;
  }
  return history;
}
export function stats(h: readonly Round[], side: "a" | "b" = "a") {
  const total = h.reduce((s, r) => s + (side === "a" ? r.sa : r.sb), 0),
    coop = h.filter((r) => r[side] === "C").length;
  return {
    total,
    average: h.length ? total / h.length : 0,
    cooperation: h.length ? coop / h.length : 0,
    defection: h.length ? 1 - coop / h.length : 0,
    rounds: h.length,
  };
}
export type Tournament = ReturnType<typeof tournament>;
export function tournament(selected: Strategy[], c: Config) {
  if (selected.length < 2 || new Set(selected).size !== selected.length)
    throw Error("至少选择两种不同策略");
  const matrix = selected.map(() => selected.map(() => 0)),
    cooperation = matrix.map((r) => r.slice()),
    logs: { a: Strategy; b: Strategy; repeat: number; history: Round[] }[] = [],
    totals = selected.map(() => ({ total: 0, rounds: 0, coops: 0 }));
  for (let i = 0; i < selected.length; i++)
    for (let j = i; j < selected.length; j++) {
      let rounds = 0,
        ai = 0,
        bj = 0,
        ac = 0,
        bc = 0;
      for (let k = 0; k < c.repeats; k++) {
        const history = match(
          selected[i],
          selected[j],
          c,
          (c.seed +
            ids.indexOf(selected[i]) * 100003 +
            ids.indexOf(selected[j]) * 1009 +
            k * 97) >>>
            0,
        );
        logs.push({ a: selected[i], b: selected[j], repeat: k + 1, history });
        const a = stats(history),
          b = stats(history, "b");
        rounds += history.length;
        ai += a.total;
        bj += b.total;
        ac += a.cooperation * history.length;
        bc += b.cooperation * history.length;
      }
      matrix[i][j] = ai / rounds;
      matrix[j][i] = bj / rounds;
      cooperation[i][j] = ac / rounds;
      cooperation[j][i] = bc / rounds;
      if (i === j) {
        matrix[i][i] = (ai + bj) / (2 * rounds);
        cooperation[i][i] = (ac + bc) / (2 * rounds);
        totals[i].total += (ai + bj) / 2;
        totals[i].rounds += rounds;
        totals[i].coops += (ac + bc) / 2;
      } else {
        totals[i].total += ai;
        totals[j].total += bj;
        totals[i].rounds += rounds;
        totals[j].rounds += rounds;
        totals[i].coops += ac;
        totals[j].coops += bc;
      }
    }
  return {
    selected,
    matrix,
    cooperation,
    logs,
    ranking: selected
      .map((id, i) => ({
        id,
        ...totals[i],
        average: totals[i].total / totals[i].rounds,
        cooperation: totals[i].coops / totals[i].rounds,
      }))
      .sort((a, b) => b.average - a.average),
  };
}
export function normalize(x: number[]) {
  const total = x.reduce((a, b) => a + b, 0);
  if (total <= 0) throw Error("初始群体不能为空");
  return x.map((v) => v / total);
}
export function generation(
  x: number[],
  matrix: number[][],
  beta: number,
  mu: number,
) {
  const payoff = x.map((_, i) =>
      matrix[i].reduce((s, p, j) => s + p * x[j], 0),
    ),
    average = payoff.reduce((s, p, i) => s + p * x[i], 0);
  // log-sum-exp shift avoids exponential overflow, including high selection pressure.
  const logs = x.map((v, i) =>
      v > 0 ? Math.log(v) + beta * (payoff[i] - average) : -Infinity,
    ),
    max = Math.max(...logs),
    w = logs.map((v) => Math.exp(v - max)),
    sum = w.reduce((a, b) => a + b, 0);
  return {
    next: normalize(w.map((v) => ((1 - mu) * v) / sum + mu / x.length)),
    payoff,
    average,
  };
}
export type Evolution = ReturnType<typeof evolve>;
export function evolve(c: Config) {
  const game = tournament([...ids], c),
    history: number[][] = [normalize(c.population)],
    averages: number[] = [],
    payoffs: number[][] = [],
    cooperationHistory: number[] = [];
  for (let i = 0; i <= c.generations; i++) {
    const x = history[i],
      g = generation(x, game.matrix, c.beta, c.mutation);
    averages.push(g.average);
    payoffs.push(g.payoff);
    cooperationHistory.push(
      x.reduce(
        (sum, xi, a) =>
          sum + xi * game.cooperation[a].reduce((s, v, b) => s + v * x[b], 0),
        0,
      ),
    );
    if (i < c.generations) history.push(g.next);
  }
  return {
    history,
    averages,
    payoffs,
    cooperationHistory,
    matrix: game.matrix,
  };
}
