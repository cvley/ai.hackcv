import Link from "next/link";
import type { Metadata } from "next";
import CodeTabs from "@/components/CodeTabs";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "hackcv CLI",
  description:
    "在终端里获取 hackcv 的热门推荐：一条命令拿到今日最值得看的 AI 论文 / 开源项目 / 行业资讯。",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "hackcv CLI",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "macOS, Linux, Windows",
  description:
    "hackcv 命令行工具，一条命令获取今日 AI 热门推荐（论文 / 开源项目 / 行业资讯）。",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  url: `${SITE.url}/cli`,
  softwareHelp: `${SITE.url}/cli`,
  installUrl: "https://www.npmjs.com/package/hackcv-cli",
};

const installSamples = [
  { label: "npm", code: `npm i -g hackcv-cli\nhackcv-cli hot --limit 10` },
  { label: "npx", code: `npx hackcv-cli hot --limit 10` },
  { label: "pnpm", code: `pnpm add -g hackcv-cli\nhackcv-cli hot --limit 10` },
];

const commands = [
  { cmd: "hackcv-cli hot", desc: "当前热点 Top N（默认 20，--limit 控制条数）" },
  { cmd: "hackcv-cli hot --type", desc: "按类型：paper / project / news" },
  { cmd: "hackcv-cli hot --since", desc: "时间窗：7d / 30d / 2026-01-01" },
  { cmd: "hackcv-cli hot --category", desc: "按分类筛选" },
  { cmd: "hackcv-cli hot --tag", desc: "按标签筛选" },
  { cmd: "hackcv-cli recommend", desc: "LLM 精选推荐（取 selected 的 recommendation，按 score 排序）" },
];

const examples = `hackcv-cli hot --limit 5
hackcv-cli hot --type project --since 7d
hackcv-cli recommend --limit 5`;

const useCases = [
  { h: "终端速览", p: "一条命令看今日最火内容" },
  { h: "cron 日报", p: "定时把热门清单推到群组 / 邮件" },
  { h: "接进脚本", p: "管道化处理 JSON 输出" },
];

export default function CliPage() {
  return (
    <div className="dev">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1 · Hero */}
      <section className="dev-hero">
        <h1>⌨️ hackcv CLI</h1>
        <p>
          在终端里获取 hackcv 的热门推荐：一条命令拿到今日最值得看的 AI 论文 /
          开源项目 / 行业资讯（按信源数 × 精选分 × 时间衰减排序）。
        </p>
        <div className="dev-chips">
          <span className="dev-chip">一条命令</span>
          <span className="dev-chip">无需鉴权</span>
          <span className="dev-chip">跨平台</span>
        </div>
        <div className="dev-cta-row">
          <a className="dev-cta primary" href="#install">
            快速开始
          </a>
          <a
            className="dev-cta ghost"
            href="https://www.npmjs.com/package/hackcv-cli"
          >
            npm
          </a>
        </div>
      </section>

      {/* 2 · 安装 */}
      <section id="install">
        <h2 className="section-title">
          <span className="bar" />
          安装
        </h2>
        <p className="dev-lead">一行装好，直接跑 hot 命令。</p>
        <CodeTabs
          samples={installSamples}
          note="安装后运行 hackcv-cli --help 查看全部命令"
        />
      </section>

      {/* 3 · 命令速查 */}
      <section>
        <h2 className="section-title">
          <span className="bar" />
          命令速查
        </h2>
        <div className="reftable">
          <div className="ref-head">
            <span>命令</span>
            <span>说明</span>
          </div>
          {commands.map((c) => (
            <div key={c.cmd} className="ref-row">
              <span className="ref-cmd">{c.cmd}</span>
              <span className="ref-desc">{c.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4 · 示例 */}
      <section>
        <h2 className="section-title">
          <span className="bar" />
          示例
        </h2>
        <CodeTabs
          samples={[{ label: "bash", code: examples }]}
          note="热门数据来自站点 /api/public/hot 与 /api/public/items 接口"
        />
      </section>

      {/* 5 · 典型场景 */}
      <section>
        <h2 className="section-title">
          <span className="bar" />
          典型场景
        </h2>
        <div className="usecase-grid">
          {useCases.map((u) => (
            <div key={u.h} className="usecase">
              <span className="uc-h">{u.h}</span>
              <span className="uc-p">{u.p}</span>
            </div>
          ))}
        </div>
        <p className="dev-note">
          注：CLI 正在开发中，命令与参数以正式发布版为准。
        </p>
      </section>
    </div>
  );
}
