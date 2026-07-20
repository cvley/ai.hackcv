import WeChatFollow from "@/components/WeChatFollow";

export const metadata = { title: "关于" };

export default function AboutPage() {
  return (
    <div className="prose">
      <h1>关于 hackcv</h1>
      <p>
        hackcv 是一个<strong>实时 AI 资讯聚合平台</strong>：每天从 arXiv、GitHub、Hacker News
        以及多家中文科技媒体采集最新内容，由 LLM 自动生成摘要、分类与精选打分，
        帮助读者在信息洪流中快速抓住真正重要的进展。
      </p>

      <h2>我们做什么</h2>
      <ul>
        <li>
          <strong>多源聚合</strong>：论文、开源项目、行业资讯一站直达，每条内容标注完整信源。
        </li>
        <li>
          <strong>LLM 精选</strong>：0–100 分精选机制，让高质量内容浮到顶部，不再被时间线淹没。
        </li>
        <li>
          <strong>准实时</strong>：内容采集后分钟即可上线，热点区域动态更新。
        </li>
        <li>
          <strong>开放接口</strong>：提供 9 个公开 REST API 与 4 种 RSS，方便人与 Agent 共同消费。
        </li>
      </ul>

      <h2>内容类型</h2>
      <ul>
        <li>
          <span className="badge badge-paper">论文</span> arXiv 最新 AI 研究
        </li>
        <li>
          <span className="badge badge-project">开源项目</span> GitHub 热门 AI 工程
        </li>
        <li>
          <span className="badge badge-news">行业资讯</span> 全球 AI 动态与厂商进展
        </li>
      </ul>

      <h2>联系</h2>
      <p>
        合作、纠错或内容授权，请通过 <a href="/feedback">反馈页</a> 与我们联系。
      </p>

      <WeChatFollow mode="card" />
    </div>
  );
}
