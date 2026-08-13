# 小说创作 Tab 嵌入设计

- **日期**: 2026-08-13
- **状态**: 已批准(方案 A)
- **关联**: `novel/index.html`(AI 小说灵感页,自包含 Vue 应用)

## 背景与目标

主应用 `index.html` 已有成熟的 iframe tab 模式:侧边栏按钮设置 `currentView`,对应 `v-if` 视图块内嵌 iframe(如「角色卡生成」→ `character/index.html`、「广场」→ 外部 URL)。

`novel/index.html` 已存在且**已内置**向父页面请求 API 供应商配置的 postMessage 协议(`REQUEST_RPHUB_API_SETTINGS`,带 `requestId`,2 秒超时后回退同源 IndexedDB 读取)。但主应用 `app.js` 尚未实现该协议的回复,当前嵌入会走 2 秒超时回退路径。

**目标**: 侧边栏新增「小说创作」tab,以 iframe 嵌入 `novel/index.html`,并实现 API 设置同步协议回复,让 novel 页即时获取主应用的 API 供应商配置。

## 范围

- `index.html`: 侧边栏按钮 + 小说创作视图块
- `assets/js/app.js`: 视图状态、`watch` 刷新、同步协议回复、导出
- `desktop/copy-web.js` + `desktop/copy-web.test.js`: 桌面打包包含 `novel/`
- **不改动** `novel/index.html`

## 架构

完全镜像现有「角色卡生成」(generator)模式:

1. **侧边栏按钮**(`index.html:234` 角色卡生成按钮之后):「小说创作」→ `currentView = 'novel'`,书本 SVG 图标,active/折叠态样式仿照现有按钮。
2. **视图块**(`index.html:1538` generator 视图之后):`v-if="currentView === 'novel'"`:
   - 移动端浮动返回按钮(`toggleMobileMenu`)
   - `isNovelLoading` 加载遮罩(文案「加载小说创作中...」)
   - iframe `:src="novelUrl"`、`@load="onNovelLoad"`,sandbox 与 generator 一致(`allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads`)、`allow="clipboard-write"`
3. **app.js**:
   - 新增状态:`isNovelLoading = ref(true)`、`novelUrl = ref('./novel/index.html')`、`onNovelLoad`(置 `isNovelLoading = false`,不调用 `syncSettingsToGenerator`)
   - `watch(currentView)` 新增 `newView === 'novel'` 分支:`isNovelLoading = true` + `novelUrl = ./novel/index.html?t=${Date.now()}`(与 generator 同构,进入时强制刷新)
   - `setup()` return 导出新状态

## 数据流(API 设置同步)

1. 用户点击「小说创作」→ `currentView = 'novel'`
2. `watch(currentView)` → 遮罩显示,iframe 以带时间戳 URL 重新加载
3. iframe `load` → `onNovelLoad` → 遮罩隐藏
4. novel 页启动后 `window.parent.postMessage({ type: 'REQUEST_RPHUB_API_SETTINGS', requestId }, '*')`
5. 主应用 `window.addEventListener('message')`(`app.js:839` 现有监听器处扩展)匹配 `type === 'REQUEST_RPHUB_API_SETTINGS'` → 用 `event.source.postMessage({ type: 'RPHUB_API_SETTINGS', requestId, settings, providers }, '*')` 回复
6. novel 页 `syncRPHubSettings` 收到后应用供应商配置,无需 2 秒回退

**回复载荷构造**:

- `requestId`: 原样回传
- `settings`: `JSON.parse(JSON.stringify(settings))`(主应用 settings,含 `apiProviderKeys`、`apiProviderId`、`customApiUrl`、`customApiUrl2`)
- `providers`: 主应用 `apiProviderOptions`(`app.js:105`,`{id,name,apiUrl,icon}`)映射 + `custom`/`custom2`(apiUrl 取自 `settings.customApiUrl`/`settings.customApiUrl2`),与 novel 页 `syncRPHubSettings` 期望的 `syncData.providers` 结构一致

## 错误处理

- 协议回复仅针对 `REQUEST_RPHUB_API_SETTINGS` 且携带 `requestId` 的消息;`event.source.postMessage` 天然定向回复,不广播
- novel 页保留 IndexedDB 回退:即使协议失败,嵌入场景下同源可读 `RPHubDB`,功能不中断(仅多 2 秒延迟)
- iframe 加载失败时遮罩持续显示(与 generator 行为一致,不新增特殊处理)

## 测试与验证

1. `node --check assets/js/app.js` 语法检查
2. `node --test desktop/` 跑桌面打包测试(更新断言后)
3. 浏览器手动验证:
   - 侧边栏「小说创作」入口(展开/折叠态)、active 高亮
   - 点击后遮罩 → iframe 加载 → 遮罩消失
   - novel 页 API 设置即时同步(无 2 秒延迟;DevTools Console 无 `REQUEST_RPHUB_API_SETTINGS` 超时痕迹)
   - 移动端浮动返回按钮正常
   - 独立打开 `novel/index.html`(非嵌入)仍可用(回退路径不受影响)

## 非目标

- 不改动 novel 页任何 UI/功能
- 不做 novel 数据与主应用的双向同步(超出本需求)
