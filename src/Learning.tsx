import { useMemo, useState } from "react";
import { Check, ArrowRight, BookOpen } from "lucide-react";
import {
  defaults,
  ids,
  meta,
  match,
  stats,
  tournament,
  evolve,
} from "./engine";
import type { Action, Strategy } from "./engine";
import { Panel, Button, pct, num, StrategySelect, Chart } from "./components";
export const chapters = [
  {
    title: "第一次选择",
    tag: "单次囚徒困境",
    question:
      "一座孤岛上，你与陌生人各有一枚能交换资源的信物。只有一次交易，你会交出它吗？",
    explain:
      "默认矩阵下，无论对方选择什么，背叛都给你更高的个人收益；双方背叛却比双方合作各少得 2 分。这是个人激励与共同收益之间的张力。",
    action: "选择合作，或选择背叛。",
  },
  {
    title: "我们还会再见",
    tag: "重复博弈",
    question:
      "还是那个人，这次你们还要相遇五次。对方会记得上一轮。你会改变第一轮的决定吗？",
    explain:
      "当未来的互动仍有价值，今天的背叛可能改变明天的回应。重复相遇创造了互惠的可能；有限回合、未知终点与不同信息假设会影响结论。",
    action: "进行五轮选择，观察对方如何回应。",
  },
  {
    title: "留一次余地",
    tag: "互惠与宽恕",
    question:
      "对方偶然背叛了一次。立即报复还是容许一次修复？尝试在对手背叛后继续合作。",
    explain:
      "以牙还牙复制上轮行动。宽容版本以概率重新合作，能够打断一部分报复循环，也可能被利用。宽恕概率是策略参数，而非道德评分。",
    action: "进行五轮选择，对手采用宽容互惠。",
  },
  {
    title: "不是每次都如愿",
    tag: "噪声与误判",
    question:
      "你的选择会有 25% 的概率被翻转。一次背叛，还能直接证明对方的意图吗？",
    explain:
      "噪声作用于行动执行；双方只观察实际行动。即便本想合作，也可能造成伤害。单次实验可能恰好没有误差，换种子或增加回合可以再次检验。",
    action: "进行五轮选择，查看行动意图与实际结果。",
  },
  {
    title: "把规则放上赛场",
    tag: "策略锦标赛",
    question:
      "谁会在合作方多的群体中获胜？把所有规则放在一起，看结果是否符合直觉。",
    explain:
      "循环赛的平均收益取决于收益矩阵、参赛阵容、回合数和噪声。自我对弈也会计入；排名不是对策略的普遍评判。",
    action: "运行一场包含八种策略的真实循环赛。",
  },
  {
    title: "谁留在下一代",
    tag: "合作演化",
    question:
      "策略获得更高收益后，在群体中的比例上升。如果加入变异，还会只剩一个赢家吗？",
    explain:
      "本实验采用离散复制子—均匀变异更新。在固定对战收益矩阵下，收益越高的类型获得更多比例；变异向所有策略均匀注入份额。",
    action: "观察 40 代的真实演化结果。",
  },
  {
    title: "提出你的假设",
    tag: "自由实验",
    question:
      "把行动噪声从 0 改为 10%，同一个群体的长期平均收益会如何变化？先猜想，再运行。",
    explain:
      "对照实验需要记录所有参数和随机种子。单种子不能代表所有随机结果；改变多个条件时，无法把差异直接归因于其中一项。",
    action: "运行无噪声 / 10% 噪声的双条件实验。",
  },
];
export function Learn({
  completed,
  complete,
}: {
  completed: number[];
  complete: (i: number) => void;
}) {
  const [index, setIndex] = useState(0),
    [history, setHistory] = useState<ReturnType<typeof match>>([]),
    [output, setOutput] = useState(""),
    [seed, setSeed] = useState(2026);
  const chapter = chapters[index],
    limit = index === 0 ? 1 : 5;
  const choose = (a: Action) => {
    const c = {
      ...structuredClone(defaults),
      rounds: limit,
      noise: index === 3 ? 0.25 : 0,
      seed,
      forgiveness: 0.5,
    };
    const s: Strategy =
      index === 0 ? "cooperate" : index === 2 ? "generous" : "tft";
    // Replay the same RNG stream and the recorded intended actions to advance reproducibly.
    const actions = [...history.map((r) => r.intendedA), a];
    let next: ReturnType<typeof match> = [];
    const random = rng(seed);
    for (const action of actions) next.push(step(next, action, s, c, random));
    setHistory(next);
    const last = next.at(-1)!;
    setOutput(
      `第 ${next.length} 轮：你${last.intendedA === "C" ? "想合作" : "想背叛"}，实际${last.a === "C" ? "合作" : "背叛"}；对手${last.b === "C" ? "合作" : "背叛"}。本轮 ${last.sa} / ${last.sb}，累计 ${stats(next).total} / ${stats(next, "b").total}。`,
    );
    if (next.length >= limit) complete(index);
  };
  const experiment = () => {
    const c = { ...structuredClone(defaults), seed, generations: 40 };
    if (index === 4) {
      const r = tournament([...ids], c);
      setOutput(
        `本次真实排名：${r.ranking.map((v, i) => `${i + 1}. ${meta[v.id].short} ${num(v.average)} 分/轮`).join("；")}。`,
      );
    }
    if (index === 5) {
      const r = evolve(c),
        last = r.history.at(-1)!;
      setOutput(
        `第 40 代：${ids.map((s, i) => `${meta[s].short} ${pct(last[i])}`).join("；")}。群体平均收益 ${num(r.averages.at(-1)!)}。`,
      );
    }
    if (index === 6) {
      const a = evolve(c),
        b = evolve({ ...c, noise: 0.1 });
      setOutput(
        `无噪声终代平均收益 ${num(a.averages.at(-1)!)}；10% 噪声 ${num(b.averages.at(-1)!)}。差值 ${num(b.averages.at(-1)! - a.averages.at(-1)!)}。到自由实验室查看曲线与修改条件。`,
      );
    }
    complete(index);
  };
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">FIELD GUIDE / 7 INTERACTIVE CHAPTERS</span>
        <h1>先做选择，再理解规则。</h1>
        <p>七个短实验，从一次交换，走向一个不断改变的群体。</p>
      </div>
      <div className="learn-layout">
        <nav className="chapter-nav" aria-label="章节">
          {chapters.map((c, i) => (
            <button
              key={i}
              className={index === i ? "selected" : ""}
              onClick={() => {
                setIndex(i);
                setHistory([]);
                setOutput("");
              }}
            >
              <span>
                {completed.includes(i) ? (
                  <Check size={16} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <div>
                {c.title}
                <small>{c.tag}</small>
              </div>
            </button>
          ))}
        </nav>
        <div className="story">
          <span className="eyebrow">
            CHAPTER {String(index + 1).padStart(2, "0")}
          </span>
          <h2>{chapter.title}</h2>
          <p className="story-question">{chapter.question}</p>
          <span className="story-mark">
            {["⇄", "∞", "✳", "⌁", "⁙", "◈", "∴"][index]}
          </span>
          <p className="note">{chapter.action}</p>
          {index < 4 ? (
            <div className="button-row">
              <Button
                kind="primary"
                disabled={history.length >= limit}
                onClick={() => choose("C")}
              >
                合作
              </Button>
              <Button
                kind="amber"
                disabled={history.length >= limit}
                onClick={() => choose("D")}
              >
                背叛
              </Button>
            </div>
          ) : (
            <Button kind="primary" onClick={experiment}>
              运行章节实验 <ArrowRight size={16} />
            </Button>
          )}
          {output && (
            <div className="story-feedback" aria-live="polite">
              <span className="micro">OBSERVATION / 即时观察</span>
              <p>{output}</p>
            </div>
          )}
          {(history.length >= limit || (index >= 4 && output)) && (
            <div className="story-explanation">
              <h3>从这次实验中看见了什么？</h3>
              <p>{chapter.explain}</p>
              <div className="button-row">
                <Button
                  onClick={() => {
                    setHistory([]);
                    setOutput("");
                    setSeed((s) => s + 1);
                  }}
                >
                  更换种子重玩
                </Button>
                {index < 6 ? (
                  <Button
                    onClick={() => {
                      setIndex(index + 1);
                      setHistory([]);
                      setOutput("");
                    }}
                  >
                    下一章 <ArrowRight size={16} />
                  </Button>
                ) : (
                  <a className="button primary" href="#lab">
                    进入自由实验室 →
                  </a>
                )}
              </div>
            </div>
          )}
          <p className="note">
            实验种子 {seed} · 章节可随时重玩，完成状态会保存在本机。
          </p>
        </div>
      </div>
    </>
  );
}
import { rng, step } from "./engine";
export function Atlas() {
  const [selected, setSelected] = useState<Strategy>("tft"),
    [opponent, setOpponent] = useState<Strategy>("defect");
  const s = meta[selected];
  const flows: Record<Strategy, string[]> = {
    cooperate: ["不检查历史", "总是提交 C"],
    defect: ["不检查历史", "总是提交 D"],
    tft: ["无历史 → C", "否则复制对手上一轮"],
    generous: ["首轮或对手 C → C", "对手 D → 概率宽恕 / 报复"],
    grudger: ["历史有 D？", "是 → D；否 → C"],
    pavlov: ["首轮 → C", "上轮得 R/T → 保持", "否则切换自己的行动"],
    random: ["读取合作概率 q", "抽样 u < q → C", "否则 → D"],
    opportunist: [
      "伪装期 → C",
      "最近三轮 ≥2 个 C？",
      "是 → 概率利用",
      "否 → 复制上一轮",
    ],
  };
  const history = useMemo(
    () => match(selected, opponent, { ...defaults, rounds: 12 }),
    [selected, opponent],
  );
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">STRATEGY ATLAS / KNOW YOUR RULES</span>
        <h1>八种规则，八种生存方式。</h1>
        <p>这里的对手由本地规则算法驱动，不使用语言模型，也不具有自主意识。</p>
      </div>
      <div className="atlas-tabs">
        {ids.map((id) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={selected === id ? "selected" : ""}
          >
            <span style={{ color: meta[id].color }}>{meta[id].symbol}</span>
            {meta[id].short}
          </button>
        ))}
      </div>
      <div className="atlas-layout">
        <Panel className="strategy-profile">
          <span className="giant-glyph" style={{ color: s.color }}>
            {s.symbol}
          </span>
          <span className="eyebrow">
            STRATEGY {String(ids.indexOf(selected) + 1).padStart(2, "0")}
          </span>
          <h2>{s.name}</h2>
          <p className="lead">{s.rule}</p>
          <div className="flow">
            {flows[selected].map((label, i) => (
              <span key={label}>
                {i > 0 ? "→ " : ""}
                {label}
              </span>
            ))}
          </div>
          <pre>{s.code}</pre>
          <div className="field-grid">
            <div>
              <h3>优势</h3>
              <p>{s.strength}</p>
            </div>
            <div>
              <h3>弱点</h3>
              <p>{s.weakness}</p>
            </div>
          </div>
          <h3>适用环境</h3>
          <p>{s.environment}</p>
          {selected === "opportunist" && (
            <p className="note">
              默认伪装 3
              轮；之后每轮重新检查对手最近三次行动。至少两次合作时，以 80%
              概率背叛、20%
              合作；不达条件则复制对手上轮行动。允许在后续历史改变时退出利用状态。所有随机分支来自已记录种子。
            </p>
          )}
        </Panel>
        <Panel title="真实交锋样本" tag="12 ROUNDS / SEED 2026">
          <StrategySelect
            label="让这条规则遇见…"
            value={opponent}
            onChange={setOpponent}
          />
          <div className="stats-row compact">
            <div>
              <span>平均收益</span>
              <strong>{num(stats(history).average)}</strong>
            </div>
            <div>
              <span>合作率</span>
              <strong>{pct(stats(history).cooperation)}</strong>
            </div>
          </div>
          <Chart
            maxY={5}
            yLabel="图鉴样本逐轮收益"
            series={[
              {
                label: s.short,
                color: s.color,
                values: history.map((r) => r.sa),
              },
              {
                label: meta[opponent].short,
                color: meta[opponent].color,
                values: history.map((r) => r.sb),
              },
            ]}
          />
          <p className="note">
            默认收益矩阵、无噪声；数据来自与对局室相同的引擎。改变对手会重新计算。
          </p>
          <a href="#duel" className="text-link">
            亲自与策略对局 →
          </a>
        </Panel>
      </div>
      <Panel title="读懂实验的八个词" tag="GLOSSARY">
        <div className="glossary">
          {[
            [
              "囚徒困境",
              "在标准收益条件下，背叛在单次博弈中严格占优；双方合作却比双方背叛更有利。",
            ],
            [
              "纳什均衡",
              "任何一方单独改变行动都无法提高自己的收益。在默认单次博弈中，双方背叛是纳什均衡。",
            ],
            [
              "重复博弈",
              "相同对手多次相遇，允许用过去的行动调整下一轮行为。未来互动可能改变合作激励。",
            ],
            ["互惠", "以对方先前行为调整自己的回应；并非无条件合作。"],
            [
              "报复",
              "观察到背叛后通过后续背叛回应；可能威慑，也可能加剧误会。",
            ],
            [
              "宽恕",
              "在对方背叛之后仍给予合作机会，通常需要权衡修复与受利用的风险。",
            ],
            [
              "行动噪声",
              "已选择的行动在执行时被独立翻转；不是对手提前知道你的选择。",
            ],
            [
              "策略演化",
              "群体中行为规则的比例随收益和变异改变；不是个体具有意识或在实时学习。",
            ],
          ].map(([term, definition]) => (
            <div key={term}>
              <h3>{term}</h3>
              <p>{definition}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
