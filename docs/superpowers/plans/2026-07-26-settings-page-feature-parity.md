# 设置页功能对齐实施计划（桌面版 ↔ 网页版）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `rphub-desktop` 设置页补齐为与网页版一致的体验（用户/人设、API 提供商预设、文生图接口、连接状态），并把文生图接入聊天。

**Architecture:** 沿用 Service → Composable → Component → View 分层。3 阶段交付：阶段 1 = 设置页 UI 完整；阶段 2 = 用户人设注入到聊天 system prompt；阶段 3 = 文生图在聊天中触发并展示。

**Tech Stack:** Vue 3 (Options API) + Pinia (setup store) + localforage + Tailwind v4。服务层用 Node 18+ ESM 写纯函数，通过 `scripts/test-*.mjs` mock-fetch 验证。

## Global Constraints

- **代码位置硬性规则**（来自 `rphub-desktop/AGENTS.md`）：
  - 业务逻辑纯函数放 `src/services/*.js`（无 Vue/Pinia/Electron 导入）
  - Vue 3 组件用 Options API（`export default { name, props, setup() {} }`）
  - Pinia store 用 `defineStore('name', () => { ... })` setup 函数风格
  - 用 Tailwind v4 的工具类（每个用到工具类的 CSS 文件首行要有 `@import "tailwindcss";`）
  - `src/package.json` 的 `{"type":"module"}` 不要删
- **UI 语言**：zh-CN；注释中英皆可
- **测试方式**（无测试框架）：用 `scripts/test-XXX.mjs` mock-fetch 脚本（参考 `scripts/test-characterGenerator.mjs`）
- **Provider 预设**（与网页版 `assets/js/app.js:103-170` 一致）：
  - API 8 个：agnes/sta1n/deepseek/openrouter/siliconflow/opencode/sensenova/mimo
  - 文生图 2 个：agnes（含 `defaultModel: 'agnes-image-2.1-flash'`）、sensenova（含 `defaultModel: 'sensenova-u1-fast'`, `fixedSize: '1760x2368'`）
  - 自定义槽 2 个：`custom`、`custom2`（与已有 `customApiUrl`/`customApiUrl2` / `customImageGenUrl`/`customImageGenUrl2` 一一对应）
- **STYLE_ARTISTS 常量** 实施时直接从 `assets/js/app.js:9461-9480` 整段复制，**不要**凭想象写
- **不使用** Vue Router；视图切换走 `App.vue` 的 `<component :is>`（已有模式，不动）
- **不要**修改 Tailwind 主题、`@theme` 块、布局系统
- 每个任务结束都要 commit，commit message 用 `feat:` / `chore:` / `fix:` 前缀

---

## 文件结构总览

**新建**：
- `src/services/apiProviders.js` — provider 预设表 + helpers
- `src/services/connectionCheck.js` — API/文生图连接探测
- `src/services/imageGen.js` — 文生图 fetch + style/size 映射
- `src/services/userProfile.js` — 人设 CRUD/迁移纯函数
- `src/composables/useUserProfile.js` — 包 settings.userProfiles + 动作
- `src/composables/useApiStatus.js` — 包 settings.apiStatus/apiLatency + imageGen
- `src/composables/useImageGenTrigger.js` — `<auto_image_gen>` 解析
- `src/components/settings/ProviderDropdown.vue` — 可复用：下拉选 provider
- `src/components/settings/ConnectionStatusBadge.vue` — 可复用：状态徽章
- `src/components/settings/UserProfileSection.vue` — 多 profile UI
- `src/components/settings/ApiConfigSection.vue` — API provider 配置
- `src/components/settings/ImageGenSection.vue` — 文生图配置
- `scripts/test-settingsServices.mjs` — 4 个服务的 mock-fetch 测试

**修改**：
- `src/stores/settings.js` — 加 `userProfiles/activeProfileId/apiStatus/apiLatency/imageGenStatus/imageGenLatency` + 旧数据迁移
- `src/stores/chat.js` — 消息加 `images:[]` + `buildApiMessages` 加 `[User Info]`
- `src/views/SettingsView.vue` — 装配 5 个 section
- `src/components/chat/MessageBubble.vue` — 渲染 `images` 网格

---

## 阶段 1：服务层 + 设置页全模块

### Task 1.1: 新建 `src/services/apiProviders.js`

**Files:**
- Create: `rphub-desktop/src/services/apiProviders.js`
- Test: `rphub-desktop/scripts/test-settingsServices.mjs`（在 Task 1.2 完整，本任务先在脚本里 import 这个文件并跑 placeholder）

**Interfaces:**
- Produces:
  ```js
  export const API_PROVIDERS // Array<{id, name, apiUrl, icon}>
  export const IMAGE_GEN_PROVIDERS // Array<{id, name, apiUrl, icon, defaultModel, fixedSize?}>
  export const CUSTOM_PROVIDER_SLOTS // Array<{id, name}>  // id: 'custom' | 'custom2'
  export function getApiProviderById(id)
  export function getImageGenProviderById(id)
  export function isCustomApiProviderId(id)
  export function isCustomImageGenProviderId(id)
  export function getCustomApiUrlKey(id)    // 'custom' -> 'customApiUrl', 'custom2' -> 'customApiUrl2'
  export function getCustomImageGenUrlKey(id) // 同理
  export function normalizeProviderUrl(url) // 去尾 /, lowercase
  export function resolveActiveApiProvider(settings) // 返回 { apiUrl, apiKey, provider }
  export function resolveActiveImageGenProvider(settings)
  ```

- [ ] **Step 1: 创建文件，写 provider 表与 helpers**

`rphub-desktop/src/services/apiProviders.js`:

```js
// rphub-desktop/src/services/apiProviders.js
// 纯函数模块：API/文生图 provider 预设表 + 解析 helpers
// 与网页版 assets/js/app.js:103-170 / 626-770 对齐

export const API_PROVIDERS = [
  { id: 'agnes', name: 'Agnes', apiUrl: 'https://apihub.agnes-ai.com/v1', icon: 'https://agnes-ai.com/images/logo-icon.png' },
  { id: 'sta1n', name: 'STA1N API', apiUrl: 'https://cdn.sta1n.cn/v1', icon: 'https://img.cdn1.vip/i/69c18cc07538b_1774292160.webp' },
  { id: 'deepseek', name: 'DeepSeek', apiUrl: 'https://api.deepseek.com/v1', icon: 'https://www.deepseek.com/favicon.ico' },
  { id: 'openrouter', name: 'OpenRouter', apiUrl: 'https://openrouter.ai/api/v1', icon: 'https://openrouter.ai/favicon.ico' },
  { id: 'siliconflow', name: 'SiliconFlow', apiUrl: 'https://api.siliconflow.cn/v1', icon: 'https://siliconflow.cn/favicon.ico' },
  { id: 'opencode', name: 'OpenCode', apiUrl: 'https://rphub.aieasy.cc.cd/opencode/zen/v1', icon: 'https://opencode.ai/favicon-v3.ico' },
  { id: 'sensenova', name: 'SenseNova', apiUrl: 'https://rphub.aieasy.cc.cd/sensenova/v1', icon: 'https://largemodel.sensetime.com/skin/images/bannericon.svg' },
  { id: 'mimo', name: 'mimo', apiUrl: 'https://rphub.aieasy.cc.cd/mimo/v1', icon: '' }
]

export const IMAGE_GEN_PROVIDERS = [
  { id: 'agnes', name: 'Agnes', apiUrl: 'https://apihub.agnes-ai.com/v1', icon: 'https://agnes-ai.com/images/logo-icon.png', defaultModel: 'agnes-image-2.1-flash' },
  { id: 'sensenova', name: 'SenseNova', apiUrl: 'https://rphub.aieasy.cc.cd/sensenova/v1', icon: 'https://largemodel.sensetime.com/skin/images/bannericon.svg', defaultModel: 'sensenova-u1-fast', fixedSize: '1760x2368' }
]

export const CUSTOM_PROVIDER_SLOTS = [
  { id: 'custom', name: '自定义' },
  { id: 'custom2', name: '自定义2' }
]

export const CUSTOM_IMAGE_GEN_SLOTS = CUSTOM_PROVIDER_SLOTS

export function getApiProviderById(id) {
  return API_PROVIDERS.find(p => p.id === id) || null
}

export function getImageGenProviderById(id) {
  return IMAGE_GEN_PROVIDERS.find(p => p.id === id) || null
}

export function isCustomApiProviderId(id) {
  return CUSTOM_PROVIDER_SLOTS.some(p => p.id === id)
}

export function isCustomImageGenProviderId(id) {
  return CUSTOM_IMAGE_GEN_SLOTS.some(p => p.id === id)
}

export function getCustomApiUrlKey(id) {
  return id === 'custom2' ? 'customApiUrl2' : 'customApiUrl'
}

export function getCustomImageGenUrlKey(id) {
  return id === 'custom2' ? 'customImageGenUrl2' : 'customImageGenUrl'
}

export function normalizeProviderUrl(url) {
  return String(url || '').replace(/\/+$/, '').toLowerCase()
}

/**
 * 从 settings 解析当前激活的 API provider。
 * - 如果 apiProviderId 命中内置：返回内置（apiUrl = provider.apiUrl）
 * - 如果 apiProviderId 命中 custom/custom2：apiUrl 从 settings[getCustomApiUrlKey(id)] 读
 * - key 始终从 settings.apiProviderKeys[id] 读
 */
export function resolveActiveApiProvider(settings) {
  const id = settings.apiProviderId || 'agnes'
  const key = (settings.apiProviderKeys && settings.apiProviderKeys[id]) || settings.apiKey || ''
  const builtin = getApiProviderById(id)
  if (builtin) {
    return { id, name: builtin.name, apiUrl: builtin.apiUrl, apiKey: key, isCustom: false, provider: builtin }
  }
  if (isCustomApiProviderId(id)) {
    return {
      id, name: id === 'custom2' ? '自定义2' : '自定义',
      apiUrl: settings[getCustomApiUrlKey(id)] || '',
      apiKey: key,
      isCustom: true
    }
  }
  // 未知 id：回退 agnes
  return resolveActiveApiProvider({ ...settings, apiProviderId: 'agnes' })
}

/** 与 resolveActiveApiProvider 对称，但返回文生图 provider 字段（含 defaultModel） */
export function resolveActiveImageGenProvider(settings) {
  const id = settings.imageGenProviderId || 'agnes'
  const key = (settings.imageGenProviderKeys && settings.imageGenProviderKeys[id]) || settings.imageGenKey || ''
  const model = (settings.imageGenProviderModels && settings.imageGenProviderModels[id]) || ''
  const builtin = getImageGenProviderById(id)
  if (builtin) {
    return { id, name: builtin.name, apiUrl: builtin.apiUrl, apiKey: key, model, fixedSize: builtin.fixedSize || null, isCustom: false, provider: builtin }
  }
  if (isCustomImageGenProviderId(id)) {
    return {
      id, name: id === 'custom2' ? '自定义2' : '自定义',
      apiUrl: settings[getCustomImageGenUrlKey(id)] || '',
      apiKey: key, model,
      isCustom: true
    }
  }
  return resolveActiveImageGenProvider({ ...settings, imageGenProviderId: 'agnes' })
}
```

- [ ] **Step 2: 验证文件可被 import**

```bash
cd rphub-desktop
node -e "import('./src/services/apiProviders.js').then(m => console.log('providers count:', m.API_PROVIDERS.length, 'imageGen count:', m.IMAGE_GEN_PROVIDERS.length))"
```

预期输出：`providers count: 8 imageGen count: 2`

- [ ] **Step 3: Commit**

```bash
git add rphub-desktop/src/services/apiProviders.js
git commit -m "feat(settings): add apiProviders service with 8 API + 2 image-gen providers"
```

---

### Task 1.2: 新建 `src/services/connectionCheck.js` + 测试脚本

**Files:**
- Create: `rphub-desktop/src/services/connectionCheck.js`
- Create: `rphub-desktop/scripts/test-settingsServices.mjs`

**Interfaces:**
- Produces:
  ```js
  // returns { status: 'connected'|'error', latency: number, error?: string }
  export async function checkApiConnection({ baseURL, apiKey, signal, timeoutMs = 10000 })
  export async function checkImageGenConnection({ baseURL, apiKey, signal, timeoutMs = 10000 })
  ```

- [ ] **Step 1: 写失败测试**

`rphub-desktop/scripts/test-settingsServices.mjs`（脚本开头；后续 task 会追加）:

```js
// rphub-desktop/scripts/test-settingsServices.mjs
// Mock-fetch tests for settings-related services.
let passed = 0, failed = 0
function test(name, fn) {
  try {
    fn()
    console.log(`  PASS  ${name}`)
    passed++
  } catch (err) {
    console.error(`  FAIL  ${name}\n    ${err.message}`)
    failed++
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed')
}
function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'assertEq'}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`)
  }
}
function setFetchMock(responder) { globalThis.fetch = async (url, opts) => responder(url, opts) }
function restoreFetch() { delete globalThis.fetch }

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) }
}
function emptyResponse(status) {
  return { ok: status >= 200 && status < 300, status, json: async () => null, text: async () => '' }
}

test('scaffold runs', () => { assertEq(1 + 1, 2, 'sanity') })

// ─── connectionCheck (Task 1.2) ─────────────────────
import { checkApiConnection, checkImageGenConnection } from '../src/services/connectionCheck.js'

test('checkApiConnection returns connected on 200', async () => {
  setFetchMock(async (url) => {
    assertEq(url, 'https://api.example.com/v1/models', 'url should append /v1/models')
    return jsonResponse(200, { data: [] })
  })
  const r = await checkApiConnection({ baseURL: 'https://api.example.com/', apiKey: 'sk-test' })
  assertEq(r.status, 'connected', 'status')
  assert(typeof r.latency === 'number' && r.latency >= 0, 'latency is number')
  restoreFetch()
})

test('checkApiConnection does not double-append /v1', async () => {
  let called = ''
  setFetchMock(async (url) => { called = url; return jsonResponse(200, {}) })
  await checkApiConnection({ baseURL: 'https://api.example.com/v1/', apiKey: 'k' })
  assertEq(called, 'https://api.example.com/v1/models', 'no double /v1')
  restoreFetch()
})

test('checkApiConnection returns error on 401', async () => {
  setFetchMock(async () => jsonResponse(401, { error: 'unauthorized' }))
  const r = await checkApiConnection({ baseURL: 'https://api.example.com/v1', apiKey: 'bad' })
  assertEq(r.status, 'error', 'status on 401')
  restoreFetch()
})

test('checkApiConnection returns error on network failure', async () => {
  setFetchMock(async () => { throw new Error('network down') })
  const r = await checkApiConnection({ baseURL: 'https://api.example.com/v1', apiKey: 'k' })
  assertEq(r.status, 'error', 'status on throw')
  restoreFetch()
})

test('checkImageGenConnection uses HEAD on /images/generations', async () => {
  let calledMethod = '', calledUrl = ''
  setFetchMock(async (url, opts) => { calledMethod = opts.method; calledUrl = url; return emptyResponse(200) })
  const r = await checkImageGenConnection({ baseURL: 'https://ig.example.com/v1', apiKey: 'k' })
  assertEq(calledMethod, 'HEAD', 'HEAD method')
  assertEq(calledUrl, 'https://ig.example.com/v1/images/generations', 'url')
  assertEq(r.status, 'connected', 'status')
  restoreFetch()
})

test('checkImageGenConnection returns error on 4xx/5xx', async () => {
  setFetchMock(async () => emptyResponse(500))
  const r = await checkImageGenConnection({ baseURL: 'https://ig.example.com/v1', apiKey: 'k' })
  assertEq(r.status, 'error', 'status on 500')
  restoreFetch()
})

// ─── apiProviders (Task 1.1 sanity) ─────────────────
import { API_PROVIDERS, IMAGE_GEN_PROVIDERS, resolveActiveApiProvider, resolveActiveImageGenProvider, isCustomApiProviderId } from '../src/services/apiProviders.js'

test('API_PROVIDERS has 8 entries', () => {
  assertEq(API_PROVIDERS.length, 8, 'count')
})

test('IMAGE_GEN_PROVIDERS has 2 entries with defaultModel', () => {
  assertEq(IMAGE_GEN_PROVIDERS.length, 2, 'count')
  assert(IMAGE_GEN_PROVIDERS[0].defaultModel, 'first has defaultModel')
  assertEq(IMAGE_GEN_PROVIDERS[1].fixedSize, '1760x2368', 'sensenova fixedSize')
})

test('resolveActiveApiProvider returns builtin for agnes', () => {
  const s = { apiProviderId: 'agnes', apiProviderKeys: { agnes: 'sk-x' }, apiKey: 'sk-x' }
  const r = resolveActiveApiProvider(s)
  assertEq(r.id, 'agnes')
  assertEq(r.apiKey, 'sk-x')
  assertEq(r.isCustom, false)
  assertEq(r.apiUrl, 'https://apihub.agnes-ai.com/v1')
})

test('resolveActiveApiProvider returns custom for custom2', () => {
  const s = { apiProviderId: 'custom2', apiProviderKeys: { custom2: 'k' }, customApiUrl2: 'https://my.api/v1' }
  const r = resolveActiveApiProvider(s)
  assertEq(r.id, 'custom2')
  assertEq(r.apiUrl, 'https://my.api/v1')
  assertEq(r.isCustom, true)
})

test('isCustomApiProviderId handles custom/custom2', () => {
  assertEq(isCustomApiProviderId('custom'), true)
  assertEq(isCustomApiProviderId('custom2'), true)
  assertEq(isCustomApiProviderId('agnes'), false)
})

// ─── imageGen (Task 1.3) ────────────────────────────
import { generateImages, sizeToDims, styleToArtists, IMAGE_STYLES, IMAGE_SIZES } from '../src/services/imageGen.js'

test('sizeToDims maps 竖图 to 736x1312', () => assertEq(sizeToDims('竖图'), '736x1312', 'size'))
test('sizeToDims maps 4K方图 to 3456x2592', () => assertEq(sizeToDims('4K方图'), '3456x2592', 'size'))
test('sizeToDims returns 736x1312 for unknown', () => assertEq(sizeToDims('foo'), '736x1312', 'default'))

test('styleToArtists returns custom artists for style=custom', () => {
  const a = styleToArtists('custom', 'masterpiece, my style')
  assert(a.includes('masterpiece'), 'includes custom artists')
})

test('styleToArtists returns built-in for style=vertical', () => {
  const a = styleToArtists('vertical', '')
  assert(typeof a === 'string' && a.length > 0, 'non-empty artists')
})

test('IMAGE_STYLES has 7 entries', () => assertEq(IMAGE_STYLES.length, 7, 'styles count'))
test('IMAGE_SIZES has 9 entries', () => assertEq(IMAGE_SIZES.length, 9, 'sizes count'))

test('generateImages posts to /images/generations and returns dataURLs', async () => {
  setFetchMock(async (url, opts) => {
    assertEq(url, 'https://ig.example.com/v1/images/generations', 'url')
    const body = JSON.parse(opts.body)
    assertEq(body.n, 2, 'n')
    assertEq(body.response_format, 'b64_json', 'response_format')
    return jsonResponse(200, { data: [{ b64_json: 'AAAA' }, { b64_json: 'BBBB' }] })
  })
  const out = await generateImages({
    baseURL: 'https://ig.example.com/v1',
    apiKey: 'k', model: 'm', prompt: 'p', size: '736x1312', n: 2
  })
  assertEq(out.length, 2, 'count')
  assertEq(out[0].url, 'data:image/png;base64,AAAA', 'dataURL')
  restoreFetch()
})

test('generateImages throws on error response', async () => {
  setFetchMock(async () => jsonResponse(401, { error: 'unauthorized' }))
  let threw = false
  try { await generateImages({ baseURL: 'https://ig.example.com/v1', apiKey: 'bad', model: 'm', prompt: 'p', size: '736x1312', n: 1 }) } catch { threw = true }
  assert(threw, 'should throw on 401')
  restoreFetch()
})

// ─── userProfile (Task 1.4) ─────────────────────────
import { createProfile, ensureUserProfiles, buildUserInfoPrompt, applyPersonToggle, migrateLegacyUser } from '../src/services/userProfile.js'

test('createProfile generates uuid and defaults', () => {
  const p = createProfile({ name: 'Test' })
  assert(typeof p.uuid === 'string' && p.uuid.length > 0, 'has uuid')
  assertEq(p.name, 'Test')
  assertEq(p.person, 'second')
  assertEq(p.description, '')
  assertEq(p.avatar, '')
})

test('ensureUserProfiles returns existing non-empty array as-is', () => {
  const arr = [{ uuid: 'a', name: 'A', description: '', avatar: '', person: 'second' }]
  assertEq(ensureUserProfiles(arr), arr, 'unchanged')
})

test('ensureUserProfiles seeds default for empty', () => {
  const arr = ensureUserProfiles([])
  assertEq(arr.length, 1, 'one default profile')
  assert(typeof arr[0].uuid === 'string', 'has uuid')
  assertEq(arr[0].name, '默认人设')
})

test('buildUserInfoPrompt formats Name + Description', () => {
  const text = buildUserInfoPrompt({ name: 'Alice', description: 'kind' })
  assert(text.includes('Name: Alice'))
  assert(text.includes('Description: kind'))
})

test('applyPersonToggle enables second-person preset, disables third', () => {
  const presets = [
    { name: '第二人称', enabled: false },
    { name: '第三人称', enabled: true }
  ]
  const out = applyPersonToggle(presets, 'second')
  assertEq(out[0].enabled, true, 'second on')
  assertEq(out[1].enabled, false, 'third off')
})

test('applyPersonToggle enables third-person preset when person=third', () => {
  const presets = [
    { name: '第二人称', enabled: true },
    { name: '第三人称', enabled: false }
  ]
  const out = applyPersonToggle(presets, 'third')
  assertEq(out[0].enabled, false)
  assertEq(out[1].enabled, true)
})

test('migrateLegacyUser creates a profile from old user object', () => {
  const user = { name: 'Old', description: 'd', avatar: 'data:...', person: 'third' }
  const result = migrateLegacyUser(user)
  assert(result.profiles.length === 1, 'one profile')
  assertEq(result.profiles[0].name, 'Old')
  assertEq(result.activeProfileId, result.profiles[0].uuid)
})

// ─── Runner ─────────────────────────────────────────
import { fileURLToPath } from 'node:url'
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}
export { passed, failed }
```

- [ ] **Step 2: 跑测试，确认全部 FAIL（因为 service 文件还没建）**

```bash
cd rphub-desktop
node scripts/test-settingsServices.mjs
```

预期：所有 import 报错；至少 8+ 个测试 FAIL。

- [ ] **Step 3: 创建 `connectionCheck.js`**

`rphub-desktop/src/services/connectionCheck.js`:

```js
// rphub-desktop/src/services/connectionCheck.js
// 纯函数：API/文生图连接探测
import { normalizeProviderUrl } from './apiProviders.js'

function withTimeout(signal, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return { signal: controller.signal, cancel: () => clearTimeout(timer) }
}

/**
 * GET {baseURL}/models 带 Bearer，10s 超时
 * 返回 { status: 'connected' | 'error', latency, error? }
 */
export async function checkApiConnection({ baseURL, apiKey, signal, timeoutMs = 10000 }) {
  const { signal: s, cancel } = withTimeout(signal, timeoutMs)
  const base = normalizeProviderUrl(baseURL)
  const url = base.endsWith('/v1') ? `${base}/models` : `${base}/v1/models`
  const start = Date.now()
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: s
    })
    cancel()
    if (res.ok) {
      return { status: 'connected', latency: Date.now() - start }
    }
    return { status: 'error', latency: Date.now() - start, error: `HTTP ${res.status}` }
  } catch (e) {
    cancel()
    return { status: 'error', latency: Date.now() - start, error: e.message }
  }
}

/**
 * HEAD {baseURL}/images/generations，10s 超时
 */
export async function checkImageGenConnection({ baseURL, apiKey, signal, timeoutMs = 10000 }) {
  const { signal: s, cancel } = withTimeout(signal, timeoutMs)
  const url = `${normalizeProviderUrl(baseURL)}/images/generations`
  const start = Date.now()
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
      signal: s
    })
    cancel()
    if (res.ok) {
      return { status: 'connected', latency: Date.now() - start }
    }
    return { status: 'error', latency: Date.now() - start, error: `HTTP ${res.status}` }
  } catch (e) {
    cancel()
    return { status: 'error', latency: Date.now() - start, error: e.message }
  }
}
```

- [ ] **Step 4: 跑测试，验证 connectionCheck 测试通过**

```bash
cd rphub-desktop
node scripts/test-settingsServices.mjs
```

预期：`checkApiConnection * 4 tests` + `checkImageGenConnection * 2 tests` 全 PASS；其他任务 1.1/1.3/1.4 的测试仍 FAIL（因为文件未建）。

- [ ] **Step 5: Commit**

```bash
git add rphub-desktop/src/services/connectionCheck.js rphub-desktop/scripts/test-settingsServices.mjs
git commit -m "feat(settings): add connectionCheck service + test scaffold (4 service tests still fail)"
```

---

### Task 1.3: 新建 `src/services/imageGen.js`

**Files:**
- Create: `rphub-desktop/src/services/imageGen.js`

**Interfaces:**
- Produces:
  ```js
  export const IMAGE_STYLES // Array<{value, label}> 长度 7
  export const IMAGE_SIZES  // Array<{value, label}> 长度 9
  export function sizeToDims(sizeValue) // '竖图' -> '736x1312' ...
  export function styleToArtists(style, customArtists) // 返回艺术家提示词字符串
  export async function generateImages({ baseURL, apiKey, model, prompt, size, n, signal }) // returns [{url, prompt}]
  ```

- [ ] **Step 1: 创建文件，从网页版复制 STYLE_ARTISTS 和尺寸映射**

`rphub-desktop/src/services/imageGen.js`:

```js
// rphub-desktop/src/services/imageGen.js
// 纯函数：文生图 fetch + 风格/尺寸映射
// STYLE_ARTISTS 来自网页版 assets/js/app.js:9461-9480
// SIZE_DIMS 来自网页版 IMAGE_GEN_SIZE_MAP（同一文件）

export const IMAGE_STYLES = [
  { value: 'vertical',    label: '韩漫小清新风' },
  { value: 'comicDoujin', label: '动漫同人风' },
  { value: 'r18',         label: '2.5D唯美风' },
  { value: 'lolita25d',   label: '2.5D唯美风（萝）' },
  { value: 'anime',       label: '本子里番风' },
  { value: 'galgame',     label: 'GalGame风' },
  { value: 'custom',      label: '自定义' }
]

export const IMAGE_SIZES = [
  { value: '竖图',   label: '竖图(736x1312)' },
  { value: '横图',   label: '横图(1312x736)' },
  { value: '方图',   label: '方图(1152x864)' },
  { value: '2K竖图', label: '2K竖图(1472x2624)' },
  { value: '2K横图', label: '2K横图(2624x1472)' },
  { value: '2K方图', label: '2K方图(2304x1728)' },
  { value: '4K竖图', label: '4K竖图(2208x3936)' },
  { value: '4K横图', label: '4K横图(3648x2048)' },
  { value: '4K方图', label: '4K方图(3456x2592)' }
]

const SIZE_DIMS = {
  '竖图':   '736x1312',
  '横图':   '1312x736',
  '方图':   '1152x864',
  '2K竖图': '1472x2624',
  '2K横图': '2624x1472',
  '2K方图': '2304x1728',
  '4K竖图': '2208x3936',
  '4K横图': '3648x2048',
  '4K方图': '3456x2592'
}

export function sizeToDims(sizeValue) {
  return SIZE_DIMS[sizeValue] || '736x1312'
}

/**
 * 风格 → 艺术家标签字符串。
 * STYLE_ARTISTS 字典的 value 必须**从网页版 assets/js/app.js:9461-9480 整段复制**过来。
 * 实施者：先打开那个文件，把 6 个 if/else 分支的标签字符串原样粘到下面。
 * 如果 style === 'custom'，返回 customArtists（settings.customImageArtists）。
 */
const STYLE_ARTISTS = {
  // <paste from app.js:9461 here>
  // <paste from app.js:9463 here>
  // <paste from app.js:9465 here>
  // <paste from app.js:9467 here>
  // <paste from app.js:9469 here>
  // <paste from app.js:9471 here>
}

export function styleToArtists(style, customArtists) {
  if (style === 'custom') return String(customArtists || '').trim()
  return STYLE_ARTISTS[style] || ''
}

import { normalizeProviderUrl } from './apiProviders.js'

/**
 * POST {baseURL}/images/generations
 * 解析 { data: [{ b64_json }] } → dataURL
 */
export async function generateImages({ baseURL, apiKey, model, prompt, size, n = 1, signal }) {
  const url = `${normalizeProviderUrl(baseURL)}/images/generations`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      n,
      response_format: 'b64_json'
    }),
    signal
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`ImageGen ${res.status}: ${err}`)
  }
  const data = await res.json()
  const list = Array.isArray(data?.data) ? data.data : []
  return list.map(item => ({
    url: `data:image/png;base64,${item.b64_json || ''}`,
    prompt
  }))
}
```

- [ ] **Step 2: 实施者从网页版复制 STYLE_ARTISTS 字符串**

打开 `assets/js/app.js`，跳到第 9461-9480 行附近，找到形如：
```js
if (settings.imageStyle === 'comicDoujin') { ... return 'artist tags here'; }
```
的 6 个分支，把每个分支返回的字符串复制到 `STYLE_ARTISTS` 字典对应 value 上。**不要凭记忆写**。

- [ ] **Step 3: 跑测试，验证 imageGen 测试通过**

```bash
cd rphub-desktop
node scripts/test-settingsServices.mjs
```

预期：`generateImages * 2 tests` + `sizeToDims * 3` + `styleToArtists * 2` + `IMAGE_STYLES` + `IMAGE_SIZES` 全 PASS。

- [ ] **Step 4: Commit**

```bash
git add rphub-desktop/src/services/imageGen.js
git commit -m "feat(settings): add imageGen service (POST + style/size mapping)"
```

---

### Task 1.4: 新建 `src/services/userProfile.js`

**Files:**
- Create: `rphub-desktop/src/services/userProfile.js`

**Interfaces:**
- Produces:
  ```js
  export function createProfile(partial?) // 返回新 profile（含 uuid）
  export function ensureUserProfiles(arr) // 空数组 → 注入默认 profile
  export function buildUserInfoPrompt(user) // '[User Info]\nName: ...\nDescription: ...'
  export function applyPersonToggle(presets, person) // 返回新 presets 数组
  export function migrateLegacyUser(user) // 单 user → { profiles, activeProfileId }
  ```

- [ ] **Step 1: 创建文件**

`rphub-desktop/src/services/userProfile.js`:

```js
// rphub-desktop/src/services/userProfile.js
// 纯函数：人设 CRUD + 迁移 helpers，无 Vue/Pinia 依赖

function uuid() {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
}

export function createProfile(partial = {}) {
  return {
    uuid: uuid(),
    name: partial.name || '默认人设',
    description: partial.description || '',
    avatar: partial.avatar || '',
    person: partial.person === 'third' ? 'third' : 'second'
  }
}

/**
 * 如果传入数组为空，返回一个含默认 profile 的新数组；否则原样返回。
 */
export function ensureUserProfiles(arr) {
  if (Array.isArray(arr) && arr.length > 0) return arr
  return [createProfile()]
}

/**
 * 拼成 [User Info] 段，供 chat.js 注入到 system prompt
 */
export function buildUserInfoPrompt(user) {
  return ['[User Info]', `Name: ${user?.name || ''}`, `Description: ${user?.description || ''}`].join('\n')
}

/**
 * 切换人称：自动联动预设中的"第二人称"/"第三人称"两个条目的 enabled 字段
 * 返回新数组（不修改原数组）
 */
export function applyPersonToggle(presets, person) {
  if (!Array.isArray(presets)) return presets
  return presets.map(p => {
    if (p.name === '第二人称') return { ...p, enabled: person !== 'third' }
    if (p.name === '第三人称') return { ...p, enabled: person === 'third' }
    return p
  })
}

/**
 * 从旧版 settings.user 单对象迁移到新的 userProfiles 数组。
 * 返回 { profiles, activeProfileId }
 */
export function migrateLegacyUser(user) {
  const profile = createProfile({
    name: user?.name || '默认人设',
    description: user?.description || '',
    avatar: user?.avatar || '',
    person: user?.person || 'second'
  })
  return { profiles: [profile], activeProfileId: profile.uuid }
}
```

- [ ] **Step 2: 跑测试，验证 userProfile 测试通过**

```bash
cd rphub-desktop
node scripts/test-settingsServices.mjs
```

预期：`createProfile * 1` + `ensureUserProfiles * 2` + `buildUserInfoPrompt * 1` + `applyPersonToggle * 2` + `migrateLegacyUser * 1` 全 PASS；整个脚本 `passed = 0 failed = 0`（除 Task 1.1 的 API_PROVIDERS 4 个测试 — 它们现在应该也 PASS）。

- [ ] **Step 3: Commit**

```bash
git add rphub-desktop/src/services/userProfile.js
git commit -m "feat(settings): add userProfile service (CRUD + migration helpers)"
```

---

### Task 1.5: 扩展 `src/stores/settings.js`（新字段 + 旧数据迁移）

**Files:**
- Modify: `rphub-desktop/src/stores/settings.js`

**Interfaces:**
- Settings store 新增 refs: `userProfiles: ref([])`, `activeProfileId: ref(null)`, `apiStatus: ref('unknown')`, `apiLatency: ref(0)`, `imageGenStatus: ref('unknown')`, `imageGenLatency: ref(0)`
- 暴露 actions: `setUserProfiles(arr)`, `addUserProfile(p)`, `deleteUserProfile(id)`, `setActiveProfile(id)`, `updateActiveProfile(partial)`, `setApiStatus(status, latency)`, `setImageGenStatus(status, latency)`

注意：当前 store 是 `reactive({...})` 风格；为保持一致性，新字段也走 `reactive` 模式。

- [ ] **Step 1: 修改 `DEFAULT_SETTINGS`，加 6 个新字段**

修改 `rphub-desktop/src/stores/settings.js` 第 5-42 行 `DEFAULT_SETTINGS` 对象，**追加**（在第 41 行 `fastModel: ''` 后）：

```js
  userProfiles: [],
  activeProfileId: null,
  apiStatus: 'unknown',
  apiLatency: 0,
  imageGenStatus: 'unknown',
  imageGenLatency: 0
```

- [ ] **Step 2: 在 `loadSettings` 末尾加旧数据迁移**

修改 `rphub-desktop/src/stores/settings.js` 第 48-61 行 `loadSettings` 函数，在 `pushToMainProcess()` 调用之前插入：

```js
    // ─── Legacy data migration ────────────────────────
    // 1. apiKey → apiProviderKeys[currentProviderId]
    const currentProviderId = settings.apiProviderId || 'agnes'
    if (settings.apiKey && !settings.apiProviderKeys?.[currentProviderId]) {
      if (!settings.apiProviderKeys || typeof settings.apiProviderKeys !== 'object') {
        settings.apiProviderKeys = {}
      }
      settings.apiProviderKeys[currentProviderId] = settings.apiKey
    }
    // 2. imageGenKey → imageGenProviderKeys.agnes
    if (settings.imageGenKey && !Object.keys(settings.imageGenProviderKeys || {}).length) {
      if (!settings.imageGenProviderKeys || typeof settings.imageGenProviderKeys !== 'object') {
        settings.imageGenProviderKeys = {}
      }
      settings.imageGenProviderKeys['agnes'] = settings.imageGenKey
      if (!settings.imageGenProviderModels?.['agnes']) {
        if (!settings.imageGenProviderModels || typeof settings.imageGenProviderModels !== 'object') {
          settings.imageGenProviderModels = {}
        }
        settings.imageGenProviderModels['agnes'] = 'agnes-image-2.1-flash'
      }
    }
    // 3. 单 user 对象 → userProfiles 数组
    if (settings.user && !settings.userProfiles.length) {
      const { profiles, activeProfileId } = migrateLegacyUser(settings.user)
      settings.userProfiles = profiles
      settings.activeProfileId = activeProfileId
    }
    // 兜底：保证至少一个 profile
    if (!settings.userProfiles.length) {
      const fresh = createProfile()
      settings.userProfiles = [fresh]
      settings.activeProfileId = fresh.uuid
    }
```

并在文件顶部 import：

```js
import { createProfile, migrateLegacyUser } from '../services/userProfile.js'
```

- [ ] **Step 3: 在 store 末尾暴露新 actions**

在 `return { ... }` 块（第 88-95 行）**之前**追加以下 actions：

```js
  function setUserProfiles(arr) {
    settings.userProfiles = Array.isArray(arr) ? arr : []
  }
  function addUserProfile(partial) {
    const p = createProfile(partial)
    settings.userProfiles.push(p)
    settings.activeProfileId = p.uuid
    return p
  }
  function deleteUserProfile(id) {
    const idx = settings.userProfiles.findIndex(p => p.uuid === id)
    if (idx === -1) return
    settings.userProfiles.splice(idx, 1)
    if (settings.activeProfileId === id) {
      if (settings.userProfiles.length) {
        settings.activeProfileId = settings.userProfiles[0].uuid
      } else {
        const fresh = createProfile()
        settings.userProfiles = [fresh]
        settings.activeProfileId = fresh.uuid
      }
    }
  }
  function setActiveProfile(id) {
    if (settings.userProfiles.find(p => p.uuid === id)) {
      settings.activeProfileId = id
    }
  }
  function updateActiveProfile(partial) {
    const idx = settings.userProfiles.findIndex(p => p.uuid === settings.activeProfileId)
    if (idx === -1) return
    settings.userProfiles[idx] = { ...settings.userProfiles[idx], ...partial }
  }
  function setApiStatus(status, latency = 0) {
    settings.apiStatus = status
    settings.apiLatency = latency
  }
  function setImageGenStatus(status, latency = 0) {
    settings.imageGenStatus = status
    settings.imageGenLatency = latency
  }
```

并在 `return { ... }` 块中追加：

```js
    setUserProfiles, addUserProfile, deleteUserProfile, setActiveProfile, updateActiveProfile,
    setApiStatus, setImageGenStatus
```

- [ ] **Step 4: 验证 imports + 字段加载不报错**

```bash
cd rphub-desktop
npm run dev
```

打开 Electron 窗口，导航到「设置」页（应该还是原 UI，没有变化）。打开 devtools console，应该**没有** `Failed to load settings` 或 import 错误。关闭 dev server：

```bash
# 在 dev server 终端按 Ctrl+C
```

- [ ] **Step 5: Commit**

```bash
git add rphub-desktop/src/stores/settings.js
git commit -m "feat(settings): extend store with userProfiles + apiStatus + legacy migration"
```

---

### Task 1.6: 通用组件 `ProviderDropdown` + `ConnectionStatusBadge`

**Files:**
- Create: `rphub-desktop/src/components/settings/ProviderDropdown.vue`
- Create: `rphub-desktop/src/components/settings/ConnectionStatusBadge.vue`

**Interfaces:**
- `<ProviderDropdown>` props: `modelValue`(string), `providers`(Array), `customSlots`(Array<{id,name}>), `iconField`(string, default `'icon'`)。emit `update:modelValue`。
- `<ConnectionStatusBadge>` props: `status`(string: 'unknown'|'checking'|'connected'|'error'), `latency`(number)。

- [ ] **Step 1: 创建 `ConnectionStatusBadge.vue`**

`rphub-desktop/src/components/settings/ConnectionStatusBadge.vue`:

```vue
<template>
  <div class="inline-flex items-center gap-1.5 text-xs font-medium">
    <span class="relative flex w-2 h-2">
      <span v-if="status === 'checking'" class="absolute inline-flex w-full h-full rounded-full bg-amber-400 opacity-75 animate-ping"></span>
      <span class="relative inline-flex w-2 h-2 rounded-full" :class="dotClass"></span>
    </span>
    <span :class="textClass">{{ label }}</span>
    <span v-if="status === 'connected' && latency > 0" class="text-gray-400 tabular-nums">{{ latency }}ms</span>
  </div>
</template>

<script>
export default {
  name: 'ConnectionStatusBadge',
  props: {
    status: { type: String, default: 'unknown' }, // unknown | checking | connected | error
    latency: { type: Number, default: 0 }
  },
  computed: {
    dotClass() {
      return {
        'bg-emerald-500': this.status === 'connected',
        'bg-rose-500': this.status === 'error',
        'bg-amber-400': this.status === 'checking',
        'bg-gray-300': this.status === 'unknown'
      }[this.status] || 'bg-gray-300'
    },
    textClass() {
      return {
        'text-emerald-700': this.status === 'connected',
        'text-rose-600': this.status === 'error',
        'text-amber-600': this.status === 'checking',
        'text-gray-500': this.status === 'unknown'
      }[this.status] || 'text-gray-500'
    },
    label() {
      return {
        connected: '已连接',
        error: '连接失败',
        checking: '检测中…',
        unknown: '未检测'
      }[this.status] || '未检测'
    }
  }
}
</script>
```

- [ ] **Step 2: 创建 `ProviderDropdown.vue`**

`rphub-desktop/src/components/settings/ProviderDropdown.vue`:

```vue
<template>
  <div class="relative">
    <button type="button" @click="open = !open"
      class="w-full px-3 py-2.5 bg-white border border-gray-200/80 rounded-xl flex items-center justify-between text-sm hover:border-gray-300 transition-all">
      <span class="flex items-center gap-2 min-w-0">
        <img v-if="active?.icon" :src="active.icon" class="w-5 h-5 rounded object-contain flex-shrink-0" alt="">
        <span class="w-5 h-5 rounded bg-gray-100 flex-shrink-0" v-else></span>
        <span class="truncate text-gray-800 font-medium">{{ active?.name || '选择提供商' }}</span>
      </span>
      <svg class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform" :class="{ 'rotate-180': open }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>
    <div v-if="open" @click.stop
      class="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
      <div v-for="p in providers" :key="p.id" @click="select(p.id)"
        class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
        :class="{ 'bg-primary-50 text-primary-700': p.id === modelValue }">
        <img v-if="p[iconField]" :src="p[iconField]" class="w-5 h-5 rounded object-contain flex-shrink-0" alt="">
        <span class="w-5 h-5 rounded bg-gray-100 flex-shrink-0" v-else></span>
        <span class="truncate">{{ p.name }}</span>
      </div>
      <div v-if="customSlots?.length" class="border-t border-gray-100 mt-1 pt-1">
        <div v-for="p in customSlots" :key="p.id" @click="select(p.id)"
          class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
          :class="{ 'bg-primary-50 text-primary-700': p.id === modelValue }">
          <span class="w-5 h-5 rounded bg-gradient-to-br from-primary-100 to-primary-200 flex-shrink-0 flex items-center justify-center text-[10px] text-primary-700 font-bold">{{ p.name.slice(0, 1) }}</span>
          <span class="truncate">{{ p.name }}</span>
        </div>
      </div>
    </div>
    <div v-if="open" class="fixed inset-0 z-10" @click="open = false"></div>
  </div>
</template>

<script>
export default {
  name: 'ProviderDropdown',
  props: {
    modelValue: { type: String, required: true },
    providers: { type: Array, required: true },
    customSlots: { type: Array, default: () => [] },
    iconField: { type: String, default: 'icon' }
  },
  emits: ['update:modelValue'],
  data() {
    return { open: false }
  },
  computed: {
    active() {
      return this.providers.find(p => p.id === this.modelValue)
        || this.customSlots.find(p => p.id === this.modelValue)
        || null
    }
  },
  methods: {
    select(id) {
      this.$emit('update:modelValue', id)
      this.open = false
    }
  }
}
</script>
```

- [ ] **Step 3: 验证组件能 import**

```bash
cd rphub-desktop
npm run dev
```

打开设置页（暂时**不**装配新组件，确认控制台无错）。关闭 dev server。

- [ ] **Step 4: Commit**

```bash
git add rphub-desktop/src/components/settings/ProviderDropdown.vue rphub-desktop/src/components/settings/ConnectionStatusBadge.vue
git commit -m "feat(settings): add reusable ProviderDropdown + ConnectionStatusBadge"
```

---

### Task 1.7: `UserProfileSection.vue` 组件

**Files:**
- Create: `rphub-desktop/src/components/settings/UserProfileSection.vue`

**Interfaces:**
- Props: 无
- 内部: 使用 `useSettingsStore` 读 `settings.userProfiles / activeProfileId / apiProviderId` (just for clarity)
- Emit: 无；直接写 store

- [ ] **Step 1: 创建组件**

`rphub-desktop/src/components/settings/UserProfileSection.vue`:

```vue
<template>
  <section class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30">
      <h3 class="font-bold text-gray-800">用户人设</h3>
      <p class="text-xs text-gray-400 mt-0.5">多个人设可在聊天中切换，当前人设会注入到 system prompt</p>
    </div>

    <div class="px-6 py-5 space-y-5">
      <!-- Profile bar -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-gray-700">人设列表</label>
          <button @click="handleAdd" class="text-xs px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium">+ 新建人设</button>
        </div>
        <div class="flex flex-wrap gap-2">
          <div v-for="p in settings.userProfiles" :key="p.uuid"
            @click="handleSwitch(p.uuid)"
            class="group relative cursor-pointer flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-2 transition-all"
            :class="p.uuid === settings.activeProfileId ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'">
            <div class="w-7 h-7 rounded-full bg-gradient-to-br from-primary-200 to-primary-300 flex items-center justify-center text-xs text-primary-800 font-bold overflow-hidden">
              <img v-if="p.avatar" :src="p.avatar" class="w-full h-full object-cover" alt="">
              <span v-else>{{ (p.name || '?').slice(0, 1) }}</span>
            </div>
            <span class="text-xs font-medium" :class="p.uuid === settings.activeProfileId ? 'text-primary-700' : 'text-gray-600'">{{ p.name || '未命名' }}</span>
            <button v-if="settings.userProfiles.length > 1" @click.stop="handleDelete(p.uuid)"
              class="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition-opacity text-xs leading-none">×</button>
          </div>
        </div>
      </div>

      <!-- Active profile editor -->
      <template v-if="activeProfile">
        <div class="border-t border-gray-100/80 pt-5 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">头像</label>
              <div class="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary-200 to-primary-300 flex items-center justify-center text-2xl text-primary-800 font-bold overflow-hidden cursor-pointer group">
                <img v-if="activeProfile.avatar" :src="activeProfile.avatar" class="w-full h-full object-cover" alt="">
                <span v-else>{{ (activeProfile.name || '?').slice(0, 1) }}</span>
                <input type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" @change="handleAvatarUpload">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px]">更换</div>
              </div>
            </div>
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">名称</label>
                <input v-model="activeProfile.name" type="text" placeholder="用户名称"
                  class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">人称</label>
                <div class="flex gap-2">
                  <button @click="setPerson('second')" type="button"
                    class="flex-1 px-3 py-2 rounded-xl border-2 transition-all text-sm font-medium"
                    :class="activeProfile.person !== 'third' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'">第二人称</button>
                  <button @click="setPerson('third')" type="button"
                    class="flex-1 px-3 py-2 rounded-xl border-2 transition-all text-sm font-medium"
                    :class="activeProfile.person === 'third' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'">第三人称</button>
                </div>
                <p class="text-xs text-gray-400 mt-1.5">切换人称会自动启用对应的"第二/第三人称"预设</p>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">人设描述</label>
            <textarea v-model="activeProfile.description" rows="3" placeholder="你的性格、背景、说话风格等…"
              class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm resize-none"></textarea>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script>
import { useSettingsStore } from '../../stores/settings'
import { useUIStore } from '../../stores/ui'
import { applyPersonToggle } from '../../services/userProfile'
import { usePresetsStore } from '../../stores/presets'

export default {
  name: 'UserProfileSection',
  setup() {
    const settingsStore = useSettingsStore()
    const ui = useUIStore()
    const presetsStore = usePresetsStore()
    const settings = settingsStore.settings

    const activeProfile = computed(() => {
      return settings.userProfiles.find(p => p.uuid === settings.activeProfileId) || null
    })

    function handleSwitch(id) {
      settingsStore.setActiveProfile(id)
    }
    function handleAdd() {
      settingsStore.addUserProfile({ name: '新人设' })
    }
    function handleDelete(id) {
      if (settings.userProfiles.length <= 1) {
        ui.addToast('无法删除唯一的人设', 'error')
        return
      }
      settingsStore.deleteUserProfile(id)
      ui.addToast('人设已删除', 'info')
    }
    function setPerson(person) {
      settingsStore.updateActiveProfile({ person })
      presetsStore.presets = applyPersonToggle(presetsStore.presets, person)
      presetsStore.savePresets()
    }
    async function handleAvatarUpload(e) {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (ev) => {
        try {
          // 简单压缩：< 200KB
          const dataUrl = await compressImage(ev.target.result, 200, 0.6)
          settingsStore.updateActiveProfile({ avatar: dataUrl })
        } catch {
          settingsStore.updateActiveProfile({ avatar: ev.target.result })
        }
      }
      reader.readAsDataURL(file)
    }
    function compressImage(src, maxSize, quality) {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ratio = Math.min(1, maxSize / Math.max(img.width, img.height))
          canvas.width = Math.round(img.width * ratio)
          canvas.height = Math.round(img.height * ratio)
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', quality))
        }
        img.onerror = reject
        img.src = src
      })
    }

    return { settings, activeProfile, handleSwitch, handleAdd, handleDelete, setPerson, handleAvatarUpload }
  }
}
</script>
```

注意：`activeProfile` 是 computed 包装的对象，对其 `v-model` 改字段会触发 `settingsStore.updateActiveProfile` 之外的隐式写——这是 Vue 的 reactive 行为（reactive 数组里的对象本身就是响应式的），无需额外 `updateActiveProfile` 调用即可工作。但为了显式一致，可以在 `name/description/person/avatar` 的 v-model 后挂 `@change` 显式调用 `updateActiveProfile`。本任务先按上面的 reactive 写法跑（已可用），后续可优化。

- [ ] **Step 2: 验证组件能 import 不报错**

```bash
cd rphub-desktop
npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add rphub-desktop/src/components/settings/UserProfileSection.vue
git commit -m "feat(settings): add UserProfileSection with multi-profile management"
```

---

### Task 1.8: `ApiConfigSection.vue` 组件

**Files:**
- Create: `rphub-desktop/src/components/settings/ApiConfigSection.vue`

**Interfaces:**
- Props: 无
- 内部: 使用 `useSettingsStore` 读 `settings.apiProviderId / apiProviderKeys / customApiUrl / customApiUrl2 / model / qualityModel / balancedModel / fastModel / temperature / stream / apiStatus / apiLatency`

- [ ] **Step 1: 创建组件**

`rphub-desktop/src/components/settings/ApiConfigSection.vue`:

```vue
<template>
  <section class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30 flex items-center justify-between">
      <div>
        <h3 class="font-bold text-gray-800">API 配置</h3>
        <p class="text-xs text-gray-400 mt-0.5">选择提供商并配置连接信息</p>
      </div>
      <ConnectionStatusBadge :status="settings.apiStatus" :latency="settings.apiLatency" />
    </div>

    <div class="px-6 py-5 space-y-5">
      <!-- Provider dropdown -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">提供商</label>
        <ProviderDropdown
          :model-value="settings.apiProviderId"
          :providers="API_PROVIDERS"
          :custom-slots="CUSTOM_PROVIDER_SLOTS"
          @update:model-value="selectProvider" />
      </div>

      <!-- API Base URL -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">API 地址</label>
        <input v-model="settings.apiUrl" type="text" :placeholder="placeholderUrl"
          :disabled="!isCustom" :readonly="!isCustom"
          class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm disabled:opacity-70 disabled:cursor-not-allowed" />
        <p v-if="!isCustom" class="text-xs text-gray-400 mt-1.5">已锁定为「{{ activeName }}」的默认地址，自定义模式下可编辑</p>
      </div>

      <!-- API Key -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
        <div class="relative">
          <input :type="showKey ? 'text' : 'password'" v-model="settings.apiKey" placeholder="sk-..."
            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm pr-10" />
          <button @click="showKey = !showKey" type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg v-if="showKey" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
          </button>
        </div>
      </div>

      <!-- Test connection -->
      <div class="flex items-center gap-3">
        <button @click="handleTest" :disabled="settings.apiStatus === 'checking'"
          class="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {{ settings.apiStatus === 'checking' ? '检测中…' : '测试连接' }}
        </button>
        <span v-if="lastError" class="text-xs text-rose-600 truncate">{{ lastError }}</span>
      </div>

      <!-- Model + tiers -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">默认模型</label>
        <input v-model="settings.model" type="text" placeholder="gpt-4o"
          class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
      </div>
      <div class="border-t border-gray-100/80 pt-5">
        <h4 class="text-sm font-medium text-gray-700 mb-3">模型分层配置</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">质量模型</label>
            <input v-model="settings.qualityModel" type="text" placeholder="gpt-4o"
              class="w-full px-3 py-2 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">平衡模型</label>
            <input v-model="settings.balancedModel" type="text" placeholder="gpt-4o-mini"
              class="w-full px-3 py-2 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">快速模型</label>
            <input v-model="settings.fastModel" type="text" placeholder="gpt-4o-mini"
              class="w-full px-3 py-2 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
          </div>
        </div>
      </div>

      <!-- Temperature -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="text-sm font-medium text-gray-700">温度 (Temperature)</label>
          <span class="text-sm text-gray-500 tabular-nums">{{ settings.temperature }}</span>
        </div>
        <input type="range" min="0" max="2" step="0.05" v-model.number="settings.temperature"
          class="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary-500" />
        <div class="flex justify-between text-xs text-gray-400 mt-1">
          <span>精确 (0)</span><span>平衡 (1)</span><span>创意 (2)</span>
        </div>
      </div>

      <!-- Stream -->
      <div class="flex items-center justify-between">
        <div>
          <label class="text-sm font-medium text-gray-700">流式输出</label>
          <p class="text-xs text-gray-400">实时显示 AI 回复内容</p>
        </div>
        <button @click="settings.stream = !settings.stream" type="button"
          class="relative w-10 h-6 rounded-full transition-colors duration-200"
          :class="settings.stream ? 'bg-primary-500' : 'bg-gray-200'">
          <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"
            :class="settings.stream ? 'translate-x-4' : ''"></span>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import { ref, computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { useUIStore } from '../../stores/ui'
import { API_PROVIDERS, CUSTOM_PROVIDER_SLOTS, getApiProviderById, isCustomApiProviderId, getCustomApiUrlKey } from '../../services/apiProviders'
import { checkApiConnection } from '../../services/connectionCheck'
import ProviderDropdown from './ProviderDropdown.vue'
import ConnectionStatusBadge from './ConnectionStatusBadge.vue'

export default {
  name: 'ApiConfigSection',
  components: { ProviderDropdown, ConnectionStatusBadge },
  setup() {
    const settingsStore = useSettingsStore()
    const ui = useUIStore()
    const settings = settingsStore.settings
    const showKey = ref(false)
    const lastError = ref('')

    const isCustom = computed(() => isCustomApiProviderId(settings.apiProviderId))
    const activeProvider = computed(() => getApiProviderById(settings.apiProviderId))
    const activeName = computed(() => activeProvider.value?.name || (isCustom.value ? (settings.apiProviderId === 'custom2' ? '自定义2' : '自定义') : ''))
    const placeholderUrl = computed(() => activeProvider.value?.apiUrl || 'https://your-api.com/v1')

    function selectProvider(id) {
      // 保存当前 provider 的 key → apiProviderKeys
      settingsStore.setApiStatus('unknown', 0)
      if (settings.apiProviderId && settings.apiKey) {
        if (!settings.apiProviderKeys || typeof settings.apiProviderKeys !== 'object') settings.apiProviderKeys = {}
        settings.apiProviderKeys[settings.apiProviderId] = settings.apiKey
      }
      settings.apiProviderId = id
      if (isCustomApiProviderId(id)) {
        settings.apiUrl = settings[getCustomApiUrlKey(id)] || ''
      } else {
        const p = getApiProviderById(id)
        if (p) settings.apiUrl = p.apiUrl
      }
      settings.apiKey = (settings.apiProviderKeys && settings.apiProviderKeys[id]) || ''
    }

    async function handleTest() {
      lastError.value = ''
      settingsStore.setApiStatus('checking')
      const r = await checkApiConnection({ baseURL: settings.apiUrl, apiKey: settings.apiKey })
      settingsStore.setApiStatus(r.status, r.latency)
      if (r.status === 'error') lastError.value = r.error || '检测失败'
    }

    return { settings, showKey, lastError, isCustom, activeName, placeholderUrl, selectProvider, handleTest, API_PROVIDERS, CUSTOM_PROVIDER_SLOTS }
  }
}
</script>
```

- [ ] **Step 2: 验证 import**

```bash
cd rphub-desktop
npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add rphub-desktop/src/components/settings/ApiConfigSection.vue
git commit -m "feat(settings): add ApiConfigSection with provider dropdown + test connection"
```

---

### Task 1.9: `ImageGenSection.vue` 组件

**Files:**
- Create: `rphub-desktop/src/components/settings/ImageGenSection.vue`

- [ ] **Step 1: 创建组件**

`rphub-desktop/src/components/settings/ImageGenSection.vue`:

```vue
<template>
  <section class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30 flex items-center justify-between">
      <div>
        <h3 class="font-bold text-gray-800">文生图配置</h3>
        <p class="text-xs text-gray-400 mt-0.5">配置自动生图接口与风格</p>
      </div>
      <ConnectionStatusBadge :status="settings.imageGenStatus" :latency="settings.imageGenLatency" />
    </div>

    <div class="px-6 py-5 space-y-5">
      <!-- Provider dropdown -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">提供商</label>
        <ProviderDropdown
          :model-value="settings.imageGenProviderId"
          :providers="IMAGE_GEN_PROVIDERS"
          :custom-slots="CUSTOM_IMAGE_GEN_SLOTS"
          @update:model-value="selectProvider" />
      </div>

      <!-- Base URL -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">API 地址</label>
        <input :value="currentImageGenUrl" @input="setImageGenUrl($event.target.value)" type="text" :placeholder="placeholderUrl"
          :disabled="!isCustom" :readonly="!isCustom"
          class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm disabled:opacity-70 disabled:cursor-not-allowed" />
      </div>

      <!-- Key -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
        <div class="relative">
          <input :type="showKey ? 'text' : 'password'" v-model="settings.imageGenKey" placeholder="key..."
            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm pr-10" />
          <button @click="showKey = !showKey" type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg v-if="showKey" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
          </button>
        </div>
      </div>

      <!-- Model -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">模型</label>
        <input v-model="settings.imageGenModel" type="text" placeholder="agnes-image-2.1-flash"
          class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
      </div>

      <!-- Test connection -->
      <div class="flex items-center gap-3">
        <button @click="handleTest" :disabled="settings.imageGenStatus === 'checking'"
          class="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
          {{ settings.imageGenStatus === 'checking' ? '检测中…' : '测试连接' }}
        </button>
        <span v-if="lastError" class="text-xs text-rose-600 truncate">{{ lastError }}</span>
      </div>

      <!-- Style -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">画面风格</label>
        <select v-model="settings.imageStyle"
          class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm">
          <option v-for="s in IMAGE_STYLES" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>

      <!-- Custom artists (when style=custom) -->
      <div v-if="settings.imageStyle === 'custom'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">自定义艺术家标签</label>
        <input v-model="settings.customImageArtists" type="text" placeholder="masterpiece, best quality, ..."
          class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
      </div>

      <!-- Size + count -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">图片尺寸</label>
          <select v-model="settings.imageSize"
            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm">
            <option v-for="s in IMAGE_SIZES" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">单次生成数量</label>
          <select :value="settings.imageGenCount" @change="settings.imageGenCount = Number($event.target.value)"
            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm">
            <option v-for="n in [1,2,3,4,5,6]" :key="n" :value="n">{{ n }} 张</option>
          </select>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { ref, computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { IMAGE_GEN_PROVIDERS, CUSTOM_PROVIDER_SLOTS as CUSTOM_IMAGE_GEN_SLOTS, getImageGenProviderById, isCustomImageGenProviderId, getCustomImageGenUrlKey } from '../../services/apiProviders'
import { checkImageGenConnection } from '../../services/connectionCheck'
import { IMAGE_STYLES, IMAGE_SIZES } from '../../services/imageGen'
import ProviderDropdown from './ProviderDropdown.vue'
import ConnectionStatusBadge from './ConnectionStatusBadge.vue'

export default {
  name: 'ImageGenSection',
  components: { ProviderDropdown, ConnectionStatusBadge },
  setup() {
    const settingsStore = useSettingsStore()
    const settings = settingsStore.settings
    const showKey = ref(false)
    const lastError = ref('')

    const activeProvider = computed(() => getImageGenProviderById(settings.imageGenProviderId))
    const activeBaseUrl = computed(() => activeProvider.value?.apiUrl || settings.customImageGenUrl || settings.customImageGenUrl2 || '')
    const isCustom = computed(() => isCustomImageGenProviderId(settings.imageGenProviderId))
    const placeholderUrl = computed(() => activeProvider.value?.apiUrl || 'https://your-ig-api.com/v1')

    // 当前 URL：内置模式显示 provider URL（只读），自定义模式显示对应 custom 槽的 URL（可写）
    const currentImageGenUrl = computed({
      get() {
        if (isCustom.value) {
          return settings.imageGenProviderId === 'custom2'
            ? (settings.customImageGenUrl2 || '')
            : (settings.customImageGenUrl || '')
        }
        return activeProvider.value?.apiUrl || ''
      },
      set(v) {
        if (settings.imageGenProviderId === 'custom2') settings.customImageGenUrl2 = v
        else if (settings.imageGenProviderId === 'custom') settings.customImageGenUrl = v
      }
    })
    function setImageGenUrl(v) { currentImageGenUrl.value = v }

    function selectProvider(id) {
      settingsStore.setImageGenStatus('unknown', 0)
      // 同步 key 和 model
      if (settings.imageGenProviderId && settings.imageGenKey) {
        if (!settings.imageGenProviderKeys || typeof settings.imageGenProviderKeys !== 'object') settings.imageGenProviderKeys = {}
        if (!settings.imageGenProviderModels || typeof settings.imageGenProviderModels !== 'object') settings.imageGenProviderModels = {}
        settings.imageGenProviderKeys[settings.imageGenProviderId] = settings.imageGenKey
        if (settings.imageGenModel) settings.imageGenProviderModels[settings.imageGenProviderId] = settings.imageGenModel
      }
      settings.imageGenProviderId = id
      if (isCustomImageGenProviderId(id)) {
        // 自定义模式 URL 由用户输入到 customImageGenUrl
      } else {
        const p = getImageGenProviderById(id)
        if (p) {
          // 把内置 URL 暂存到 customImageGenUrl 供输入框回显
          if (!settings.customImageGenUrl) settings.customImageGenUrl = p.apiUrl
        }
      }
      settings.imageGenKey = (settings.imageGenProviderKeys && settings.imageGenProviderKeys[id]) || ''
      settings.imageGenModel = (settings.imageGenProviderModels && settings.imageGenProviderModels[id]) || (activeProvider.value?.defaultModel || '')
    }

    async function handleTest() {
      lastError.value = ''
      settingsStore.setImageGenStatus('checking')
      const baseURL = isCustom.value
        ? (settings.imageGenProviderId === 'custom2' ? settings.customImageGenUrl2 : settings.customImageGenUrl)
        : (activeProvider.value?.apiUrl || '')
      const r = await checkImageGenConnection({ baseURL, apiKey: settings.imageGenKey })
      settingsStore.setImageGenStatus(r.status, r.latency)
      if (r.status === 'error') lastError.value = r.error || '检测失败'
    }

    return { settings, showKey, lastError, isCustom, activeBaseUrl, placeholderUrl, currentImageGenUrl, setImageGenUrl, selectProvider, handleTest, IMAGE_GEN_PROVIDERS, CUSTOM_IMAGE_GEN_SLOTS, IMAGE_STYLES, IMAGE_SIZES }
  }
}
</script>
```

- [ ] **Step 2: 验证 import**

```bash
cd rphub-desktop
npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add rphub-desktop/src/components/settings/ImageGenSection.vue
git commit -m "feat(settings): add ImageGenSection with provider + style + size + count"
```

---

### Task 1.10: 装配 `SettingsView.vue`

**Files:**
- Modify: `rphub-desktop/src/views/SettingsView.vue`

- [ ] **Step 1: 在 `<div class="flex-1 overflow-y-auto p-6 space-y-8">` 内，最上面加 3 个新 section**

修改 `rphub-desktop/src/views/SettingsView.vue` 第 22 行 `<div class="flex-1 overflow-y-auto p-6 space-y-8">` 之后，**删除**原「API 配置」section（第 23-114 行），改成：

```vue
    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6 space-y-8">
      <UserProfileSection />
      <ApiConfigSection />
      <ImageGenSection />

      <!-- UI Preferences (保留原内容) -->
      <section class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        ...（保留原 UI 偏好 section 内容不变）...
      </section>

      <!-- Data Management (保留原内容) -->
      <section class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        ...（保留原数据管理 section 内容不变）...
      </section>
    </div>
```

- [ ] **Step 2: 在 `<script>` 中 import 3 个新 section**

修改 `rphub-desktop/src/views/SettingsView.vue` 的 `<script>` 块，**追加** imports（保留原 useSettingsStore/useUIStore/localforage）：

```js
import UserProfileSection from '../components/settings/UserProfileSection.vue'
import ApiConfigSection from '../components/settings/ApiConfigSection.vue'
import ImageGenSection from '../components/settings/ImageGenSection.vue'
```

并在 `export default { ... components: { ... } }` 中（如果存在 components 字段），加 `UserProfileSection, ApiConfigSection, ImageGenSection`；如果当前 SettingsView 没有 components 字段，加：

```js
export default {
  name: 'SettingsView',
  components: { UserProfileSection, ApiConfigSection, ImageGenSection },
  setup() { ... }
}
```

- [ ] **Step 3: 验证**

```bash
cd rphub-desktop
npm run dev
```

打开设置页，确认：
- 「用户人设」section 渲染（带一个默认 profile 头像条 + 编辑区）
- 「API 配置」section 渲染（带提供商下拉 + 测试连接按钮 + 状态徽章）
- 「文生图配置」section 渲染（带风格/尺寸/数量下拉）
- 「界面偏好」和「数据管理」section 仍然正常
- 修改任何设置后点「保存设置」无报错
- 切到其他视图（聊天/角色）再切回设置页，配置仍存在

- [ ] **Step 4: Commit**

```bash
git add rphub-desktop/src/views/SettingsView.vue
git commit -m "feat(settings): assemble all sections into SettingsView"
```

**阶段 1 验证（端到端）**：
```bash
cd rphub-desktop
npm run test:generator   # 旧测试不能破
node scripts/test-settingsServices.mjs  # 全部 PASS
npm run dev              # 手动 UI 验证
```

---

## 阶段 2：用户人设 → 聊天 system prompt

### Task 2.1: `useUserProfile` composable + chat 集成

**Files:**
- Create: `rphub-desktop/src/composables/useUserProfile.js`
- Modify: `rphub-desktop/src/stores/chat.js`

**Interfaces:**
- `useUserProfile()` 返回 `{ activeProfile, switchProfile, setPerson, applyPersonPresets }`
- `chat.js#buildApiMessages` 末尾追加 user info 段

- [ ] **Step 1: 创建 composable**

`rphub-desktop/src/composables/useUserProfile.js`:

```js
// rphub-desktop/src/composables/useUserProfile.js
// 包 settings.userProfiles 为响应式 activeProfile + 动作
import { computed } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { usePresetsStore } from '../stores/presets'
import { useUIStore } from '../stores/ui'
import { applyPersonToggle } from '../services/userProfile'

export function useUserProfile() {
  const settingsStore = useSettingsStore()
  const presetsStore = usePresetsStore()
  const ui = useUIStore()
  const settings = settingsStore.settings

  const activeProfile = computed(() => {
    return settings.userProfiles.find(p => p.uuid === settings.activeProfileId) || null
  })

  function switchProfile(id) {
    settingsStore.setActiveProfile(id)
    ui.addToast(`已切换人设: ${activeProfile.value?.name || ''}`, 'info')
  }

  function setPerson(person) {
    settingsStore.updateActiveProfile({ person })
    presetsStore.presets = applyPersonToggle(presetsStore.presets, person)
    presetsStore.savePresets()
  }

  return { activeProfile, switchProfile, setPerson }
}
```

- [ ] **Step 2: 修改 `chat.js#buildApiMessages` 注入 user info**

修改 `rphub-desktop/src/stores/chat.js` 第 194-224 行 `buildApiMessages` 函数，**在 `messages.push(...)` 循环开始之前**插入 import 和 user info 段：

```js
import { useSettingsStore } from './settings'
import { buildUserInfoPrompt } from '../services/userProfile'
```

（注意：`chat.js` 顶部已经有 `import { ... } from '../api'`，按文件现有 import 风格追加）

修改 `buildApiMessages` 函数，把 `messages` 数组初始化改为：

```js
  function buildApiMessages(character, settings) {
    const systemParts = [
      `Name: ${character.name}`,
      character.personality ? `Personality: ${character.personality}` : '',
      character.description ? `Description: ${character.description}` : '',
      character.mes_example ? `Example conversations:\n${character.mes_example}` : '',
      settings.systemPrompt || ''
    ].filter(Boolean)

    // 注入当前用户人设
    try {
      const settingsStore = useSettingsStore()
      const activeId = settingsStore.settings.activeProfileId
      const profile = settingsStore.settings.userProfiles.find(p => p.uuid === activeId)
      if (profile && (profile.name || profile.description)) {
        systemParts.push(buildUserInfoPrompt(profile))
      }
    } catch (e) {
      // store 不可用时静默
    }

    const systemContent = systemParts.join('\n\n')
    const messages = [{ role: 'system', content: systemContent }]
    ...（保留原 first_mes 处理）...
  }
```

- [ ] **Step 3: 手动验证**

```bash
cd rphub-desktop
npm run dev
```

操作步骤：
1. 打开设置页 → 切到"第二人称"，人设描述填 `我是一个测试用户`
2. 点「保存设置」
3. 切到「聊天」页 → 选一个角色卡 → 发送 `你好`
4. 打开 devtools network 面板，找聊天请求，**确认请求体 system message 末尾有 `[User Info]\nName: 默认人设\nDescription: 我是一个测试用户`**（默认 profile 的名字）
5. 回到设置页 → 改人设描述为 `第二个测试` → 保存 → 再发一条消息 → **确认新 system message 同步更新**

- [ ] **Step 4: Commit**

```bash
git add rphub-desktop/src/composables/useUserProfile.js rphub-desktop/src/stores/chat.js
git commit -m "feat(chat): inject active user profile into system prompt"
```

---

## 阶段 3：文生图接入聊天

### Task 3.1: `useImageGenTrigger` composable + chat 集成 + MessageBubble 渲染

**Files:**
- Create: `rphub-desktop/src/composables/useImageGenTrigger.js`
- Modify: `rphub-desktop/src/stores/chat.js`
- Modify: `rphub-desktop/src/components/chat/MessageBubble.vue`

**Interfaces:**
- `useImageGenTrigger()` 返回 `{ processMessageImages(message, settings) }` — 解析 `<auto_image_gen>` 标签，调用 `imageGen.generateImages`，把图片 push 到 `message.images`

- [ ] **Step 1: 创建 composable**

`rphub-desktop/src/composables/useImageGenTrigger.js`:

```js
// rphub-desktop/src/composables/useImageGenTrigger.js
// 解析 AI 回复中的 <auto_image_gen>...</auto_image_gen> 标签并触发文生图
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { generateImages, sizeToDims, styleToArtists } from '../services/imageGen'
import { resolveActiveImageGenProvider } from '../services/apiProviders'

/**
 * 检测 message.content 是否包含 <auto_image_gen>...</auto_image_gen>
 * 容器内是若干个 @image@...@imageEnd@ 提示词块
 */
function parseAutoImageGen(content) {
  if (!content || !content.includes('<auto_image_gen>')) return null
  const match = content.match(/<auto_image_gen>([\s\S]*?)<\/auto_image_gen>/i)
  if (!match) return null
  const inner = match[1]
  const prompts = []
  const re = /@image@([\s\S]*?)@imageEnd@/g
  let m
  while ((m = re.exec(inner)) !== null) {
    prompts.push(m[1].trim())
  }
  if (!prompts.length) {
    // 容器内没有 @image@ 块：把整段 inner 当作一张图
    prompts.push(inner.trim())
  }
  return { raw: match[0], prompts }
}

export function useImageGenTrigger() {
  const settingsStore = useSettingsStore()
  const ui = useUIStore()

  /**
   * 处理一条消息：检测 <auto_image_gen>，调用 imageGen，把结果写入 message.images
   * @param {object} message - chat message，必须有 .images 字段
   * @param {object} settings - 传入 chat 时的 settings 快照
   * @param {AbortSignal} [signal]
   */
  async function processMessageImages(message, settings, signal) {
    if (!message || !message.content) return
    const parsed = parseAutoImageGen(message.content)
    if (!parsed) return

    const s = settings || settingsStore.settings
    const provider = resolveActiveImageGenProvider(s)
    if (!provider.apiKey) {
      ui.addToast('文生图 API Key 未配置', 'error')
      return
    }
    const n = Math.min(parsed.prompts.length, Math.max(1, Number(s.imageGenCount) || 1))
    const dims = provider.fixedSize || sizeToDims(s.imageSize)
    const artists = styleToArtists(s.imageStyle || 'vertical', s.customImageArtists || '')

    message.images = message.images || []
    message.imageStatus = 'generating'

    try {
      // 串行生成：避免一次性打爆 API
      for (let i = 0; i < n; i++) {
        const prompt = parsed.prompts[i] || parsed.prompts[0]
        const finalPrompt = artists ? `${artists}, ${prompt}` : prompt
        const list = await generateImages({
          baseURL: provider.apiUrl,
          apiKey: provider.apiKey,
          model: provider.model || s.imageGenModel,
          prompt: finalPrompt,
          size: dims,
          n: 1,
          signal
        })
        if (list?.[0]) {
          message.images.push({ url: list[0].url, prompt: finalPrompt, style: s.imageStyle })
        }
      }
      message.imageStatus = 'done'
    } catch (e) {
      message.imageStatus = 'error'
      ui.addToast(`生图失败: ${e.message}`, 'error')
    }
  }

  return { processMessageImages, parseAutoImageGen }
}
```

- [ ] **Step 2: 修改 `chat.js#generateResponse` 在流结束后触发**

修改 `rphub-desktop/src/stores/chat.js` 第 174-191 行（`} catch (err) { ... } finally { ... }` 块）。在 `finally` 块中、`saveChatHistory()` 调用之后，追加生图触发。但要避免生成失败时阻塞。改 `finally` 块为：

```js
    } finally {
      isGenerating.value = false
      isThinking.value = false
      isReceiving.value = false
      abortController.value = null
      saveChatHistory()
      // 触发文生图（不阻塞 UI）
      try {
        const { useImageGenTrigger } = await import('../composables/useImageGenTrigger.js')
        const trigger = useImageGenTrigger()
        await trigger.processMessageImages(assistantMsg, settings)
        saveChatHistory()
      } catch (e) {
        console.warn('ImageGen trigger failed:', e)
      }
    }
```

并在 `sendMessage`（第 50-70 行）创建用户消息时，也加 `images: []` 字段（保持一致）：

```js
    const userMsg = {
      id: generateId(),
      role: 'user',
      name: '我',
      content,
      isSelf: true,
      timestamp: Date.now(),
      images: []
    }
```

同时 `addMessage` helper（如有）默认值加 `images: []`。

- [ ] **Step 3: 在 `MessageBubble.vue` 渲染 images 网格**

修改 `rphub-desktop/src/components/chat/MessageBubble.vue` 第 85 行（`v-html="renderMarkdownFn(...)"` 那个 div）**之后**，追加：

```vue
            <div v-if="message.images && message.images.length" class="mt-2 grid grid-cols-2 gap-2 max-w-md">
              <a v-for="(img, i) in message.images" :key="i" :href="img.url" target="_blank" class="block">
                <img :src="img.url" :alt="img.prompt" class="w-full h-auto rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow" loading="lazy">
              </a>
            </div>
            <div v-else-if="message.imageStatus === 'generating'" class="mt-2 text-xs text-gray-400 inline-flex items-center gap-1">
              <span class="w-3 h-3 border-2 border-primary-300 border-t-primary-500 rounded-full animate-spin"></span>
              正在生成图片…
            </div>
```

- [ ] **Step 4: 手动验证**

```bash
cd rphub-desktop
npm run dev
```

1. 设置页：API 配置填入有效 key（确保能聊天）；文生图配置选 agnes provider + 填入有效 key；点「测试连接」确认 green
2. 设置页：界面偏好 → 上下文大小降低到 4096（避免 token 超限）
3. 切到聊天页 → 选一个角色 → 在 system prompt / 角色卡描述里加指令让 AI 输出 `<auto_image_gen>@image@一位穿白裙的女孩站在樱花树下@imageEnd@</auto_image_gen>`（或者在 user message 里直接说「请按 <auto_image_gen>@image@...@imageEnd@</auto_image_gen> 格式生成 1 张图」）
4. 发送 → 观察消息下方先显示「正在生成图片…」loading，再显示一张/多张图
5. 切到其他角色，再切回来；图片仍存在（因为 images 字段已存到 chat history）

- [ ] **Step 5: Commit**

```bash
git add rphub-desktop/src/composables/useImageGenTrigger.js rphub-desktop/src/stores/chat.js rphub-desktop/src/components/chat/MessageBubble.vue
git commit -m "feat(chat): wire imageGen trigger into chat stream + render images in MessageBubble"
```

---

## 整体验证（最终）

```bash
cd rphub-desktop
npm run test:generator             # 旧测试不能破
node scripts/test-settingsServices.mjs  # 全部 PASS
npm run build                       # 编译无错
npm run dev                         # 手动跑：所有 4 个 section、人设切换、文生图
```

手工 UI 测试 checklist：
- [ ] 设置页 4 个新 section（人设/API/文生图/状态徽章）全部渲染
- [ ] 切换 API provider → URL 自动填入 + Key 切换
- [ ] 测试连接绿/红状态正确（断开网络/填错 key）
- [ ] 多 profile 新建/删除/切换/编辑
- [ ] 切换人称自动联动 presets 中的"第二/第三人称"
- [ ] 文生图：触发 <auto_image_gen> → 消息下方显示图片
- [ ] 保存设置后重启 app，配置不丢失
- [ ] 旧数据迁移：手工在 localforage 里塞旧格式 `apiKey: 'sk-xxx'` → reload → 应迁移到 `apiProviderKeys.agnes`
- [ ] 旧测试 `test-characterGenerator.mjs` 仍然 27/27 PASS
- [ ] 浏览器版网页仍然可以独立打开使用（无回归）
