# 上下文压缩（MAX_CONTEXT_SIZE 阈值触发）设计文档

日期：2026-08-03
状态：已批准

## 需求

将上下文压缩从"每轮压缩"改为"阈值触发"：

1. 当上下文估算大小到达设置的 MAX_CONTEXT_SIZE 时，把旧对话压缩（LLM 总结）合并为一条 User 消息放入发送上下文。
2. 设置面板新增 MAX_CONTEXT_SIZE 设置项，默认 200k（200,000）。
3. 压缩结果缓存；超限后的后续请求直接使用缓存摘要，不再每次调用总结模型；下一次超限且有新内容时重新压缩并覆盖缓存。

## 已确认决策

| 项目 | 决策 |
| --- | --- |
| 压缩方式 | LLM 总结压缩，复用记忆设置里的"总结模式副模型"（memorySettings.classicModel），未配置时回退 balancedModel → qualityModel → fastModel |
| 阈值衡量 | 字数估算：发送上下文中全部消息 content 总字符数 / 4 |
| 压缩范围 | 保留最近 8 轮（固定常量，不设设置项），只压缩更早的历史 |
| 历史存储 | 非破坏式：chatHistory / IndexedDB 原文不动，仅发送时替换构建的上下文 |
| 缓存 | 按角色存 IndexedDB（scoped key `context_summary_<charUuid>`），字段 `{ summary, coveredIndex, updatedAt }` |

## 实现设计

### 1. 设置项

- `app.js` 中常量改为 `const MAX_CONTEXT_SIZE = 200000;`（原 1,000,000 从未被真正使用）。
- settings 中 `contextSize` 键替换为 `maxContextSize: MAX_CONTEXT_SIZE`。
- 删除 `saveData`（约 L2192）与 `loadData`（约 L2355）中两处强制 `settings.contextSize = MAX_CONTEXT_SIZE;` 覆盖代码。
- 旧存档迁移：savedSettings 中不存在 `maxContextSize` 键时保留 reactive 默认值 200000（现有 loadData 的键过滤逻辑天然支持）。

### 2. 设置 UI（index.html）

- 在设置面板合适位置（记忆/上下文相关区块）新增数字输入 + help popover：
  - 标签：`上下文压缩阈值`，值显示 `settings.maxContextSize`，单位 tokens。
  - 说明文案：达到阈值后，最近 8 轮之前的旧对话将由副模型总结为一条消息；总结结果缓存复用，避免每轮压缩。
  - 沿用现有 `settings-help-popover` 交互模式（参考记忆设置区块）。
- 输入建议 `type="number"`，min 10000、step 10000。

### 3. 字数估算

- 工具函数：`estimateContextTokens(messages)` = 所有消息 `content` 字符串长度之和 / 4，向上取整。
- 估算对象：最终组装完成的 messages 数组（含 system、预设、开场白、聊天历史、世界书、工具结果）。

### 4. 压缩触发与缓存语义

触发节奏（核心目标：不每轮压缩）：

1. 发送前组装完整 messages 数组，计算 `estimateContextTokens(messages)`。
2. 若估算 < `settings.maxContextSize` → 直接发送，不压缩。
3. 若估算 ≥ 阈值 → 读取该角色缓存 `{ summary, coveredIndex, updatedAt }`：
   - 无缓存 → 把最近 8 轮之前的所有消息交给总结模型，生成摘要，写入缓存，覆盖 coveredIndex。
   - 有缓存且 coveredIndex 之后、最近 8 轮之前存在新消息 → 把 [缓存旧摘要作为"历史背景" + 新消息] 交给总结模型，生成一份完整合并摘要，覆盖缓存（"等下一次超限覆盖掉"）。
   - 有缓存但无可压缩新内容（最近 8 轮之前全是已覆盖消息）→ 直接用缓存摘要，不发总结请求（收敛）。
4. 压缩成功后重建 messages：旧历史部分替换为一条 `role:'user'` 摘要消息（内容含摘要正文），最近 8 轮原文保留；随后 toast 提示"上下文超过阈值，旧对话已总结压缩"。
5. 总结请求失败（模型未配置 / API 错误）→ toast 警告，跳过压缩，按原样发送完整上下文。

### 5. 总结请求

- 复用现有模式：`fetch(getOpenAICompatUrl('chat/completions'))` + `settings.apiKey`，`stream: false`，`temperature: 0.2`，带 abort signal。
- 模型选择：`memorySettings.classicModel` → `settings.balancedModel` → `settings.qualityModel` → `settings.fastModel`，取第一个非空。
- Prompt 模式参考 `requestClassicMemorySummary`（L6701）：历史背景/最新对话标记、第三人称高密度总结、只输出总结正文；首轮压缩无历史背景时给"开场白"级别的角色上下文。
- 摘要长度上限：`trimMemoryText(summary, 4000)` 同款处理（截断到 4000 字符）。
- 发送后的 token 用量通过 `recordApiUsage` 记录（type: 'summary'），复用现有日志。

### 6. 消息重建细节

- 摘要 User 消息在构建的 messages 中标记 `_compressed: true`（仅调试可见）。
- 实现采取"单遍就地替换"：消息完整组装并完成正则处理之后（`generateResponse` 中 `postprocessContextMessages(messages).map(...)` 之后、上下文查看器之前），对最终 messages 数组估算；超限时把带 `_contextFloor` 且 floor ≤ `totalFloors - 2*8` 的历史消息整体替换为一条摘要 User 消息（插入在首个被替换消息的位置），其余消息（system / 预设 / 开场白 / 世界书注入 / 工具结果 / 最近 8 轮）保持不动。
- 摘要消息的 name 与普通 user 消息一致（user.name），无 `_sourceIndexes`/`_contextFloor`。

### 7. 缓存持久化

- 复用 scoped 存储：`getScopedStoredValue` / `setScopedStoredValue`（key 前缀 `context_summary`，id 为角色 uuid），与其他按角色数据（memories、chat）同层。
- 压缩成功即写入（走现有 storage 队列模式），角色切换/刷新后依然有效。
- 用户删除/回退消息时不动缓存（coveredIndex 基于 postprocessedChatHistory 索引，删除旧消息后 coveredIndex 可能越界——读取缓存时对 coveredIndex 取 min(coveredIndex, 当前历史长度)，越界视为覆盖全部）。

## 文件范围

- `assets/js/app.js`：常量、settings 键、删除强制覆盖、估算函数、缓存读写、总结请求、两遍构建集成。
- `index.html`：设置项 UI（数字输入 + help popover）。

## 验证

无测试框架。验证方式：

1. `node --check assets/js/app.js` 语法检查。
2. 浏览器手动测试：
   - 把阈值临时调小（如 10000），长对话后发送，用"真实上下文请求"面板确认：旧历史被一条 User 摘要消息替换、最近 8 轮原文保留、聊天界面原文不变。
   - 连续发送两轮：第二轮不再触发总结请求（Network 面板无新增 summary 请求）。
   - 刷新页面继续对话：摘要仍在（缓存生效），不再重复总结已覆盖范围。
   - 关闭/清空 classicModel 时超限：toast 警告且上下文原样发送。
3. 设置面板：maxContextSize 显示、保存、重载后保持。
