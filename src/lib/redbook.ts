// 《2026 AI 工具红宝书》数据源 —— 持续更新。
// 维护方式：直接编辑本文件的分类与工具条目即可；页面 /redbook 自动渲染。
// 更新后请同步修改 REDBOOK_UPDATED 日期。

export interface RedbookTool {
  /** 工具名 */
  name: string;
  /** 官网/入口链接 */
  url: string;
  /** 一句话简介（面向公众号读者，突出「能干什么」） */
  desc: string;
  /** 标签（能力/场景） */
  tags?: string[];
  /** 价格情况，如「免费」「免费+订阅」「订阅」 */
  price?: string;
  /** 编辑力荐（页面高亮） */
  hot?: boolean;
  /** 是否国产（便于读者按可访问性选择） */
  cn?: boolean;
}

export interface RedbookCategory {
  id: string;
  icon: string;
  title: string;
  intro?: string;
  tools: RedbookTool[];
}

/** 红宝书最近更新日期（每次改动请更新） */
export const REDBOOK_UPDATED = "2026-07-19";

/** 红宝书版本号（按需自增） */
export const REDBOOK_VERSION = "v1.0";

export const REDBOOK: RedbookCategory[] = [
  {
    id: "chat",
    icon: "💬",
    title: "对话 · 通用大模型",
    intro: "日常问答、写作、翻译、编程、分析的主力入口，先选 1–2 个用顺手。",
    tools: [
      { name: "ChatGPT", url: "https://chatgpt.com", desc: "OpenAI 旗舰，综合能力标杆，插件/联网/多模态齐全。", tags: ["通用", "多模态"], price: "免费+订阅", hot: true },
      { name: "Claude", url: "https://claude.ai", desc: "长文写作与代码质量口碑最佳，超长上下文、擅长复杂推理。", tags: ["写作", "编程"], price: "免费+订阅", hot: true },
      { name: "Gemini", url: "https://gemini.google.com", desc: "谷歌全家桶深度整合，超长上下文与多模态见长。", tags: ["通用", "多模态"], price: "免费+订阅" },
      { name: "DeepSeek", url: "https://chat.deepseek.com", desc: "国产开源强推理模型，中文与代码表现优异、性价比极高。", tags: ["推理", "编程"], price: "免费", hot: true, cn: true },
      { name: "豆包", url: "https://www.doubao.com", desc: "字节出品，语音/图像/搜索一体，移动端体验流畅。", tags: ["通用", "语音"], price: "免费", cn: true },
      { name: "Kimi", url: "https://www.kimi.com", desc: "月之暗面，超长文档解析、联网搜索能力强。", tags: ["长文档", "搜索"], price: "免费", cn: true },
      { name: "通义千问", url: "https://tongyi.aliyun.com", desc: "阿里出品，文档/图像/音视频理解全面，企业生态完善。", tags: ["通用", "办公"], price: "免费", cn: true },
      { name: "腾讯元宝", url: "https://yuanbao.tencent.com", desc: "接入混元+DeepSeek，微信生态内检索与办公顺手。", tags: ["通用", "微信生态"], price: "免费", cn: true },
    ],
  },
  {
    id: "coding",
    icon: "👨‍💻",
    title: "AI 编程 · 开发提效",
    intro: "从补全到「说需求出应用」，程序员与产品同学都值得配一个。",
    tools: [
      { name: "Cursor", url: "https://cursor.com", desc: "最流行的 AI 代码编辑器，整仓理解、Agent 自动改代码。", tags: ["IDE", "Agent"], price: "免费+订阅", hot: true },
      { name: "Claude Code", url: "https://www.anthropic.com/claude-code", desc: "终端里的编码 Agent，能读写整个项目、跑命令、连改多文件。", tags: ["终端", "Agent"], price: "订阅", hot: true },
      { name: "GitHub Copilot", url: "https://github.com/features/copilot", desc: "老牌代码补全，深度集成 VS Code / JetBrains。", tags: ["补全", "IDE"], price: "免费+订阅" },
      { name: "Windsurf", url: "https://windsurf.com", desc: "AI 原生 IDE，Cascade 流式 Agent 体验顺滑。", tags: ["IDE", "Agent"], price: "免费+订阅" },
      { name: "Trae", url: "https://www.trae.ai", desc: "字节出品 AI IDE，中文友好、免费额度大方。", tags: ["IDE"], price: "免费", cn: true },
      { name: "v0", url: "https://v0.dev", desc: "Vercel 出品，描述需求直接生成 React/UI 组件与页面。", tags: ["前端", "生成UI"], price: "免费+订阅" },
      { name: "Lovable", url: "https://lovable.dev", desc: "自然语言全栈建站，从想法到可上线应用一步到位。", tags: ["建站", "全栈"], price: "免费+订阅" },
      { name: "Bolt.new", url: "https://bolt.new", desc: "浏览器内即写即跑的全栈 AI 开发环境。", tags: ["建站", "全栈"], price: "免费+订阅" },
    ],
  },
  {
    id: "search",
    icon: "🔍",
    title: "AI 搜索 · 研究调研",
    intro: "带出处、能追问的新一代搜索，替代「一堆蓝链接」。",
    tools: [
      { name: "Perplexity", url: "https://www.perplexity.ai", desc: "AI 搜索标杆，答案带引用、可深挖，Pro 支持多模型。", tags: ["搜索", "带出处"], price: "免费+订阅", hot: true },
      { name: "秘塔 AI 搜索", url: "https://metaso.cn", desc: "国产无广告学术级搜索，结构化大纲+来源清晰。", tags: ["搜索", "学术"], price: "免费", hot: true, cn: true },
      { name: "Felo", url: "https://felo.ai", desc: "多语言 AI 搜索，自动生成思维导图与 PPT。", tags: ["搜索", "多语言"], price: "免费+订阅" },
      { name: "天工 AI", url: "https://www.tiangong.cn", desc: "昆仑万维出品，搜索+写作+阅读一体。", tags: ["搜索", "写作"], price: "免费", cn: true },
    ],
  },
  {
    id: "image",
    icon: "🎨",
    title: "图像生成 · 设计创意",
    intro: "海报、插画、电商图、头像，文生图/图生图一网打尽。",
    tools: [
      { name: "Midjourney", url: "https://www.midjourney.com", desc: "画质与审美天花板，风格化插画/概念图首选。", tags: ["文生图", "艺术"], price: "订阅", hot: true },
      { name: "即梦 AI", url: "https://jimeng.jianying.com", desc: "字节出品，中文提示词友好，图片+视频一体、免费好用。", tags: ["文生图", "国产"], price: "免费", hot: true, cn: true },
      { name: "Recraft", url: "https://www.recraft.ai", desc: "矢量/品牌设计强项，可控风格与批量出图。", tags: ["矢量", "品牌"], price: "免费+订阅" },
      { name: "Ideogram", url: "https://ideogram.ai", desc: "文字排版渲染最准，海报/Logo 带字场景强。", tags: ["文字渲染", "海报"], price: "免费+订阅" },
      { name: "通义万相", url: "https://tongyi.aliyun.com/wanxiang", desc: "阿里出品，中文创意与电商场景丰富。", tags: ["文生图", "电商"], price: "免费", cn: true },
      { name: "FLUX", url: "https://blackforestlabs.ai", desc: "开源图像模型新标杆，写实与细节表现出色。", tags: ["开源", "写实"], price: "免费/开源" },
    ],
  },
  {
    id: "video",
    icon: "🎬",
    title: "视频生成 · 短片创作",
    intro: "文生视频/图生视频进入实用期，短视频、广告、分镜都能试。",
    tools: [
      { name: "Sora", url: "https://sora.com", desc: "OpenAI 视频模型，长镜头一致性与真实感领先。", tags: ["文生视频"], price: "订阅", hot: true },
      { name: "可灵 Kling", url: "https://klingai.com", desc: "快手出品，国产视频生成第一梯队，运动与时长表现好。", tags: ["文生视频", "图生视频"], price: "免费+订阅", hot: true, cn: true },
      { name: "海螺 AI", url: "https://hailuoai.video", desc: "MiniMax 出品，画面细腻、指令跟随准，口碑高。", tags: ["文生视频"], price: "免费+订阅", cn: true },
      { name: "Runway", url: "https://runwayml.com", desc: "老牌 AI 视频工具，编辑/特效/生成一体化。", tags: ["视频编辑", "特效"], price: "免费+订阅" },
      { name: "Vidu", url: "https://www.vidu.studio", desc: "生数科技出品，多主体一致性与参考生成强。", tags: ["图生视频"], price: "免费+订阅", cn: true },
      { name: "Luma Dream Machine", url: "https://lumalabs.ai/dream-machine", desc: "画面流畅自然，图生视频与镜头运动出色。", tags: ["图生视频"], price: "免费+订阅" },
    ],
  },
  {
    id: "audio",
    icon: "🎵",
    title: "音频 · 音乐 · 配音",
    intro: "写歌、配音、播客、有声书，一句话生成成品级音频。",
    tools: [
      { name: "Suno", url: "https://suno.com", desc: "AI 作曲天花板，一句话生成带人声的完整歌曲。", tags: ["音乐", "作曲"], price: "免费+订阅", hot: true },
      { name: "Udio", url: "https://www.udio.com", desc: "高保真 AI 音乐生成，人声与编曲质感佳。", tags: ["音乐"], price: "免费+订阅" },
      { name: "ElevenLabs", url: "https://elevenlabs.io", desc: "拟真语音合成/配音/克隆标杆，多语言自然度高。", tags: ["配音", "TTS"], price: "免费+订阅", hot: true },
    ],
  },
  {
    id: "office",
    icon: "📊",
    title: "效率 · 办公 · 知识",
    intro: "PPT、笔记、总结、导图，把重复劳动交给 AI。",
    tools: [
      { name: "Gamma", url: "https://gamma.app", desc: "一句话生成精美 PPT/网页/文档，排版自动化。", tags: ["PPT", "文档"], price: "免费+订阅", hot: true },
      { name: "Notion AI", url: "https://www.notion.so/product/ai", desc: "笔记/知识库内置 AI，总结、写作、问答一体。", tags: ["笔记", "知识库"], price: "订阅" },
      { name: "Napkin", url: "https://www.napkin.ai", desc: "把文字一键转成信息图/流程图，公众号配图神器。", tags: ["信息图", "配图"], price: "免费+订阅", hot: true },
      { name: "Monica", url: "https://monica.im", desc: "全能 AI 助手浏览器插件，划词总结/翻译/写作。", tags: ["插件", "助手"], price: "免费+订阅" },
    ],
  },
  {
    id: "agent",
    icon: "🤖",
    title: "Agent · 自动化 · 平台",
    intro: "让 AI「自己动手」完成多步任务，或搭一个专属智能体。",
    tools: [
      { name: "Manus", url: "https://manus.im", desc: "通用 AI Agent，能自主拆解并执行调研、编码、制表等任务。", tags: ["通用Agent"], price: "订阅", hot: true, cn: true },
      { name: "扣子 Coze", url: "https://www.coze.cn", desc: "字节出品的智能体搭建平台，零代码做 Bot/工作流。", tags: ["搭建平台", "无代码"], price: "免费", hot: true, cn: true },
      { name: "Dify", url: "https://dify.ai", desc: "开源 LLM 应用开发平台，RAG/工作流/API 一站式。", tags: ["开源", "RAG"], price: "免费/开源", cn: true },
      { name: "n8n", url: "https://n8n.io", desc: "开源自动化工作流，接入 AI 节点串联上百服务。", tags: ["自动化", "工作流"], price: "免费/开源" },
    ],
  },
];

/** 汇总工具总数（页面 hero 展示用） */
export const REDBOOK_TOOL_COUNT = REDBOOK.reduce((n, c) => n + c.tools.length, 0);
