# AI 小说创作页 (novel/index.html) 设计文档

日期: 2026-08-12
状态: 已确认

## 背景

在 `novel/index.html` (当前为空文件) 实现 AI 小说创作网页, 参考 `novel.html` (墨韵·造梦) 的功能与逻辑, 但:

- UI 风格仅作参考, 新页面采用**极简清爽风**
- 聊天界面(主内容区)去除书评功能(每章"本章书评"评论区)
- 右上角悬浮入口"书评团"改为"AI 灵感": AI 根据已有内容生成多种后续剧情大致走向作为参考

## 实现方案

方案 A: 拷贝 `novel.html` 到 `novel/index.html` 后手术式改造。功能逻辑已成熟, 改动面可控。

## 架构

- 单文件应用 `novel/index.html`: 内联 CSS + 内联 Vue 3 (Options API `setup()`), CDN 依赖 (Vue 3 / Tailwind CDN / marked), 零构建工具
- 独立存储: IndexedDB `RPHubDB`, key 改为 `rp_hub_novel_library_v2`, 与 novel.html 的 `rp_hub_novel_library` 互不影响
- API 供应商同步: 优先 `postMessage` 从 RP-Hub 主页拉取 (`REQUEST_RPHUB_API_SETTINGS`), 失败回退读 IndexedDB `rp_hub_settings`

## 功能保留 (侧边导航栏全部功能)

| Tab | 功能 |
|---|---|
| 书架 | 多书创建/切换/删除, 封面字、字数、角色数、简介展示, 选中态动画 |
| 设定 | 书名、世界观、负面提示词、成人模式开关 |
| 角色 | 角色增删改(含删除确认弹窗) |
| 目录 | 章节列表、剧情摘要折叠、点击跳转 |
| 查找 | 全文查找/高亮/替换当前/全部替换, 结果列表跳转 |

主区域保留: 章节卡片(阅读/编辑/复制/删除/重写)、底部"下一章剧情走向"输入框、单章字数选择(少1500/中2500/多4000)、生成数量(1/3/5/10章)、流式生成+生成动画、章节折叠动画、浮动置顶/置底按钮、导入/导出 TXT、清空所有内容、通用确认弹窗、toast。

## 功能删除 (书评相关)

- 每章底部"本章书评"评论区: 模板区块、`generateChapterComments`、`toggleChapterComments`、`likeComment`/`likeReply` 全部移除
- 章节对象不再包含 `comments`/`showComments`/`isGeneratingComments` 字段; 保存章节编辑后不再触发评论生成
- `settings.commentModel` 及设置中"评论区"模型目标移除
- 书评团弹窗、`reviews`/`reviewStatus`/`hasReviewed`/`startBookReview`/三个评审人设 prompt 全部移除

## 模型设置简化

- 设置弹窗中"配置目标"选择器 (正文生成/书评团/评论区) 移除, 简化为**单一模型列表**直接绑定 `settings.model` (AI 灵感共用正文模型)
- `settings.reviewModel`/`commentModel` 字段从 `settings` 与书籍 `localSettings` 持久化中移除
- 保留: RP-Hub 供应商同步选择、模型列表刷新/搜索/选择

## AI 灵感弹窗 (替代书评团)

- 右上角悬浮按钮(原书评团位置) → 打开"AI 灵感"弹窗
- 弹窗头部: 图标 + 标题「AI 灵感」+「生成灵感」按钮(生成中变禁用/重新生成)+ 关闭
- 生成逻辑:
  - 单次非流式请求 `chat/completions`, 模型用 `settings.model`
  - 上下文: 标题/世界观/角色设定/已写章节全文(与续写相同的前文构建方式)
  - 系统提示词要求返回 **5 条后续剧情大致走向**, JSON 数组 `[{title, outline}]`, title 为走向标题(短), outline 为 2-4 句概要; 严禁输出 Markdown 代码块
  - JSON 解析失败时回退: 按 `###`/数字序号分段拆分为走向列表
- 交互:
  - 每条走向渲染为卡片: 序号(走向一/二/...)+ 标题(加粗)+ 概要正文, 卡片间视觉区隔明显
  - 点击卡片 → 自动填入底部"下一章剧情走向"输入框并关闭弹窗, toast 提示「已填入: {标题}」
  - 生成中显示 loading 状态; 无 API Key/模型时 toast 提示并引导打开设置
- 删除确认等复用通用确认弹窗模式

## UI 风格: 极简清爽

- 主调: 白/浅灰背景 (`#fafafa` 系), stone 色弱化, 大量留白, 细分割线
- 侧边栏: 浅色白底, 卡片式 Tab 导航(胶囊高亮)替代底部滑块
- 章节卡片: 白底圆角 + 细边框 + 轻阴影
- 底部输入栏: 毛玻璃白 + 轻阴影
- 字体: 系统字体为主; 品牌标题保留轻量书法感字体
- 生成动画: 轻量图标 + 进度文案 (替换水墨羽毛笔动画)
- 移动端: 保留顶部栏 + 侧边栏滑出 + 遮罩

## 数据与错误处理

- 所有写操作沿用 `saveData()` 全量快照写入 IndexedDB
- 续写失败: toast/alert 提示; 生成中断: AbortController
- 灵感生成失败: toast 提示, 可重试
- 导入 TXT 格式与 novel.html 完全兼容(分隔符解析: 头部/正文/角色卡/摘要)
- 无测试框架; 验证: 浏览器直接打开 `novel/index.html` 走查全部功能

## 验证清单

1. 书架: 新建/切换/删除多本书, 数据持久化
2. 设定/角色/目录/查找: 各 Tab 功能与 novel.html 一致
3. 主区域: 无任何书评/评论区残留; 续写生成正常(标题+正文+---剧情摘要--- 解析)
4. AI 灵感: 生成 5 条走向、点击填入提示词、重新生成、无 Key 提示
5. 设置: 供应商同步、单一模型选择生效
6. 导入导出 TXT 往返兼容
7. 移动端(窄屏)布局正常
