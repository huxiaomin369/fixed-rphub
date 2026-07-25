// rphub-desktop/character/diff-modal.js
// Workshop-local: DOM rendering of the AI assistant modal.
// Manages: open/close, prompt input, streaming display, per-field apply/reject.

import { runDiffGeneration, applyDiff, parseDiffBlocks, fieldLabel } from './ai-assistant.js'

let modal = null
let abortController = null
let currentCharacter = null
let settings = null

function ensureModal() {
  if (modal) return modal
  modal = document.createElement('div')
  modal.id = 'ai-assistant-modal'
  modal.className = 'ai-modal-backdrop'
  modal.style.display = 'none'
  modal.innerHTML = `
    <div class="ai-modal-content">
      <div class="ai-modal-header">
        <h2>AI 助手 · 修改此角色</h2>
        <button class="ai-modal-close" aria-label="关闭">×</button>
      </div>
      <div class="ai-modal-body">
        <details class="ai-current-values" open>
          <summary>当前字段</summary>
          <div class="ai-current-fields"></div>
        </details>
        <label class="ai-prompt-label">你的修改要求</label>
        <textarea class="ai-prompt-input" rows="3"
          placeholder="例如: 把性格改得更傲娇一点, 加点口是心非"></textarea>
        <div class="ai-progress"></div>
        <div class="ai-actions">
          <button class="ai-btn ai-btn-primary ai-btn-send">开始修改</button>
          <button class="ai-btn ai-btn-secondary ai-btn-stop" style="display:none">停止</button>
        </div>
        <div class="ai-diff-list"></div>
      </div>
    </div>
  `
  document.body.appendChild(modal)

  modal.querySelector('.ai-modal-close').addEventListener('click', close)
  modal.querySelector('.ai-btn-send').addEventListener('click', onSendClicked)
  modal.querySelector('.ai-btn-stop').addEventListener('click', stopGeneration)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close()
  })

  return modal
}

function renderCurrentValues(character) {
  const container = modal.querySelector('.ai-current-fields')
  const fields = ['name', 'description', 'personality', 'first_mes', 'creator_notes']
  container.innerHTML = fields
    .filter(f => character[f])
    .map(f => `
      <div class="ai-current-field">
        <span class="ai-current-label">${fieldLabel(f)}:</span>
        <span class="ai-current-text">${escapeHtml(truncate(character[f], 200))}</span>
      </div>
    `).join('') || '<p class="text-gray-400 text-sm">无字段</p>'
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

function renderDiffs(blocks, character) {
  // blocks: the full current set of diffs from the stream
  // We render all of them; the apply/reject buttons mutate `character` and
  // remove their card from the DOM. Future re-renders (from streaming
  // completion) only re-render the remaining unhandled blocks.
  const list = modal.querySelector('.ai-diff-list')
  list.innerHTML = blocks.map((b, i) => `
    <div class="ai-diff-card" data-idx="${i}">
      <div class="ai-diff-header">${fieldLabel(b.field)}</div>
      <div class="ai-diff-old"><span class="ai-diff-label">旧</span><pre>${escapeHtml(b.find)}</pre></div>
      <div class="ai-diff-new"><span class="ai-diff-label">新</span><pre>${escapeHtml(b.replace)}</pre></div>
      <div class="ai-diff-actions">
        <button class="ai-btn ai-btn-sm ai-btn-apply" data-idx="${i}">✓ 应用</button>
        <button class="ai-btn ai-btn-sm ai-btn-reject" data-idx="${i}">✗ 放弃</button>
      </div>
    </div>
  `).join('')
  // Bind buttons
  list.querySelectorAll('.ai-btn-apply').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.idx
      const block = blocks[idx]
      if (block && applyDiff(character, block)) {
        showToast('已应用 ' + fieldLabel(block.field), 'success')
        document.dispatchEvent(new CustomEvent('ai-assistant:apply', { detail: block }))
      }
      // Remove just this card (don't re-render the whole list to avoid
      // clobbering in-progress apply/reject clicks on later blocks)
      btn.closest('.ai-diff-card')?.remove()
    })
  })
  list.querySelectorAll('.ai-btn-reject').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.ai-diff-card')?.remove()
    })
  })
}

function onSendClicked() {
  if (!currentCharacter || !settings) return
  const promptText = modal.querySelector('.ai-prompt-input').value.trim()
  if (!promptText) {
    modal.querySelector('.ai-prompt-input').focus()
    return
  }
  // Clear previous results
  modal.querySelector('.ai-diff-list').innerHTML = ''
  modal.querySelector('.ai-progress').innerHTML = ''
  abortController = new AbortController()
  modal.querySelector('.ai-btn-send').style.display = 'none'
  modal.querySelector('.ai-btn-stop').style.display = ''
  const progressEl = modal.querySelector('.ai-progress')

  // Track blocks in a closure-scoped array (the plan's earlier version used
  // a window global; this avoids the "stale data on second generation" bug
  // where the global was only reset in open() but not in startGeneration()).
  const blocks = []

  runDiffGeneration({
    character: currentCharacter,
    userPrompt: promptText,
    baseURL: settings.apiUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    signal: abortController.signal,
    onProgress: ({ status, percent }) => {
      progressEl.innerHTML = `<div class="ai-progress-text">${escapeHtml(status)}</div>
        <div class="ai-progress-bar"><div class="ai-progress-fill" style="width:${percent}%"></div></div>`
    },
    onBlock: (block) => {
      // De-dupe by field+find (the upstream already does this, but belt + suspenders)
      const key = `${block.field}::${block.find}`
      if (blocks.some(b => `${b.field}::${b.find}` === key)) return
      blocks.push(block)
      // Re-render the whole list — blocks array is the source of truth
      renderDiffs(blocks, currentCharacter)
    },
    onDone: ({ diffs }) => {
      modal.querySelector('.ai-btn-send').style.display = ''
      modal.querySelector('.ai-btn-stop').style.display = 'none'
      modal.querySelector('.ai-progress').innerHTML = ''
      if (diffs.length === 0) {
        showToast('AI 没有产生改动, 请换个说法', 'info')
      } else {
        showToast(`已生成 ${diffs.length} 个改动, 请逐个应用或放弃`, 'success')
      }
    },
    onError: (err) => {
      modal.querySelector('.ai-btn-send').style.display = ''
      modal.querySelector('.ai-btn-stop').style.display = 'none'
      modal.querySelector('.ai-progress').innerHTML = `<div class="text-red-500 text-sm">错误: ${escapeHtml(err.message)}</div>`
      showToast('生成失败: ' + err.message, 'error')
    }
  })
}

function stopGeneration() {
  abortController?.abort()
  modal.querySelector('.ai-btn-send').style.display = ''
  modal.querySelector('.ai-btn-stop').style.display = 'none'
}

function showToast(message, type) {
  // Delegate to the workshop's existing toast system if available
  if (window.__workshopToast) { window.__workshopToast(message, type); return }
  // Fallback: minimal inline toast
  const t = document.createElement('div')
  t.className = 'ai-toast ai-toast-' + type
  t.textContent = message
  t.style.cssText = 'position:fixed;top:1rem;right:1rem;padding:0.75rem 1rem;border-radius:0.5rem;background:white;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:99999;font-size:0.875rem;'
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 3000)
}

export function open(character) {
  ensureModal()
  currentCharacter = character
  // Fetch settings from main process
  if (window.workshopAPI?.requestSettings) {
    window.workshopAPI.requestSettings().then(s => { settings = s })
  }
  modal.querySelector('.ai-prompt-input').value = ''
  modal.querySelector('.ai-diff-list').innerHTML = ''
  modal.querySelector('.ai-progress').innerHTML = ''
  renderCurrentValues(character)
  modal.style.display = 'flex'
}

export function close() {
  if (!modal) return
  stopGeneration()
  modal.style.display = 'none'
}
