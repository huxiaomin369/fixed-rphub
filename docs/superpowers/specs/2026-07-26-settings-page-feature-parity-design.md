# 设置页功能对齐设计（桌面版 ↔ 网页版）

**日期**：2026-07-26
**状态**：待用户审阅
**Tag**：`v1-settings-page-parity`
**作者**：Orchestrator + brainstorm

## 背景

`rphub-desktop/` 已把网页版大部分功能重构到 Electron + Vue 3 + Pinia 工程，但 **设置页（`SettingsView.vue`）** 仅保留了 API 地址/Key/温度等基础项，缺失了网页版设置页的四个核心模块：

1. **用户/人设管理** — `user`（name/description/avatar/person）+ 多 profile 切换
2. **API 提供商预设** — 8 个内置 provider（agnes/sta1n/deepseek/openrouter/siliconflow/opencode/sensenova/mimo）+ 2 个自定义槽
3. **文生图接口配置** — provider 预设（agnes/sensenova + 2 自定义）+ 风格/尺寸/数量 + 测试连接
4. **服务连接状态** — `apiStatus` / `imageGenStatus`（connected/error/checking + 延迟）

settings store 的 `reactive({...})` 对象里其实已经包含了 `apiProviderId / apiProviderKeys / imageGenProviderId / imageGenProviderKeys / imageGenProviderModels / imageStyle / customImageArtists / imageSize / imageGenCount` 等数据字段，但 View 完全没有读它们——存在数据-视图脱节。

修复后需保证设置页与网页版体验一致，并把文生图能力接入聊天流程。

## 目标 / 非目标

**目标**
- 设置页提供与网页版一致的四个模块
- 文生图能真正在聊天中触发并展示
- 多 profile 切换后，聊天 system prompt 中的 `[User Info]` 段随之更新
- 不破坏现有数据：旧 `apiKey`、`imageGenKey` 字段自动迁移到新结构

**非目标**
- 不实现多用户/云端账号系统（保持本地单实例）
- 不实现文生图历史画廊
- 不重构 chat 流的核心结构（仅在 AI 回复结束/分段时插入图片）
- 不修改 Tailwind 主题或布局系统

## 架构

延续 **Service → Composable → Component → View** 四层模式（见 `rphub-desktop/AGENTS.md`）。

```
src/
├── services/
│   ├── apiProviders.js          [新] provider 预设表 + normalize + isCustom 工具
│   ├── connectionCheck.js       [新] 纯函数：HEAD/GET /models 探测，返回 {ok, latency, error}
│   ├── imageGen.js              [新] generateImages({ baseURL, apiKey, model, prompt, size, n })
│   │                              + styleToArtists(style) + sizeToDims(size) 常量
│   └── userProfile.js           [新] CRUD/迁移/序列化的纯函数（无 Pinia 依赖）
├── composables/
│   ├── useUserProfile.js        [新] 包 settings.userProfiles + 动作
│   ├── useApiStatus.js          [新] 包 settings.apiStatus/apiLatency/imageGenStatus/imageGenLatency
│   └── useImageGenTrigger.js    [新] 在 chat 流中解析 <auto_image_gen> 标签并触发
├── stores/
│   ├── settings.js              [改] 新增 userProfiles/activeProfileId/apiStatus/apiLatency
│   │                                imageGenStatus/imageGenLatency + 旧数据迁移
│   └── chat.js                  [改] 消息加 images:[] + buildSystemPrompt 加 [User Info]
├── components/settings/         [新目录]
│   ├── ProviderDropdown.vue          通用：可下拉选内置 + 自定义 provider（带 logo）
│   ├── ConnectionStatusBadge.vue     通用：绿/红/灰 + 延迟文本
│   ├── UserProfileSection.vue        多 profile + 当前 profile 编辑
│   ├── ApiConfigSection.vue          provider 选 + URL/Key/模型 + 测试连接
│   └── ImageGenSection.vue           provider 选 + 风格/尺寸/数量 + 测试连接
└── views/
    └── SettingsView.vue         [改] 装配上述 section；保留现有 UI 偏好/数据管理
```

### 数据模型

**Settings store 新增字段**（追加到 `DEFAULT_SETTINGS`）：

```js
userProfiles: [],          // [{ uuid, name, description, avatar, person: 'second'|'third' }]
activeProfileId: null,
apiStatus: 'unknown',      // 'unknown' | 'checking' | 'connected' | 'error'
apiLatency: 0,
imageGenStatus: 'unknown',
imageGenLatency: 0,
```

**Chat 消息新增字段**（在 `chat.js` `addMessage` 默认值加）：
```js
images: []   // [{ url: 'data:image/...;base64,...', style, prompt }]
```

**Provider 预设表**（`apiProviders.js`）：

```js
export const API_PROVIDERS = [
  { id: 'agnes', name: 'Agnes', apiUrl: 'https://apihub.agnes-ai.com/v1',
    icon: 'https://agnes-ai.com/images/logo-icon.png' },
  { id: 'sta1n', name: 'STA1N API', apiUrl: 'https://cdn.sta1n.cn/v1',
    icon: 'https://img.cdn1.vip/i/69c18cc07538b_1774292160.webp' },
  { id: 'deepseek', name: 'DeepSeek', apiUrl: 'https://api.deepseek.com/v1',
    icon: 'https://www.deepseek.com/favicon.ico' },
  { id: 'openrouter', name: 'OpenRouter', apiUrl: 'https://openrouter.ai/api/v1',
    icon: 'https://openrouter.ai/favicon.ico' },
  { id: 'siliconflow', name: 'SiliconFlow', apiUrl: 'https://api.siliconflow.cn/v1',
    icon: 'https://siliconflow.cn/favicon.ico' },
  { id: 'opencode', name: 'OpenCode',
    apiUrl: 'https://rphub.aieasy.cc.cd/opencode/zen/v1',
    icon: 'https://opencode.ai/favicon-v3.ico' },
  { id: 'sensenova', name: 'SenseNova',
    apiUrl: 'https://rphub.aieasy.cc.cd/sensenova/v1',
    icon: 'https://largemodel.sensetime.com/skin/images/bannericon.svg' },
  { id: 'mimo', name: 'mimo', apiUrl: 'https://rphub.aieasy.cc.cd/mimo/v1', icon: '' },
]
export const IMAGE_GEN_PROVIDERS = [
  { id: 'agnes', name: 'Agnes', apiUrl: 'https://apihub.agnes-ai.com/v1',
    icon: 'https://agnes-ai.com/images/logo-icon.png', defaultModel: 'agnes-image-2.1-flash' },
  { id: 'sensenova', name: 'SenseNova',
    apiUrl: 'https://rphub.aieasy.cc.cd/sensenova/v1',
    icon: 'https://largemodel.sensetime.com/skin/images/bannericon.svg',
    defaultModel: 'sensenova-u1-fast', fixedSize: '1760x2368' },
]
export const CUSTOM_PROVIDER_SLOTS = [
  { id: 'custom',  name: '自定义' },
  { id: 'custom2', name: '自定义2' },
]
```

### 连接探测

`connectionCheck.js` 暴露 `checkApiConnection({ baseURL, apiKey })` 和 `checkImageGenConnection({ baseURL, apiKey })`：
- API：`GET {baseURL}/models`（自动加 /v1），Authorization Bearer，10s AbortController
- 文生图：`HEAD {baseURL}/images/generations`，10s AbortController
- 返回 `{ status: 'connected'|'error', latency, error? }`

### 文生图生成

`imageGen.js` 暴露 `generateImages({ baseURL, apiKey, model, prompt, size, n })`：
- `POST {baseURL}/images/generations`，body = `{ model, prompt, size, n, response_format: 'b64_json' }`
- 解析返回 `data[].b64_json` → `data:image/png;base64,...` dataURL
- 返回 `[{ url, style, prompt }]`

**风格 → 艺术家提示词** 常量（实施时直接从网页版 `assets/js/app.js:9461-9480` 整段复制 — 本 spec 不内联以避免漂移；plan 阶段标注 line range 作为引用）：
```js
const STYLE_ARTISTS = {
  vertical:    '<从 app.js:9461 复制>',
  comicDoujin: '<从 app.js:9463 复制>',
  r18:         '<从 app.js:9465 复制>',
  lolita25d:   '<从 app.js:9467 复制>',
  anime:       '<从 app.js:9469 复制>',
  galgame:     '<从 app.js:9471 复制>',
  // 'custom' 使用 settings.customImageArtists
}
const SIZE_DIMS = {
  '竖图': '736x1312',  '横图': '1312x736',  '方图': '1152x864',
  '2K竖图': '1472x2624', '2K横图': '2624x1472', '2K方图': '2304x1728',
  '4K竖图': '2208x3936', '4K横图': '3648x2048', '4K方图': '3456x2592',
}
```

### 聊天集成

`useImageGenTrigger.js` 提供 `processAutoImageGen(messageContent, settings, signal)`：
- 解析 `<auto_image_gen>` 标签（容器 + 内嵌的 `@image@...@imageEnd@`）
- 触发时机：AI 流式回复结束后（在 `chat.js` 的 `runChat` 末尾调用）
- 生成图片后更新对应消息的 `images` 字段
- 若 provider 是 sensenova 且 size 不在 `{1760x2368}` 内，回退到 sensenova 的 fixedSize

`chat.js` 改动：
- `addMessage` 默认 `images: []`
- `buildSystemPrompt`：在末尾追加 `[User Info]\nName: ...\nDescription: ...`（仅当 user.name 非空）
- 消息渲染：`ChatView.vue` 中检查 `msg.images.length > 0` 则显示图片网格

### 旧数据迁移

`settings.js#loadSettings` 在 `Object.assign` 后做一次性迁移：

```js
// 1. apiKey 迁移
if (settings.apiKey && Object.keys(settings.apiProviderKeys).length === 0) {
  const id = settings.apiProviderId || 'agnes'
  settings.apiProviderKeys = { [id]: settings.apiKey }
}
// 2. imageGenKey 迁移
if (settings.imageGenKey && Object.keys(settings.imageGenProviderKeys).length === 0) {
  settings.imageGenProviderKeys = { agnes: settings.imageGenKey }
  settings.imageGenProviderModels = { agnes: 'agnes-image-2.1-flash' }
}
// 3. 单 user → 默认 profile
if (settings.user && settings.userProfiles.length === 0) {
  const profile = { uuid: generateUUID(), ...settings.user }
  settings.userProfiles = [profile]
  settings.activeProfileId = profile.uuid
}
delete settings.user  // 迁移完成清理
```

`user.name` / `user.description` 在 settings 里目前不存在（chat 还没用），所以第三个分支只在前置条件命中时执行。

## 实施分阶段

| 阶段 | 范围 | 验证 |
|------|------|------|
| **1** | services/* 三个新文件 + composables/useApiStatus + components/settings/* 五个新组件 + SettingsView 装配 + settings store 字段/迁移 | `npm run test:generator` 通过；`npm run dev` 手动跑：切 provider 改 URL 不报错；测试连接绿/红状态正确；多人设增/删/切换/编辑 |
| **2** | composables/useUserProfile + chat.js 改 `buildSystemPrompt` + ChatView 消息加 user info 引用 | dev：切 profile 后 system prompt 注入正确文本（devtools 调试） |
| **3** | composables/useImageGenTrigger + chat.js 调用 + ChatView 图片渲染 | dev：触发 <auto_image_gen> 后图片正确显示在消息中 |

每个阶段独立可测，不依赖后续阶段。

## 测试

- **单元/脚本测试**：`scripts/test-characterGenerator.mjs` 不动；本次新增 3 个服务是纯函数（providers 解析、style/size 映射、连接探测的 mock fetch），可在 `scripts/` 下加 3 个类似风格的 mock-fetch 脚本
- **手工验证**（AGENTS.md 指定）：
  - 设置页：每个 section 切换/保存/重置正常
  - 切换 provider 后 URL/Key 自动跟进；测试连接正确显示绿/红
  - 多 profile：新建/删除/切换；切换人称联动 presets
  - 聊天：勾选「自动生图」后 AI 回复含图片，消息下方显示图片网格

## 风险与回退

- **风险 1：图片生成阻塞聊天流**
  缓解：放在流式回复**结束**后触发（不阻塞首字延迟），且生成中显示 loading 占位
- **风险 2：provider URL 因 CORS 失败**
  缓解：Electron `webSecurity: false` 已开；如果仍失败，错误信息透传到状态徽章
- **风险 3：旧数据迁移字段名不一致**
  缓解：迁移函数以 `settings` 字段是否存在为判断，幂等可重跑

## 不在本次范围（明确推迟）

- 文生图历史画廊（按时间浏览）
- 用户头像云端同步
- 自动生图开关 UI（沿用 worldinfo 中的「自动生图」条目 + NAI 正则方案，chat 流自动识别即可）
- ChatView 之外的视图（MemoryView 等）不读取 user info
