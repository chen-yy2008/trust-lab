import { useId, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ids, meta, conditions, validate } from "./engine";
import type { Config, Strategy } from "./engine";
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export const num = (n: number) => n.toFixed(2);
export function Button({
  children,
  onClick,
  kind = "",
  disabled = false,
  type = "button",
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  [key: string]: unknown;
}) {
  return (
    <button
      {...rest}
      type={type}
      className={`button ${kind}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Panel({
  title,
  tag,
  children,
  className = "",
}: {
  title?: string;
  tag?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {tag && <span className="micro">{tag}</span>}
        </div>
      )}
      {children}
    </section>
  );
}
export function Field({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="number"
        value={Number.isNaN(value) ? "" : value}
        min={min}
        max={max}
        step={step}
        onChange={(e) =>
          onChange(e.target.value === "" ? NaN : Number(e.target.value))
        }
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function StrategySelect({
  value,
  onChange,
  label = "对手策略",
}: {
  value: Strategy;
  onChange: (s: Strategy) => void;
  label?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Strategy)}
      >
        {ids.map((s) => (
          <option key={s} value={s}>
            {meta[s].name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function ConfigFields({
  config: c,
  onChange,
  full = false,
}: {
  config: Config;
  onChange: (c: Config) => void;
  full?: boolean;
}) {
  const set = (k: keyof Config, v: unknown) => onChange({ ...c, [k]: v });
  return (
    <>
      <div className="field-grid">
        <Field
          label="每场最多回合"
          value={c.rounds}
          onChange={(v) => set("rounds", v)}
          min={1}
          max={500}
        />
        <Field
          label="行动噪声"
          value={c.noise}
          onChange={(v) => set("noise", v)}
          min={0}
          max={1}
          step={0.01}
        />
        <Field
          label="随机种子"
          value={c.seed}
          onChange={(v) => set("seed", v)}
          min={0}
          max={4294967295}
        />
        <Field
          label="重复次数"
          value={c.repeats}
          onChange={(v) => set("repeats", v)}
          min={1}
          max={10}
        />
      </div>
      {full && (
        <>
          <div className="field-grid">
            <label className="field">
              <span>终止规则</span>
              <select
                value={c.mode}
                onChange={(e) => set("mode", e.target.value)}
              >
                <option value="fixed">固定回合</option>
                <option value="random">随机终止（回合数为上限）</option>
              </select>
            </label>
            <Field
              label="每轮结束概率"
              value={c.stop}
              onChange={(v) => set("stop", v)}
              min={0}
              max={1}
              step={0.01}
            />
            <Field
              label="宽恕概率"
              value={c.forgiveness}
              onChange={(v) => set("forgiveness", v)}
              min={0}
              max={1}
              step={0.05}
            />
            <Field
              label="随机策略合作概率"
              value={c.cooperation}
              onChange={(v) => set("cooperation", v)}
              min={0}
              max={1}
              step={0.05}
            />
            <Field
              label="伪装合作回合"
              value={c.disguise}
              onChange={(v) => set("disguise", v)}
              min={1}
              max={100}
            />
            <Field
              label="机会者利用概率"
              value={c.exploit}
              onChange={(v) => set("exploit", v)}
              min={0}
              max={1}
              step={0.05}
            />
          </div>
          <h3>收益矩阵</h3>
          <div className="field-grid">
            {(["R", "T", "S", "P"] as const).map((k, i) => (
              <Field
                key={k}
                label={`${k} · ${["互惠奖励", "背叛诱惑", "合作受损", "共同背叛"][i]}`}
                value={c.payoff[k]}
                onChange={(v) => set("payoff", { ...c.payoff, [k]: v })}
                min={-100}
                max={100}
              />
            ))}
          </div>
          <p className="note">
            {conditions(c.payoff).dilemma
              ? "✓ T > R > P > S：符合囚徒困境。"
              : "△ 不满足 T > R > P > S，这是一种其他收益博弈。"}{" "}
            {conditions(c.payoff).cooperation
              ? "✓ 2R > T + S。"
              : "△ 2R ≤ T + S：轮流利用可能不劣于互惠。"}
          </p>
        </>
      )}
      {validate(c).length > 0 && (
        <p role="alert" className="error">
          {validate(c).join("；")}
        </p>
      )}
    </>
  );
}
export function EvolutionFields({
  config: c,
  onChange,
}: {
  config: Config;
  onChange: (c: Config) => void;
}) {
  return (
    <>
      <div className="field-grid">
        <Field
          label="选择强度 β"
          value={c.beta}
          onChange={(beta) => onChange({ ...c, beta })}
          min={0}
          max={20}
          step={0.1}
        />
        <Field
          label="均匀变异率 μ"
          value={c.mutation}
          onChange={(mutation) => onChange({ ...c, mutation })}
          min={0}
          max={1}
          step={0.01}
        />
        <Field
          label="演化代数"
          value={c.generations}
          onChange={(generations) => onChange({ ...c, generations })}
          min={1}
          max={500}
        />
      </div>
      <details>
        <summary>初始群体组成 · 相对权重</summary>
        <div className="field-grid">
          {ids.map((s, i) => (
            <Field
              key={s}
              label={meta[s].short}
              value={c.population[i]}
              min={0}
              max={100000}
              onChange={(v) =>
                onChange({
                  ...c,
                  population: c.population.map((p, j) => (i === j ? v : p)),
                })
              }
            />
          ))}
        </div>
        <p className="note">
          权重自动归一化；这是无限群体的确定性频率模型，绝对人数不影响结果。
        </p>
      </details>
    </>
  );
}
export function Chart({
  series,
  maxY = 1,
  yLabel = "策略占比",
}: {
  series: { label: string; color: string; values: number[] }[];
  maxY?: number;
  yLabel?: string;
}) {
  const [width, setWidth] = useState(760),
    ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, entry.contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const height = 240,
    pad = 38;
  const all = series.flatMap((s) => s.values),
    min = Math.min(0, ...all),
    max = Math.max(maxY, ...all),
    range = max - min || 1,
    maxX = Math.max(1, ...series.map((s) => s.values.length - 1));
  return (
    <div ref={ref} className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={yLabel}
      >
        <title>{yLabel}，完整数据可通过 CSV 导出</title>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1={pad}
              y1={height - pad - t * (height - pad * 2)}
              x2={width - pad}
              y2={height - pad - t * (height - pad * 2)}
              stroke="var(--line)"
              strokeDasharray="3 6"
            />
            <text
              x={pad - 8}
              y={height - pad - t * (height - pad * 2) + 4}
              textAnchor="end"
            >
              {(min + t * range).toFixed(1)}
            </text>
          </g>
        ))}
        {series.map((s, i) => (
          <polyline
            key={i}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            points={s.values
              .map(
                (v, j) =>
                  `${pad + (j / maxX) * (width - pad * 2)},${height - pad - ((v - min) / range) * (height - pad * 2)}`,
              )
              .join(" ")}
          />
        ))}
        <text x={pad} y={height - 8}>
          0
        </text>
        <text x={width - pad} y={height - 8} textAnchor="end">
          {Math.max(0, ...series.map((s) => s.values.length - 1))} 轮 / 代
        </text>
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.label}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
export function Network({ small = false }: { small?: boolean }) {
  const nodes = Array.from({ length: 22 }, (_, i) => {
    const a = i * 2.39996,
      r = 35 + Math.sqrt(i) * 35;
    return {
      x: 240 + Math.cos(a) * r,
      y: 210 + Math.sin(a) * r,
      c: i % 5 === 0 ? "#e5ad70" : i % 3 === 0 ? "#a59bcf" : "#8bd4b5",
    };
  });
  return (
    <svg
      viewBox="0 0 480 420"
      className={`network ${small ? "small" : ""}`}
      role="img"
      aria-label="合作与背叛策略组成的互动网络"
    >
      <defs>
        <radialGradient id={small ? "glow-small" : "glow"}>
          <stop stopColor="#77c4aa" stopOpacity=".14" />
          <stop offset="1" stopColor="#77c4aa" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle
        cx="240"
        cy="210"
        r="205"
        fill={`url(#${small ? "glow-small" : "glow"})`}
      />
      {[80, 140, 195].map((r) => (
        <circle
          key={r}
          cx="240"
          cy="210"
          r={r}
          fill="none"
          stroke="#8bb0a6"
          strokeOpacity=".13"
          strokeDasharray={r === 140 ? "3 8" : "0"}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          {nodes
            .slice(i + 1)
            .filter((_, j) => (i + j) % 4 === 0)
            .map((b, j) => (
              <line
                key={j}
                x1={n.x}
                y1={n.y}
                x2={b.x}
                y2={b.y}
                stroke={n.c}
                strokeOpacity=".17"
              />
            ))}
          <circle
            className="node-halo"
            cx={n.x}
            cy={n.y}
            r="12"
            fill={n.c}
            opacity=".06"
            style={{ animationDelay: `${i * 0.24}s` }}
          />
          <circle cx={n.x} cy={n.y} r={i % 5 === 0 ? 5 : 3.5} fill={n.c} />
        </g>
      ))}
      <circle
        cx="240"
        cy="210"
        r="37"
        fill="#182b31"
        stroke="#8bd4b5"
        strokeOpacity=".5"
      />
      <path
        d="M225 210h30m-9-9 9 9-9 9m-12-21-9 9 9 9"
        fill="none"
        stroke="#a9dcc8"
        strokeWidth="2"
      />
      <text x="320" y="65" fill="#8da19f" fontSize="9" letterSpacing="2">
        RECIPROCITY
      </text>
      <text x="36" y="365" fill="#8da19f" fontSize="9" letterSpacing="2">
        COOPERATION / DEFECTION
      </text>
    </svg>
  );
}
