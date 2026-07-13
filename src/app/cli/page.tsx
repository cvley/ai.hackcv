import { SITE } from "@/lib/config";

export const metadata = {
  title: "hackcv CLI",
  description: "在终端里获取 hackcv 的热门推荐：一条命令拿到今日最值得看的 AI 论文 / 开源项目 / 行业资讯。",
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
  installUrl: "https://www.npmjs.com/package/hackcv",
};

export default function CliPage() {
  return (
    <div className="prose">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1>⌨️ hackcv CLI</h1>
      <p>
        在终端里获取 hackcv 的<strong>热门推荐</strong>：一条命令拿到今日最值得看的
        论文 / 开源项目 / 行业资讯（按信源数 × 精选分 × 时间衰减排序）。
      </p>

      <h2>安装</h2>
      <pre>{`# 全局安装
npm i -g hackcv
hackcv --help

# 或免安装直接运行
npx hackcv hot`}</pre>

      <h2>主命令：热门推荐</h2>
      <pre>{`hackcv hot                       今日热门推荐（Top N，默认 10）
                                 排序 = 信源数 × 精选分 × 时间衰减
hackcv hot --type paper          按类型筛选：paper / project / news
hackcv hot --since 7d --take 20  时间窗与条数
hackcv hot --category llm        按分类筛选
hackcv hot --tag agent           按标签筛选
hackcv recommend                 等价别名，输出可分享的热门清单`}</pre>

      <h2>示例</h2>
      <pre>{`# 今天最火的 5 条，一条命令拿到
hackcv hot --take 5

# 近一周最热门的开源项目
hackcv hot --type project --since 7d

# 每天 09:00 把热门清单推到群组（cron）
hackcv recommend --since 1d | tee daily-hot.md`}</pre>

      <p>
        热门数据来自站点 <code>/hot</code> 与 <code>/daily</code> 接口（信源数 × 分数 × 时间衰减）。
        完整 API 见 <a href="/agent">Agent 接入文档</a>。
      </p>
      <p style={{ fontSize: 13, color: "var(--muted)" }}>
        注：CLI 正在开发中，命令与参数以正式发布版为准。
      </p>
    </div>
  );
}
