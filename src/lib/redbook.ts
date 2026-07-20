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
  tools?: RedbookTool[];
  /** 博主 / 优质账号类目（与 tools 并存或互斥皆可） */
  people?: RedbookPerson[];
}

/** 红宝书「优质账号 / AI 博主」条目 —— 来自 X 与微博的账号研究 */
export interface RedbookPerson {
  /** 显示名 */
  name: string;
  /** 平台账号 handle（含 @，如 @hwchase17） */
  handle: string;
  /** 主页链接 */
  url: string;
  /** 所在平台 */
  platform: "X" | "微博";
  /** 身份 / 角色 */
  role: string;
  /** 推荐理由（一句话） */
  desc: string;
  /** 类型标签（框架/官方、动手派、工具流、资讯、实战教程、产业视角） */
  tags?: string[];
  /** 编辑力荐（页面高亮） */
  hot?: boolean;
}

/** 红宝书最近更新日期（每次改动请更新） */
export const REDBOOK_UPDATED = "2026-07-20";

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
  {
    id: "bloggers-x",
    icon: "🐦",
    title: "X 账号 · AI Agent 优质号",
    intro: "想学 Agent 的「真功夫」，优先关注框架作者与动手派工程师；建议用 X 私享列表自建「AI Agent Core」分组，只收这类账号、绕开营销号。",
    people: [
      { name: "Harrison Chase", handle: "@hwchase17", url: "https://x.com/hwchase17", platform: "X", role: "LangChain / LangGraph 创始人", desc: "常分享 Agent 开发全生命周期（Build→Test→Deploy→Monitor→Improve）、LangGraph 编排与 Ambient Agent 趋势，且会直接回复开发者问题。", tags: ["框架/官方"], hot: true },
      { name: "LangChain", handle: "@LangChainAI", url: "https://x.com/LangChainAI", platform: "X", role: "LangChain / LangGraph 官方账号", desc: "框架更新、Agent 模板、Deep Agents、LangSmith 可观测性实践的第一手来源。", tags: ["框架/官方"] },
      { name: "Jerry Liu", handle: "@jerryjliu0", url: "https://x.com/jerryjliu0", platform: "X", role: "LlamaIndex 创始人", desc: "RAG 与「Agentic RAG」权威，深讲检索质量、索引策略与评估——把 Agent 接上私有数据的必读信源。", tags: ["框架/官方"] },
      { name: "Hugging Face", handle: "@huggingface", url: "https://x.com/huggingface", platform: "X", role: "开源 AI 平台", desc: "smolagents 等轻量 Agent 框架、开源模型与工具调用生态，适合想用最小依赖搭 Agent 的人。", tags: ["框架/官方"] },
      { name: "Anthropic", handle: "@AnthropicAI", url: "https://x.com/AnthropicAI", platform: "X", role: "Claude 官方 & 开发者关系", desc: "公开 system prompt，讲 prompt caching / token routing / 工具调用优化；其《Building Effective Agents》是 Agent 设计必读。", tags: ["框架/官方"] },
      { name: "Simon Willison", handle: "@simonw", url: "https://x.com/simonw", platform: "X", role: "独立开发者，LLM 工具与安全专家", desc: "极其实用的 LLM 安全（提示词注入）、本地模型运行、CLI 工具化与脚本调优；macOS 进阶用户的宝藏。", tags: ["动手派"], hot: true },
      { name: "Shawn Wang (swyx)", handle: "@swyx", url: "https://x.com/swyx", platform: "X", role: "Latent Space 播客主理人，AI Engineer 概念提出者", desc: "捕捉 AI 从「玩具→工具→产品」的 UX 与范式变化，连接开发者生态；关注他能知道圈内在用什么新工具。", tags: ["动手派"] },
      { name: "Riley Goodside", handle: "@goodside", url: "https://x.com/goodside", platform: "X", role: "独立 AI 研究者，Prompt 极客", desc: "用极端提示词挖掘模型隐藏能力与边界（含注入防御），极大提升你对模型底层逻辑与「驯服」技巧的理解。", tags: ["动手派"] },
      { name: "Hamel Husain", handle: "@HamelHusain", url: "https://x.com/HamelHusain", platform: "X", role: "前 Uber AI，独立顾问", desc: "专攻 LLM 生产环境的「翻车」案例、Evals（评估）与测试方法——做稳定 Agent 必学如何建测试集。", tags: ["动手派"] },
      { name: "Andrej Karpathy", handle: "@karpathy", url: "https://x.com/karpathy", platform: "X", role: "OpenAI 创始成员，Eureka Labs", desc: "提出「LLM OS」「Vibe Coding→Agentic Engineering」并发布 autoresearch 等 Agentic 系统；底层逻辑讲得最透。", tags: ["动手派"], hot: true },
      { name: "Andrew Ng", handle: "@AndrewYNg", url: "https://x.com/AndrewYNg", platform: "X", role: "DeepLearning.AI 创始人", desc: "持续讲 Agentic AI 的实用落地与教育路线，适合建立系统化的基础认知。", tags: ["动手派"] },
      { name: "Jim Fan", handle: "@DrJimFan", url: "https://x.com/DrJimFan", platform: "X", role: "NVIDIA 高级研究科学家，具身智能", desc: "主张「物理具身智能 = Agent 终极形态」，常聊 Foundation Agent、机器人 Agent，视野偏前沿但很启发。", tags: ["动手派"] },
      { name: "Cobus Greyling", handle: "@CobusGreyling", url: "https://x.com/CobusGreyling", platform: "X", role: "Agentic AI 架构观察者", desc: "持续对比 Agentic AI / RPA / Workflow 的差异，以及各种 Agent 框架的架构图解，入门定位很清晰。", tags: ["动手派"] },
      { name: "Matt Wolfe", handle: "@mreflow", url: "https://x.com/mreflow", platform: "X", role: "全能 AI 工具库", desc: "新工具秒级测试，Thread 常总结「本周必试 AI 工具」，是找 Agent 玩法与短教程的最佳阵地之一。", tags: ["工具流"] },
      { name: "Sebastian Raschka", handle: "@rasbt", url: "https://x.com/rasbt", platform: "X", role: "AI 教育者 / 研究者", desc: "把复杂论文变成通俗思维导图与代码示例，深度教程标杆。", tags: ["工具流"] },
      { name: "The Rundown AI", handle: "@TheRundownAI", url: "https://x.com/TheRundownAI", platform: "X", role: "AI 趋势与简报", desc: "把复杂更新浓缩成极简图文，可学习其「视觉化总结」逻辑，适合快速补课。", tags: ["工具流"] },
    ],
  },
  {
    id: "bloggers-wb",
    icon: "📱",
    title: "微博博主 · AI 实战派",
    intro: "中文实战教程型博主为主，常把 Coze / Dify / OpenClaw / Manus 等工具的踩坑与案例拆成图文或视频；善用 @微博AI 官方合集作为集中入口。",
    people: [
      { name: "宝玉", handle: "@宝玉xp（X：@dotey）", url: "https://weibo.com/宝玉xp", platform: "微博", role: "前微软 MVP，年度新知博主", desc: "把复杂技术讲得人人能懂，常翻译并拆解 Anthropic / OpenAI 的 Agent 工程实践，是中文圈的「AI 园丁」。", tags: ["实战教程"], hot: true },
      { name: "爱可可-爱生活", handle: "@爱可可-爱生活", url: "https://weibo.com/爱可可-爱生活", platform: "微博", role: "北邮 AI 教授，日更前沿", desc: "几乎日更，覆盖全球 AI 技术动态并实测 Agent 工具，著有《DeepSeek 全攻略》，深度与频率兼具。", tags: ["实战教程"], hot: true },
      { name: "归藏的 AI 工具箱", handle: "@归藏的AI工具箱", url: "https://weibo.com/归藏的AI工具箱", platform: "微博", role: "AIGC 周刊主理人", desc: "专注挖掘能提升生产力的 AI 神器，开源自动化脚本与本地部署方案，并出 Clawdbot 等国产模型配置避坑指南。", tags: ["实战教程"] },
      { name: "秋芝2046", handle: "@秋芝2046", url: "https://weibo.com/秋芝2046", platform: "微博", role: "Coze / ComfyUI 智能体搭建", desc: "擅长用 Coze、ComfyUI 搭智能体，分享 AI 视频生成、数字人开发等实战案例，实测过 100+ AI 工具。", tags: ["实战教程"] },
      { name: "数字生命卡兹克", handle: "@数字生命卡兹克", url: "https://weibo.com/数字生命卡兹克", platform: "微博", role: "AI 自媒体 / 实战派", desc: "出过「OpenClaw 六大神级使用技巧」「打造专属个人通用 AI 助理」等高热教程，偏落地应用。", tags: ["实战教程"] },
      { name: "林亦LYi", handle: "@林亦LYi", url: "https://weibo.com/林亦LYi", platform: "微博", role: "技术博主 / 实操派", desc: "分享 OpenClaw、AI 助手的高效用法与实操干货，技术细节扎实。", tags: ["实战教程"] },
      { name: "傅盛", handle: "@傅盛", url: "https://weibo.com/傅盛", platform: "微博", role: "猎豹移动 CEO", desc: "深度使用并解读 OpenClaw 等 AI 助手，常从产品 / 商业视角聊 Agent 落地。", tags: ["实战教程"] },
      { name: "Simon_阿文", handle: "@Simon_阿文", url: "https://weibo.com/Simon_阿文", platform: "微博", role: "AI 视觉创作先锋", desc: "长文拆解 Manus 全场景应用技巧，把通用 Agent 的实战用法讲得很透，创意工作者必看。", tags: ["实战教程"] },
      { name: "李继刚", handle: "@李继刚", url: "https://weibo.com/李继刚", platform: "微博", role: "提示词大神", desc: "提示词既简单又美观，分享 Agent 用的高质量 Prompt 与深度思考，适合想用自然语言「定义」Agent 行为的人。", tags: ["实战教程"] },
      { name: "向阳乔木", handle: "@向阳乔木", url: "https://weibo.com/向阳乔木", platform: "微博", role: "前字节，科技评论者", desc: "分享大量 Prompt 与 Vibe Coding 经验，把 Agent / 工作流概念讲得清楚，适合职场人入门。", tags: ["实战教程"] },
      { name: "纪慧诚", handle: "@纪慧诚", url: "https://weibo.com/纪慧诚", platform: "微博", role: "投研 + AI 实战", desc: "视频讲解「如何手搓两个 AI Agent」「AI 投研赋能」，偏向金融场景的 Agent 落地，干货密集。", tags: ["实战教程"] },
      { name: "AIGCLINK", handle: "@AIGCLINK", url: "https://weibo.com/AIGCLINK", platform: "微博", role: "行行 AI 合伙人", desc: "分享 book-to-skill 等把文档编译成 Agent 可调用 Skill 的实践，偏 Agent 工程化。", tags: ["实战教程"] },
      { name: "微博AI", handle: "@微博AI", url: "https://weibo.com/微博AI", platform: "微博", role: "微博官方 AI 账号", desc: "系统整理「OpenClaw 上手教程」「AI 生活指南」等保姆级干货合集，是发现中文实战教程的入口。", tags: ["资讯"] },
      { name: "量子位", handle: "@量子位", url: "https://weibo.com/量子位", platform: "微博", role: "AI 媒体", desc: "覆盖全球 AI 大事件（GPT / 国产模型进展等），能及时了解 Agent 相关重大新闻。", tags: ["资讯"] },
      { name: "极客公园", handle: "@极客公园", url: "https://weibo.com/极客公园", platform: "微博", role: "科技媒体", desc: "做 KimiClaw 等国产 Agent 平替的实测，偏产品评测视角。", tags: ["资讯"] },
      { name: "红衣大叔周鸿祎", handle: "@周鸿祎", url: "https://weibo.com/周鸿祎", platform: "微博", role: "360 创始人", desc: "从产品与产业角度谈 Agent / 智能体趋势，受众广、接地气。", tags: ["产业视角"] },
    ],
  },
];

/** 汇总工具总数（页面 hero 展示用） */
export const REDBOOK_TOOL_COUNT = REDBOOK.reduce((n, c) => n + (c.tools?.length ?? 0), 0);

/** 汇总博主 / 优质账号总数（页面 hero 展示用） */
export const REDBOOK_PERSON_COUNT = REDBOOK.reduce((n, c) => n + (c.people?.length ?? 0), 0);
