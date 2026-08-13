# 续写完成自动生成 AI 灵感 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每次续写整批全部完成后自动静默生成 AI 灵感,灵感按钮点亮红点,用户打开弹窗即可查看;不打断写作。

**Architecture:** 单文件(`novel/index.html`)5 处小改:`generateInspirations` 增加 `silent` 参数分流(守卫/成功/失败)、`startGeneration` 批次结束分支触发 `generateInspirations(true)`、新增 `hasNewInspiration` 红点状态、灵感按钮红点 span 与打开清除、setup 返回导出。

**Tech Stack:** 原生 JS + Vue 3 Options API(内联脚本,零构建工具)。

**Spec:** `docs/superpowers/specs/2026-08-13-auto-inspiration-design.md`

## Global Constraints

- 零构建工具;只允许修改 `novel/index.html`,其余文件一律不动
- 手动点击「生成灵感」的现有行为(toast 引导、打开设置)完全不变
- 自动(silent)路径:任何守卫不满足 → 静默 return(不 toast、不 openSettings);成功 → 仅亮红点;失败 → 仅 console.error
- 触发点必须是整批续写全部成功完成后的 else 分支(2482-2486);中断/报错路径(2488-2497)不触发;`regenerateChapter` 不触发
- 提交信息:`feat:` 前缀 + 中文描述

---

### Task 1: 续写完成自动静默生成灵感 + 红点提示

**Files:**
- Modify: `novel/index.html`(5 处:2093 签名+守卫、2213-2224 成功/失败分流、2485 触发、1124 状态、680 红点、2521 导出)

**Interfaces:**
- Consumes: `isGeneratingInspiration`/`inspirations`/`settings`/`chapters`/`showToast`/`openSettings`(均已在 setup() 闭包内)、`showInspirationModal`(已导出)
- Produces: `hasNewInspiration`(ref<boolean>,导出供模板使用);`generateInspirations(silent = false)`(静默模式语义,手动路径行为不变)

- [ ] **Step 1: 签名 + 守卫分流**

`novel/index.html:2093` 起,将:

```js
                const generateInspirations = async () => {
                    if (!settings.value.apiUrl || !settings.value.apiKey) {
                        showToast('请先同步并选择已配置的 api 供应商', 'error');
                        openSettings();
                        return;
                    }
                    if (!settings.value.model) {
                        showToast('请先选择正文生成模型', 'error');
                        openSettings();
                        return;
                    }
                    if (chapters.value.length === 0) {
                        showToast('请先写点内容再来获取灵感吧', 'error');
                        return;
                    }
                    if (isGeneratingInspiration.value) return;
```

替换为:

```js
                const generateInspirations = async (silent = false) => {
                    if (!settings.value.apiUrl || !settings.value.apiKey) {
                        if (!silent) {
                            showToast('请先同步并选择已配置的 api 供应商', 'error');
                            openSettings();
                        }
                        return;
                    }
                    if (!settings.value.model) {
                        if (!silent) {
                            showToast('请先选择正文生成模型', 'error');
                            openSettings();
                        }
                        return;
                    }
                    if (chapters.value.length === 0) {
                        if (!silent) showToast('请先写点内容再来获取灵感吧', 'error');
                        return;
                    }
                    if (isGeneratingInspiration.value) return;
```

- [ ] **Step 2: 成功/失败分流**

`novel/index.html:2213-2224`,将:

```js
                        if (inspirationList.length) {
                            inspirations.value = inspirationList;
                            showToast(`已生成 ${inspirationList.length} 条剧情走向`, 'success');
                        } else {
                            throw new Error('AI 返回内容无法解析');
                        }
                    } catch (e) {
                        console.error('生成灵感失败:', e);
                        showToast('生成灵感失败: ' + (e.message || '未知错误'), 'error');
                    } finally {
```

替换为:

```js
                        if (inspirationList.length) {
                            inspirations.value = inspirationList;
                            if (silent) {
                                hasNewInspiration.value = true;
                            } else {
                                showToast(`已生成 ${inspirationList.length} 条剧情走向`, 'success');
                            }
                        } else {
                            throw new Error('AI 返回内容无法解析');
                        }
                    } catch (e) {
                        console.error('生成灵感失败:', e);
                        if (!silent) showToast('生成灵感失败: ' + (e.message || '未知错误'), 'error');
                    } finally {
```

- [ ] **Step 3: 新增红点状态**

`novel/index.html:1124` 之后追加:

```js
                const hasNewInspiration = ref(false);
```

- [ ] **Step 4: 批次结束触发**

`novel/index.html:2482-2486`,将:

```js
                            if (count > 0 && isGenerating.value) {
                                setTimeout(generateLoop, 1000);
                            } else {
                                isGenerating.value = false;
                            }
```

替换为:

```js
                            if (count > 0 && isGenerating.value) {
                                setTimeout(generateLoop, 1000);
                            } else {
                                isGenerating.value = false;
                                // 整批续写全部完成: 自动静默生成后续剧情灵感
                                generateInspirations(true);
                            }
```

- [ ] **Step 5: 红点 UI + 打开清除**

`novel/index.html:680`,将:

```html
        <button @click="showInspirationModal = true" class="fixed top-20 right-4 md:right-8 w-12 h-12 bg-stone-800 text-white shadow-xl rounded-full flex items-center justify-center z-30 hover:scale-105 transition-transform duration-300 group" title="AI 灵感">
```

替换为:

```html
        <button @click="showInspirationModal = true; hasNewInspiration = false" class="fixed top-20 right-4 md:right-8 w-12 h-12 bg-stone-800 text-white shadow-xl rounded-full flex items-center justify-center z-30 hover:scale-105 transition-transform duration-300 group" title="AI 灵感">
            <span v-if="hasNewInspiration" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
```

- [ ] **Step 6: 导出**

`novel/index.html:2521`,将:

```js
                    showInspirationModal, isGeneratingInspiration, inspirations, generateInspirations, useInspiration,
```

替换为:

```js
                    showInspirationModal, isGeneratingInspiration, inspirations, hasNewInspiration, generateInspirations, useInspiration,
```

- [ ] **Step 7: 语法检查**

Run(workdir 仓库根):

```bash
node -e '
const fs = require("fs");
const html = fs.readFileSync("novel/index.html", "utf8");
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
let m, idx = 0, bad = 0;
while ((m = re.exec(html)) !== null) {
  idx++;
  try { new Function(m[1]); console.log("script #" + idx + " OK"); }
  catch (e) { bad++; console.log("script #" + idx + " SYNTAX ERROR: " + e.message); }
}
process.exit(bad ? 1 : 0);
'
```

Expected: `script #1 OK`,退出码 0

- [ ] **Step 8: git diff 自检 + 提交**

`git diff` 确认恰好 5 处修改(签名守卫、成功失败分流、状态、触发、红点+导出),无其他改动;然后:

```bash
git add novel/index.html
git commit -m "feat: 续写完成后自动静默生成灵感并红点提示"
```

- [ ] **Step 9: 浏览器手动验证清单(人类执行,写入报告)**

1. 单章续写完成 → 无 toast 打扰 → 灵感按钮出现红点 → 点开弹窗:5 条走向就绪、红点消失
2. 多章连写(≥2 章)→ 每章完成时无红点,最后一章完成后才出现
3. 点「停止生成」中断 → 无红点、无灵感请求(Console 无 `=== 发送给 AI 的内容 ===` 之外的灵感请求痕迹)
4. 未配置 API/模型时续写 → 续写本身按现有逻辑提示,无灵感触发
5. 手动点「生成灵感」→ 行为与修复后一致(toast 提示)

## Self-Review

**Spec 覆盖:** 触发时机(整批完成 else 分支,Step 4)、静默分流(Step 1/2)、红点状态与 UI(Step 3/5)、打开清除(Step 5)、导出(Step 6)、不打扰写作(Step 1/2 的 silent 分支)全部落实;中断/报错/regenerateChapter 不触发由 Step 4 锚点(仅 else 分支)保证。

**占位符扫描:** 无 TBD/TODO;每步含完整代码。

**类型一致性:** `hasNewInspiration` 在 Step 3 定义、Step 2/5 使用、Step 6 导出,命名一致;`generateInspirations(silent = false)` 签名与 Step 4 调用 `generateInspirations(true)` 匹配;模板绑定名与导出名一致。
