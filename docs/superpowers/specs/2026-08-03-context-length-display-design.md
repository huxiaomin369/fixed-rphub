# 聊天界面上下文长度显示 — 设计文档

- 日期：2026-08-03
- 状态：已与用户确认关键决策，待评审
- 关联代码：`assets/js/app.js`、`index.html`

## 1. 目标

在聊天界面的输入栏（模型切换按钮旁）显示本次 API 请求上报的**当前上下文长度**（`usage.prompt_tokens` 等）与**最大上下文长度**（复用设置中的 `maxContextSize` 压缩阈值），格式如 `12,345 / 200,000`。

## 2. 已确认的决策（与用户讨论确定）

| 问题 | 决策 |
| --- | --- |
| 最大上下文长度来源 | 复用现有 `settings.maxContextSize`（压缩阈值，默认 `MAX_CONTEXT_SIZE = 200000`，app.js:578/589） |
| 显示位置 | 输入栏“模型切换”按钮旁（index.html:1139-1160 同一行） |
| 当前上下文长度取值 | API 上报的 `prompt_tokens`（归一化后的 `inputTokens`） |
| 实现方案 | 方案 A：最小侵入 — 新 ref + 模板徽章 |

## 3. 现状（已核实）

- 主聊天请求：`generateResponse`（app.js:5285），OpenAI 兼容接口（app.js:6148-6162）；流式请求已带 `stream_options.include_usage: true`（app.js:6160），最后一块 SSE chunk 携带 `usage`。
- usage 捕获点：`responseUsage` 变量（app.js:6054），流式（6237）/JSON（6301）/强制 SSE（6340）三处填充；**`recordApiUsage(responseUsage, {...})` 在 app.js:6378-6382 统一记录**。
- 归一化管道已完备：`normalizeApiUsage(usage)`（app.js:2018-2068）兼容 OpenAI / Anthropic / Gemini 形态，返回 `{ inputTokens, outputTokens, totalTokens, cacheReadTokens, cacheWriteTokens, reasoningTokens, reported }`。`inputTokens` 已正确处理 `prompt_tokens` 优先、`input_tokens` + 缓存补充的取值逻辑。
- `formatTokenCount` 已存在（app.js:11563，千分位格式化）。
- `settings.maxContextSize` 是响应式对象属性，模板可直接绑定，用户修改设置后徽章自动更新。
- 现有徽章样式参照：`typing-timer-badge`（index.html:748-761）：`text-[11px] font-mono rounded-full px-2.5 py-1 border bg-white/50`。

## 4. 设计

### 4.1 数据流

```
API 响应 → responseUsage（现有）→ normalizeApiUsage() → inputTokens
                                              ↓
                              lastContextTokens.value = inputTokens（新 ref）
                                              ↓
              模板徽章 {{ formatTokenCount(lastContextTokens) }} / {{ formatTokenCount(settings.maxContextSize) }}
```

### 4.2 状态（app.js）

新增一个响应式 ref `lastContextTokens`，初始值为 `null`，放置在与 `apiStatus`/`apiLatency`（app.js:541-542）相邻的位置：

```js
const lastContextTokens = ref(null);
```

在 `generateResponse` 的 `recordApiUsage(responseUsage, ...)`（app.js:6378）调用前，先归一化并写入（复用归一化结果，避免重复计算）：

```js
const normalizedUsage = normalizeApiUsage(responseUsage);
lastContextTokens.value = normalizedUsage.reported ? normalizedUsage.inputTokens : null;
recordApiUsage(responseUsage, { type, model, detail });
```

> 注：`normalizeApiUsage(null)` 安全返回 `reported: false`；`recordApiUsage` 内部会再次归一化，双次调用开销可忽略（每请求仅一次）。

### 4.3 生命周期重置

在以下位置将 `lastContextTokens` 重置为 `null`（徽章隐藏），避免显示上一个会话的过期数据：

- `clearChat`（app.js:4574，清空会话按钮）
- 删除当前角色（app.js:9503，`currentCharacterIndex` 置 -1 且清空 chatHistory 处）
- 角色切换（app.js:9565，`newIndex === -1` 清空 chatHistory 处）

**失败语义**：`lastContextTokens` 的赋值只发生在 `generateResponse` 的成功路径（app.js:6378 附近）。请求失败或被中止时该行不执行，徽章保留**上一次成功上报的值**；若此前从未成功，徽章保持隐藏。这是有意行为——失败不等于上下文被清空，保留最近一次真实值比隐藏更有信息量。

### 4.4 UI（index.html）

在模型切换按钮（index.html:1139-1160）同一 flex 容器内、按钮之后追加徽章：

```html
<div v-if="lastContextTokens !== null"
     class="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-mono bg-white/50 backdrop-blur-sm border border-white/50 shadow-sm text-gray-500"
     :title="`当前上下文 ${lastContextTokens.toLocaleString()} / 上限 ${settings.maxContextSize.toLocaleString()}`">
  <span class="text-teal-600 font-bold">{{ formatTokenCount(lastContextTokens) }}</span>
  <span class="opacity-60">/</span>
  <span>{{ formatTokenCount(settings.maxContextSize) }}</span>
</div>
```

- `lastContextTokens` 加入 `setup()` 返回值（app.js:~11535-11610 导出块）。
- 首次加载（无任何响应）时 `v-if` 隐藏徽章，不占用输入栏空间。

## 5. 边界情况

| 场景 | 行为 |
| --- | --- |
| API 不返回 usage（极少数 provider） | `reported: false` → 不更新，徽章保留上次成功值（仅在生命周期重置点清空） |
| 流式请求 | 最后一块 chunk 携带 usage，结束后统一更新一次 |
| 工具续写（activeToolDepth > 0） | 同一点位更新，显示的是该次续写的上下文（含历史），语义一致 |
| 用户修改 maxContextSize | 徽章分母自动响应式更新，无需额外代码 |
| 切换角色/清空会话 | 重置为 null，徽章隐藏 |

## 6. 非目标（YAGNI）

- 不做实时输入估算（方案 C 已排除）。
- 不写入 tokenUsageHistory 之外的持久化存储。
- 不做消息级 token 元数据（方案 B 已排除）。
- 不加超阈值告警颜色（如需可在后续版本基于占比阈值添加，数据结构已支持）。

## 7. 验证方式

项目无构建工具、无测试。验证步骤：

1. 打开 `index.html`，发送一条消息，确认输入栏模型按钮旁出现 `X,XXX / 200,000` 徽章，数字与统计页 token 记录一致。
2. 流式与非流式（settings.stream 切换）各验证一次。
3. 切换角色 → 徽章消失；再次发消息 → 徽章按新会话显示。
4. 修改设置中 maxContextSize → 分母实时变化。
5. 控制台无报错。

## 8. 改动清单预估

- `assets/js/app.js`：新增 1 个 ref（+1 行）；`generateResponse` 内插入归一化赋值（+2 行）；重置点 2-3 处（+2-3 行）；setup 导出（+1 行）。
- `index.html`：模型按钮后追加徽章（约 6 行）。
- 总改动约 12-15 行，无新文件。
