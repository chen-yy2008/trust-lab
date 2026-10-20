import { ids, validate } from "./engine";
import type { Config } from "./engine";
export type Report = {
  version: 1;
  id: string;
  name: string;
  date: string;
  kind: "match" | "tournament" | "evolution" | "comparison";
  config: Config;
  data: unknown;
};
export const storageKey = "trust-lab-v1";
export type Store = {
  reports: Report[];
  completed: number[];
  reduced: boolean;
  onboarded: boolean;
};
export const empty: Store = {
  reports: [],
  completed: [],
  reduced: false,
  onboarded: false,
};
function isConfig(c: unknown): c is Config {
  try {
    return !!c && typeof c === "object" && validate(c as Config).length === 0;
  } catch {
    return false;
  }
}
function isReport(r: unknown): r is Report {
  if (!r || typeof r !== "object") return false;
  const v = r as Report;
  return (
    v.version === 1 &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    v.name.length <= 160 &&
    typeof v.date === "string" &&
    Number.isFinite(Date.parse(v.date)) &&
    ["match", "tournament", "evolution", "comparison"].includes(v.kind) &&
    isConfig(v.config) &&
    validData(v.kind, v.data)
  );
}
function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function validHistory(h: unknown): boolean {
  return (
    Array.isArray(h) &&
    h.length > 0 &&
    h.length <= 500 &&
    h.every(
      (r) =>
        r &&
        ["C", "D"].includes(r.a) &&
        ["C", "D"].includes(r.b) &&
        ["C", "D"].includes(r.intendedA) &&
        ["C", "D"].includes(r.intendedB) &&
        finite(r.sa) &&
        finite(r.sb),
    )
  );
}
function validData(kind: Report["kind"], data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (kind === "match")
    return (
      typeof d.opponent === "string" &&
      ids.includes(d.opponent as (typeof ids)[number]) &&
      validHistory(d.history)
    );
  if (kind === "tournament")
    return (
      Array.isArray(d.selected) &&
      d.selected.length >= 2 &&
      d.selected.length <= 8 &&
      new Set(d.selected).size === d.selected.length &&
      d.selected.every((s) => ids.includes(s as (typeof ids)[number])) &&
      Array.isArray(d.matrix) &&
      d.matrix.length === d.selected.length &&
      d.matrix.every(
        (r) =>
          Array.isArray(r) &&
          r.length === (d.selected as unknown[]).length &&
          r.every(finite),
      ) &&
      Array.isArray(d.ranking) &&
      d.ranking.length === d.selected.length &&
      d.ranking.every(
        (r) =>
          r &&
          ids.includes(r.id) &&
          finite(r.total) &&
          finite(r.rounds) &&
          r.rounds > 0 &&
          finite(r.average) &&
          finite(r.cooperation) &&
          r.cooperation >= 0 &&
          r.cooperation <= 1,
      ) &&
      Array.isArray(d.logs) &&
      d.logs.length > 0 &&
      d.logs.length <= 360 &&
      d.logs.every(
        (l) =>
          l &&
          ids.includes(l.a) &&
          ids.includes(l.b) &&
          Number.isInteger(l.repeat) &&
          validHistory(l.history),
      )
    );
  if (kind === "evolution")
    return (
      Array.isArray(d.history) &&
      d.history.length <= 501 &&
      d.history.length > 0 &&
      d.history.every(
        (r) =>
          Array.isArray(r) &&
          r.length === 8 &&
          r.every((v) => finite(v) && v >= 0 && v <= 1) &&
          Math.abs(r.reduce((a, b) => a + b, 0) - 1) < 1e-6,
      ) &&
      Array.isArray(d.averages) &&
      d.averages.length === d.history.length &&
      d.averages.every(finite)
    );
  return (
    isConfig(d.configB) &&
    validData("evolution", d.a) &&
    validData("evolution", d.b)
  );
}
export function importReports(text: string): Report[] {
  if (text.length > 10_000_000) throw Error("文件超过 10 MB");
  const data = JSON.parse(text),
    items = Array.isArray(data) ? data : [data];
  if (items.length > 100 || !items.every(isReport))
    throw Error("报告格式或数据不合法，请导入 TRUST LAB 导出的 JSON");
  return items.map((r) => ({ ...r, id: crypto.randomUUID() }));
}
export function load(): { store: Store; error: string } {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { store: empty, error: "" };
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.reports) ||
      !parsed.reports.every(isReport) ||
      !Array.isArray(parsed.completed)
    )
      throw Error();
    return {
      store: {
        reports: parsed.reports,
        completed: parsed.completed.filter(
          (v: unknown) =>
            Number.isInteger(v) && Number(v) >= 0 && Number(v) < 7,
        ),
        reduced: parsed.reduced === true,
        onboarded: parsed.onboarded === true,
      },
      error: "",
    };
  } catch {
    return {
      store: empty,
      error: "本地存档无法读取，已安全启动。你可以重新导入备份。",
    };
  }
}
export function persist(store: Store) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(store));
    return "";
  } catch {
    return "浏览器存储不可用或空间已满；请导出 JSON 备份，本次结果仍在内存中。";
  }
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function csv(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((r) =>
        r
          .map((v) => {
            const s = String(v ?? "");
            const safe = /^[=+\-@]/.test(s) ? "'" + s : s;
            return '"' + safe.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
export function reportCSV(r: Report) {
  const d = r.data as Record<string, any>;
  if (r.kind === "match")
    return csv([
      [
        "round",
        "player",
        "opponent",
        "intended_player",
        "intended_opponent",
        "score_player",
        "score_opponent",
      ],
      ...d.history.map((v: any, i: number) => [
        i + 1,
        v.a,
        v.b,
        v.intendedA,
        v.intendedB,
        v.sa,
        v.sb,
      ]),
    ]);
  if (r.kind === "tournament")
    return csv([
      [
        "strategy",
        "opponent",
        "repeat",
        "round",
        "a",
        "b",
        "score_a",
        "score_b",
      ],
      ...d.logs.flatMap((l: any) =>
        l.history.map((v: any, i: number) => [
          l.a,
          l.b,
          l.repeat,
          i + 1,
          v.a,
          v.b,
          v.sa,
          v.sb,
        ]),
      ),
    ]);
  if (r.kind === "comparison")
    return csv([
      ["condition", "generation", ...ids, "mean_payoff"],
      ...["a", "b"].flatMap((k) =>
        d[k].history.map((v: number[], i: number) => [
          k,
          i,
          ...v,
          d[k].averages[i],
        ]),
      ),
    ]);
  return csv([
    ["generation", ...ids, "mean_payoff"],
    ...d.history.map((v: number[], i: number) => [i, ...v, d.averages[i]]),
  ]);
}
