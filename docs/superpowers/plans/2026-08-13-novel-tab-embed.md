# 小说创作 Tab 嵌入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 主应用侧边栏新增「小说创作」tab,以 iframe 嵌入 `novel/index.html`,并实现 `RPHUB_API_SETTINGS` 协议回复使 novel 页即时获取主应用 API 供应商配置。

**Architecture:** 完全镜像现有「角色卡生成」(generator)模式:侧边栏按钮设置 `currentView = 'novel'`,视图块 `v-if` 渲染加载遮罩 + iframe;`app.js` 新增 novel 状态三件套、`watch(currentView)` 进入刷新分支,并在现有 `message` 监听器中新增 `REQUEST_RPHUB_API_SETTINGS` 回复分支。桌面打包 `copy-web.js` 顶层拷贝列表加入 `novel`。

**Tech Stack:** 原生 JS + Vue 3(Options API,无构建工具)、Node 内置 test runner(仅 desktop 子项目)。

**Spec:** `docs/superpowers/specs/2026-08-13-novel-tab-embed-design.md`

## Global Constraints

- 零构建工具:主仓无 `package.json`/npm,`index.html` 直接浏览器打开;唯一自动化测试是 desktop 的 `npm test`
- UI 语言 zh-CN;tab 文案固定为「小说创作」,加载遮罩文案「加载小说创作中...」
- **不改动** `novel/index.html`
- iframe sandbox 必须与 generator 完全一致:`sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"` + `allow="clipboard-write"`
- 遵循现有 generator 模式,不引入新样式/新依赖
- 每个任务结束必须 `git commit`;提交信息风格参考 `git log`(`docs:`/`feat:`/`style:` 前缀,中文描述)

---

### Task 1: 桌面打包包含 novel/

**Files:**
- Modify: `desktop/copy-web.test.js`(fake source 加 novel 目录 + 断言)
- Modify: `desktop/copy-web.js:8`(TOP_LEVEL_COPY 加 `'novel'`)
- Modify: `desktop/AGENTS.md:9`(copy-web.js 描述补 novel)

**Interfaces:**
- Consumes: 无
- Produces: `copyWeb()` 产物 `dist-stage/novel/index.html`(后续任务不依赖,纯打包一致性)

- [ ] **Step 1: 写失败测试**

`desktop/copy-web.test.js` 中 `makeFakeSource()` 的 `character` 块(第 13-14 行)之后插入:

```js
  fs.mkdirSync(path.join(tmp, 'novel'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'novel', 'index.html'), '<html></html>');
```

第一个测试(第 25-32 行)标题改为 `'copyWeb copies index.html, assets, character, novel to dst'`,并在第 31 行断言后追加:

```js
  assert.ok(fs.existsSync(path.join(dst, 'novel', 'index.html')), 'novel/index.html should exist');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test`(workdir: `desktop/`)
Expected: FAIL,报错 `novel/index.html should exist`(TOP_LEVEL_COPY 尚未包含 novel,fake source 的 novel 目录未被拷贝)

- [ ] **Step 3: 实现最小修改**

`desktop/copy-web.js:8` 改为:

```js
const TOP_LEVEL_COPY = ['index.html', 'assets', 'character', 'novel'];
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test`(workdir: `desktop/`)
Expected: 3 个测试全部 PASS

- [ ] **Step 5: 更新 desktop/AGENTS.md 文档行**

`desktop/AGENTS.md:9` 改为:

```markdown
  - `copy-web.js` — 打包前把 Web 资源（`index.html`、`assets`、`character`、`novel`）拷贝到 `dist-stage/`
```

- [ ] **Step 6: 提交**

```bash
git add desktop/copy-web.js desktop/copy-web.test.js desktop/AGENTS.md
git commit -m "feat: 桌面打包包含 novel/ 页面"
```

---

### Task 2: app.js 新增 novel 视图状态与 API 设置协议回复

**Files:**
- Modify: `assets/js/app.js:1531-1539`(Novel State 三件套)
- Modify: `assets/js/app.js:1551-1561`(watch(currentView) 新增 novel 分支)
- Modify: `assets/js/app.js:838-843`(message 监听器扩展 REQUEST_RPHUB_API_SETTINGS 回复)
- Modify: `assets/js/app.js:10233`(setup return 导出)

**Interfaces:**
- Consumes: `apiProviderOptions`(app.js:105,`{id,name,apiUrl,icon}` 数组)、`settings`(含 `apiProviderKeys`/`apiProviderId`/`customApiUrl`/`customApiUrl2`)、`ref`/`watch`(Vue)
- Produces: `isNovelLoading`(ref<boolean>)、`novelUrl`(ref<string>)、`onNovelLoad`(() => void),供 Task 3 的 index.html 模板使用;`RPHUB_API_SETTINGS` postMessage 回复载荷 `{type, requestId, settings, providers}`(novel 页 `syncRPHubSettings` 消费)

- [ ] **Step 1: 新增 Novel State 三件套**

在 `assets/js/app.js:1531-1539` 的 Generator State 块之后追加:

```js
        // Novel State
        const isNovelLoading = ref(true);
        const novelUrl = ref('./novel/index.html');

        const onNovelLoad = () => {
            isNovelLoading.value = false;
            console.log('%c[Novel] Novel Studio Iframe Loaded', 'color: #10b981; font-weight: bold;');
        };
```

- [ ] **Step 2: watch(currentView) 新增 novel 分支**

在 `assets/js/app.js` 的 `watch(currentView, ...)` 中,`if (newView === 'generator')` 分支结束(约 1556 行 `}`)之后、`else if (newView === 'square')` 之前插入:

```js
            } else if (newView === 'novel') {
                isNovelLoading.value = true;
                novelUrl.value = `./novel/index.html?t=${Date.now()}`;
```

- [ ] **Step 3: message 监听器扩展协议回复**

将 `assets/js/app.js:838-843` 的监听器整体替换为:

```js
        // Listen for workshop ready message to trigger sync
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'WORKSHOP_READY') {
                syncSettingsToGenerator();
            } else if (event.data && event.data.type === 'REQUEST_RPHUB_API_SETTINGS' && event.data.requestId) {
                // Reply to novel/index.html settings request (RPHUB_API_SETTINGS protocol)
                const novelProviders = apiProviderOptions.map((provider) => ({
                    id: provider.id,
                    name: provider.name,
                    apiUrl: provider.apiUrl,
                    icon: provider.icon
                }));
                novelProviders.push({ id: 'custom', name: '自定义', apiUrl: settings.customApiUrl || '' });
                novelProviders.push({ id: 'custom2', name: '自定义 2', apiUrl: settings.customApiUrl2 || '' });
                event.source.postMessage({
                    type: 'RPHUB_API_SETTINGS',
                    requestId: event.data.requestId,
                    settings: JSON.parse(JSON.stringify(settings)),
                    providers: novelProviders
                }, '*');
            }
        });
```

- [ ] **Step 4: setup() return 导出新状态**

`assets/js/app.js:10233` 行后追加:

```js
            isNovelLoading, novelUrl, onNovelLoad, // Novel exports
```

- [ ] **Step 5: 语法检查**

Run: `node --check assets/js/app.js`(workdir: 仓库根)
Expected: 无输出、退出码 0

- [ ] **Step 6: 提交**

```bash
git add assets/js/app.js
git commit -m "feat: 小说创作 tab 状态与 RPHUB_API_SETTINGS 协议回复"
```

---

### Task 3: index.html 侧边栏按钮 + 视图块 + 浏览器端到端验证

**Files:**
- Modify: `index.html:234`(角色卡生成按钮之后插入「小说创作」按钮)
- Modify: `index.html:1538`(Generator View 结束 `</div>` 之后插入 Novel View)

**Interfaces:**
- Consumes: `currentView`/`closeMobileMenu`/`isSidebarCollapsed`/`toggleMobileMenu`(均已导出)、`isNovelLoading`/`novelUrl`/`onNovelLoad`(Task 2 产出)
- Produces: 可用的「小说创作」tab(用户可见入口 + iframe 视图)

- [ ] **Step 1: 插入侧边栏按钮**

在 `index.html:234`(角色卡生成按钮 `</button>`)与第 235 行空行之间插入:

```html
                <button @click="currentView = 'novel'; closeMobileMenu()"
                    title="小说创作"
                    :class="['sidebar-nav-button flex items-center rounded-xl transition-all duration-200 font-medium', currentView === 'novel' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900', isSidebarCollapsed ? 'w-12 h-12 mx-auto justify-center p-0' : 'w-full px-3 py-2.5']">
                    <svg class="w-5 h-5" :class="isSidebarCollapsed ? 'mr-0' : 'mr-3'" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253">
                        </path>
                    </svg>
                    <span v-show="!isSidebarCollapsed" class="whitespace-nowrap overflow-hidden">小说创作</span>
                </button>
```

- [ ] **Step 2: 插入 Novel View 视图块**

在 `index.html:1538`(Generator View 的闭合 `</div>`)与第 1539 行空行之间插入:

```html
            <!-- Novel View -->
            <div v-if="currentView === 'novel'" class="h-full overflow-hidden flex flex-col bg-gray-50 relative">
                <!-- Mobile Floating Menu Button -->
                <button @click="toggleMobileMenu"
                    class="md:hidden absolute left-0 top-1/2 transform -translate-y-1/2 z-20 pl-2 pr-1.5 py-3 bg-white/90 backdrop-blur-md text-gray-600 text-xs font-medium rounded-r-xl shadow-lg border border-l-0 border-gray-200 active:scale-95 transition-all flex flex-col items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    <span class="leading-none">返</span>
                    <span class="leading-none">回</span>
                </button>

                <div class="flex-1 w-full relative bg-white h-full">
                    <!-- Loading Overlay -->
                    <div v-if="isNovelLoading"
                        class="absolute inset-0 z-10 flex items-center justify-center bg-gray-50">
                        <div class="flex flex-col items-center">
                            <svg class="animate-spin h-10 w-10 text-primary-600 mb-4" xmlns="http://www.w3.org/2000/svg"
                                fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            <div class="text-gray-500 font-medium">加载小说创作中...</div>
                        </div>
                    </div>
                    <iframe :src="novelUrl" @load="onNovelLoad" class="absolute inset-0 w-full h-full border-0"
                        allow="clipboard-write"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"></iframe>
                </div>
            </div>
```

- [ ] **Step 3: 结构自检**

Run: `grep -n "currentView === 'novel'" index.html`、`grep -n "小说创作" index.html`(workdir: 仓库根)
Expected: 侧边栏按钮处与视图块处各出现一次 `currentView === 'novel'`;「小说创作」出现 2 次(按钮 title + span);`novelUrl`/`onNovelLoad`/`isNovelLoading` 各在视图块出现且与 Task 2 导出名一致

- [ ] **Step 4: 浏览器端到端验证**

打开 `index.html`(本地文件或任意静态服务器,直接双击即可),按序验证:

1. 侧边栏出现「小说创作」按钮(书本图标),位于「角色卡生成」之下;active 高亮正常
2. 点击后:先出现「加载小说创作中...」遮罩 → iframe 加载完成 → 遮罩消失,novel 页渲染
3. DevTools Console:出现 `[Novel] Novel Studio Iframe Loaded`;无 `REQUEST_RPHUB_API_SETTINGS` 超时/`设置响应超时` 报错
4. novel 页内 API 设置:打开其设置面板,供应商列表包含主应用已配置的供应商(证明协议回复生效,未走 2 秒 IndexedDB 回退)
5. 折叠侧边栏(仅图标 + title 提示)、移动端宽度下浮动「返回」按钮可用
6. 离开再进入 novel tab:遮罩重现(时间戳强制刷新,与 generator 行为一致)
7. 回归:点击「角色卡生成」tab 仍正常(加载遮罩、iframe、设置同步不受影响)

Expected: 全部通过;若 Console 出现超时错误或供应商列表为空,回到 Task 2 Step 3 检查监听器与载荷字段

- [ ] **Step 5: 提交**

```bash
git add index.html
git commit -m "feat: 侧边栏新增小说创作 tab 嵌入 novel 页面"
```

---

## Self-Review

**Spec 覆盖:** spec 的四点范围全部落实 — Task 1(桌面打包)、Task 2(app.js 状态/watch/协议回复/导出)、Task 3(index.html 按钮+视图块+端到端验证);「不改动 novel/index.html」在 Global Constraints 声明;错误处理(协议仅响应带 requestId 的消息、novel 回退路径保留)体现在 Task 2 代码与 Task 3 验证步骤 4/7。

**占位符扫描:** 无 TBD/TODO;所有代码步骤含完整代码块。

**类型一致性:** `isNovelLoading`/`novelUrl`/`onNovelLoad` 三处命名一致(Task 2 定义与导出、Task 3 模板使用);协议字段 `type`/`requestId`/`settings`/`providers` 与 novel 页 `syncRPHubSettings`(novel/index.html:1846-1883)期望结构一致。
