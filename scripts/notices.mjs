import fs from "node:fs";
import path from "node:path";
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
let notices =
  "# Third-party notices\n\n实际版本以 package-lock.json 为准。下表列出运行及开发依赖；完整许可证原文保存在 THIRD_PARTY_LICENSES.txt。\n\n| 项目 | 版本 | 来源 | 许可证 | 类型 |\n|---|---|---|---|---|\n";
let licenses = "TRUST LAB — bundled third-party license texts\n\n";
for (const [dir, pkg] of Object.entries(lock.packages)) {
  if (!dir) continue;
  const name = dir.split("node_modules/").at(-1);
  notices += `| ${name} | ${pkg.version} | [npm](https://www.npmjs.com/package/${name}/v/${pkg.version}) | ${pkg.license ?? "见包内许可"} | ${pkg.dev ? "开发" : "运行"} |\n`;
  if (fs.existsSync(dir)) {
    const files = fs
      .readdirSync(dir)
      .filter(
        (f) =>
          /^(licen[cs]e|copying|notice)(\.|$)/i.test(f) &&
          fs.statSync(path.join(dir, f)).isFile(),
      );
    for (const f of files)
      licenses += `\n${"=".repeat(70)}\n${name}@${pkg.version} / ${f}\n${"=".repeat(70)}\n${fs.readFileSync(path.join(dir, f), "utf8")}\n`;
  }
}
notices +=
  "\n## 实际视觉资源\n\nLucide 图标由 lucide-react 本地打包（ISC，部分源自 Feather / MIT；原文保留于许可证合集）。网络主视觉、SVG 图表、实验符号及 CSS 动效均为本项目原创。不加载图片、远程字体或第三方 CDN；字体使用设备已有的系统字体。\n\n## 机制与体验参考（未复制代码、界面、文案或素材）\n\n- [The Evolution of Trust](https://github.com/ncase/trust)：参考互动教学的推进方式与重复博弈体验。原项目声明 CC0，但列出的音效含单独许可；本项目没有复用任何音效或素材。\n- [Axelrod-Python / Axelrod](https://github.com/Axelrod-Python/Axelrod)：参考经典策略、循环赛、随机终止及可复现实验方法。项目为 MIT，未引入 Python 依赖或复制实现。\n\n## 已评估但未引入\n\n- [shadcn/ui](https://github.com/shadcn-ui/ui) / MIT：本项目的触控表单与对局布局使用自定义 React 组件。\n- [Recharts](https://github.com/recharts/recharts) / MIT：采用响应式原生 SVG 曲线，减少运行依赖。\n- [tsParticles](https://github.com/tsparticles/tsparticles) / MIT：采用数量固定的 SVG 网络与 CSS 动效，降低移动设备开销。\n- [Inter](https://github.com/rsms/inter) / SIL OFL 1.1：未分发字体文件，采用系统字体栈。\n\n调研日期：2026-10-20。依赖安装的精确来源及 integrity 见锁文件。上游包的完整版权声明以 THIRD_PARTY_LICENSES.txt 及对应 npm 分发包为准。\n";
fs.writeFileSync("THIRD_PARTY_NOTICES.md", notices);
fs.writeFileSync("THIRD_PARTY_LICENSES.txt", licenses);
