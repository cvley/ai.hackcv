# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-22

### Added
- 集成微信公众号物料：全站关注入口（Footer 关注行 / About 页 `#wechat` 完整卡片 / 移动端 BottomNav「关注」Tab）+ 搜一搜推广位。
- 红宝书新增「AI 博主」板块，收录 X（Twitter）账号与微博博主两类优质信源，并在 hero 区增加博主计数。

### Changed
- Footer 升级为多列结构化页脚（品牌区 + 探索 / 开发者 / 支持三列 + 底栏），并移除顶部与版权文字视觉叠加的重复公众号关注卡片。
- 公众号物料图统一转 WebP（原 PNG 约 1.86MB → 约 37KB），卡片改用 `<picture>` 优先加载 WebP，图片加载速度提升约 17 倍。

### Fixed
- 首页卡片内容清洗：在数据库映射层（读 `rowToItem` / 写 `toCommon`）新增 `cleanText`，统一解码 HTML 实体（如 `&#8217;` `&rsquo;` `&nbsp;`）并剥离残留 HTML 标签（如 `<p></p>` `<h2>`）；同时对生产库存量数据执行一次性清洗（3360 条中 1779 条已处理，脚本幂等）。

### Performance
- 见 Changed 中公众号物料图 WebP 化说明。

## 早期内部迭代（2026-07-11 起）

### Added
- 实时 AI 资讯聚合平台 + 公开 API 层。
- 社交分析内部接口 `/api/internal/social`：获取 X / 微博数据并做热点词分析与选题推荐。
- 用户反馈接入 PostgreSQL 后台，`/admin` 可查看与管理，并通过定时任务每日推送飞书。
- 《2026 AI 工具红宝书》页面上线。
- 访客 IP Top 增加城市信息（基于 ip2region 本地离线库）。

### Changed
- 顶栏品牌由 hackcv 改为 `ai.hackcv`。
- 微博 / X 数据仅入库用于分析，不对外公开。
