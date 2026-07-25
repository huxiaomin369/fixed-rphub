<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <!-- API key warning banner -->
    <div v-if="!settings.apiKey" class="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-2 text-amber-800 text-sm flex-shrink-0">
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>
      <span>未配置 API Key, 请先到 <a href="#" @click.prevent="ui.currentView = 'settings'" class="underline font-medium">设置</a> 配置 API Key 和模型</span>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <div>
        <h2 class="text-lg font-bold text-gray-800">角色卡生成</h2>
        <p class="text-xs text-gray-400 mt-0.5">AI 生成或手动创建, 完成后保存到角色库</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="handleExportCard" :disabled="!sections.name?.trim()"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-sm font-medium disabled:opacity-50">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          导出角色卡
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <div class="max-w-3xl mx-auto space-y-6">
        <!-- AI input + progress -->
        <section class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30">
            <h3 class="font-bold text-gray-800 flex items-center gap-2">
              <svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              AI 生成
            </h3>
          </div>
          <div class="px-6 py-5">
            <GeneratorInputPanel :is-generating="isGenerating"
              @send="onSend" @stop="onStop" />
            <GenerationProgress :status="status" :progress="progress" :is-generating="isGenerating" />
            <p v-if="error" class="text-xs text-red-600 mt-2">{{ error.message }}</p>
          </div>
        </section>

        <!-- Basic Info -->
        <section class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30">
            <h3 class="font-bold text-gray-800">基本信息</h3>
          </div>
          <div class="px-6 py-5 space-y-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">角色名称</label>
              <input v-model="sections.name" type="text" placeholder="输入角色名称"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">角色描述</label>
              <textarea v-model="sections.description" rows="4" placeholder="描述角色的背景、性格、外貌等..."
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm resize-none"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">性格特征</label>
              <textarea v-model="sections.personality" rows="3" placeholder="描述角色性格特点..."
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm resize-none"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">开场白</label>
              <textarea v-model="sections.first_mes" rows="3" placeholder="角色的第一句话..."
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm resize-none"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">作者备注</label>
              <input v-model="sections.creator_notes" type="text" placeholder="可选"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
            </div>
          </div>
        </section>

        <!-- World Info (collapsible) -->
        <section v-if="sections.worldInfo?.length" class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <button @click="showWorldInfo = !showWorldInfo"
            class="w-full px-6 py-4 border-b border-gray-100/80 bg-gray-50/30 flex items-center justify-between">
            <h3 class="font-bold text-gray-800">世界书 ({{ sections.worldInfo.length }} 条)</h3>
            <svg class="w-4 h-4 text-gray-500 transition-transform" :class="showWorldInfo ? 'rotate-180' : ''"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          <div v-if="showWorldInfo" class="px-6 py-5 space-y-3">
            <div v-for="(entry, i) in sections.worldInfo" :key="i" class="p-3 bg-gray-50 rounded-xl">
              <p class="text-sm font-medium text-gray-700">{{ entry.comment || '未命名条目' }}</p>
              <p class="text-xs text-gray-400 mt-0.5">关键字: {{ entry.keys?.join(', ') || '无' }}</p>
              <p class="text-xs text-gray-500 mt-1.5 whitespace-pre-wrap line-clamp-3">{{ entry.content }}</p>
            </div>
          </div>
        </section>

        <!-- Regex Scripts (collapsible) -->
        <section v-if="sections.regexScripts?.length" class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <button @click="showRegex = !showRegex"
            class="w-full px-6 py-4 border-b border-gray-100/80 bg-gray-50/30 flex items-center justify-between">
            <h3 class="font-bold text-gray-800">正则脚本 ({{ sections.regexScripts.length }} 条)</h3>
            <svg class="w-4 h-4 text-gray-500 transition-transform" :class="showRegex ? 'rotate-180' : ''"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          <div v-if="showRegex" class="px-6 py-5 space-y-2">
            <div v-for="(script, i) in sections.regexScripts" :key="i" class="p-3 bg-gray-50 rounded-xl">
              <p class="text-sm font-medium text-gray-700">{{ script.name || '未命名脚本' }}</p>
              <p class="text-xs text-gray-400 font-mono mt-0.5">/{{ script.regex }}/{{ script.flags }}</p>
            </div>
          </div>
        </section>

        <!-- Avatar -->
        <section class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30">
            <h3 class="font-bold text-gray-800">头像</h3>
          </div>
          <div class="px-6 py-5">
            <div class="flex items-start gap-6">
              <div class="flex-shrink-0">
                <div v-if="avatarPreview" class="w-28 h-28 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                  <img :src="avatarPreview" class="w-full h-full object-cover">
                </div>
                <div v-else class="w-28 h-28 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center">
                  <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
              </div>
              <div class="flex-1 space-y-3">
                <button @click="triggerAvatarUpload"
                  class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200/80 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm text-sm font-medium">
                  上传头像
                </button>
                <button @click="handleGenerateAvatar" :disabled="isGeneratingAvatar"
                  class="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl hover:from-primary-600 hover:to-purple-600 transition-all shadow-sm text-sm font-medium disabled:opacity-50">
                  {{ isGeneratingAvatar ? '生成中...' : 'AI 生成头像' }}
                </button>
                <p v-if="sections.avatar_prompt" class="text-xs text-gray-500">
                  <span class="inline-block mr-1 px-1.5 py-0.5 text-[10px] bg-primary-50 text-primary-700 rounded font-bold">AI 提示词</span>
                  {{ sections.avatar_prompt.length > 80 ? sections.avatar_prompt.slice(0, 80) + '…' : sections.avatar_prompt }}
                </p>
                <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
              </div>
            </div>
          </div>
        </section>

        <!-- Preview -->
        <section class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30">
            <h3 class="font-bold text-gray-800">卡片预览</h3>
          </div>
          <div class="px-6 py-5">
            <div v-if="!sections.name?.trim()" class="text-center py-6 text-gray-400">
              <p>输入角色名称后查看预览</p>
            </div>
            <div v-else class="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div class="w-16 h-16 rounded-2xl overflow-hidden border border-gray-200 flex-shrink-0 bg-white shadow-sm">
                <img v-if="avatarPreview" :src="avatarPreview" class="w-full h-full object-cover">
                <div v-else class="w-full h-full bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center text-primary-500 font-bold text-xl">
                  {{ (sections.name || '?').charAt(0) }}
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <div class="font-bold text-gray-800 truncate">{{ sections.name }}</div>
                <div class="text-xs text-gray-500 mt-0.5 line-clamp-2">{{ sections.description || '暂无描述' }}</div>
              </div>
              <div class="text-xs text-gray-400 flex-shrink-0">
                <div>V2 格式</div>
                <div class="mt-1">{{ estimateCardSize() }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Footer save -->
    <div class="border-t border-gray-200/80 px-6 py-3 bg-white/70 backdrop-blur-sm flex items-center justify-end gap-2 flex-shrink-0">
      <button @click="handleSave" :disabled="!sections.name?.trim()"
        class="inline-flex items-center gap-1.5 px-5 py-2 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-sm font-medium disabled:opacity-50">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        保存到角色库
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useCharacterStore } from '../stores/characters'
import { useUIStore } from '../stores/ui'
import { useGenerator } from '../composables/useGenerator'
import GeneratorInputPanel from '../components/generator/GeneratorInputPanel.vue'
import GenerationProgress from '../components/generator/GenerationProgress.vue'
import cardUtils from '../utils/card-utils.js'
import { generateUUID } from '../utils/utils.js'

export default {
  name: 'GeneratorView',
  components: { GeneratorInputPanel, GenerationProgress },
  setup() {
    const settingsStore = useSettingsStore()
    const characterStore = useCharacterStore()
    const ui = useUIStore()
    const settings = settingsStore.settings
    const { isGenerating, status, progress, error, sections, generate, stop, reset } = useGenerator()

    const showWorldInfo = ref(true)
    const showRegex = ref(true)
    const avatarPreview = ref(null)
    const avatarDataUrl = ref(null)
    const fileInput = ref(null)
    const isGeneratingAvatar = ref(false)

    async function onSend(prompt) {
      await generate(prompt)
    }
    function onStop() { stop() }

    function triggerAvatarUpload() { fileInput.value?.click() }
    function handleAvatarUpload(e) {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        avatarDataUrl.value = ev.target.result
        avatarPreview.value = ev.target.result
      }
      reader.readAsDataURL(file)
    }
    async function handleGenerateAvatar() {
      if (!sections.value.name?.trim()) { ui.addToast('请先输入角色名称', 'warning'); return }
      isGeneratingAvatar.value = true
      try {
        // Prefer the AI-generated avatar prompt if the LLM provided one; fall
        // back to a hand-built prompt that summarizes the character fields.
        const avatarPromptText = sections.value.avatar_prompt
          || `Anime portrait of a character named ${sections.value.name}, ${sections.value.description || ''}, ${sections.value.personality || ''}, anime style, high quality, facial close-up`
        const imageGenKey = settings.imageGenKey
        if (imageGenKey && settings.imageGenProviderId) {
          const apiUrl = settings.customImageGenUrl || 'https://apihub.agnes-ai.com/v1'
          const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/images/generations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${imageGenKey}` },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: avatarPromptText,
              n: 1, size: '1024x1024'
            })
          })
          if (response.ok) {
            const data = await response.json()
            const imageUrl = data.data?.[0]?.url
            if (imageUrl) {
              avatarPreview.value = imageUrl
              avatarDataUrl.value = imageUrl
              ui.addToast('头像生成成功', 'success')
              return
            }
          }
        }
        // Fallback: initials
        const canvas = document.createElement('canvas')
        canvas.width = 512; canvas.height = 512
        const ctx = canvas.getContext('2d')
        const gradient = ctx.createLinearGradient(0, 0, 512, 512)
        gradient.addColorStop(0, '#6366f1'); gradient.addColorStop(1, '#8b5cf6')
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 512)
        ctx.fillStyle = 'white'; ctx.font = 'bold 180px Arial'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText((sections.value.name || '?').charAt(0).toUpperCase(), 256, 256)
        avatarDataUrl.value = canvas.toDataURL('image/png')
        avatarPreview.value = canvas.toDataURL('image/png')
        ui.addToast('已生成默认头像', 'info')
      } catch (err) {
        console.error('Avatar generation error:', err)
        ui.addToast('头像生成失败: ' + err.message, 'error')
      } finally {
        isGeneratingAvatar.value = false
      }
    }

    function estimateCardSize() {
      const json = JSON.stringify(buildCardData())
      const bytes = new TextEncoder().encode(json).length
      if (bytes < 1024) return bytes + ' B'
      return (bytes / 1024).toFixed(1) + ' KB'
    }
    function buildCardData() {
      return {
        name: sections.value.name,
        description: sections.value.description,
        personality: sections.value.personality,
        first_mes: sections.value.first_mes,
        creator_notes: sections.value.creator_notes || 'Generated by RP Hub',
        worldInfo: sections.value.worldInfo || [],
        regexScripts: sections.value.regexScripts || [],
        extensions: {},
        character_book: undefined
      }
    }

    async function handleSave() {
      const char = {
        id: generateUUID(),
        name: sections.value.name,
        description: sections.value.description,
        personality: sections.value.personality,
        first_mes: sections.value.first_mes,
        creator_notes: sections.value.creator_notes || 'Generated by RP Hub',
        worldInfo: sections.value.worldInfo || [],
        regexScripts: sections.value.regexScripts || [],
        avatar: avatarDataUrl.value,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      characterStore.addCharacter(char)
      await characterStore.saveCharacters()
      ui.addToast(`角色卡「${char.name}」已保存`, 'success')
      ui.promptOpenWorkshop(char)
    }

    async function handleExportCard() {
      if (!sections.value.name?.trim()) { ui.addToast('请输入角色名称', 'warning'); return }
      try {
        const characterData = buildCardData()
        const v2Data = cardUtils.buildCharacterCardData(characterData)
        const jsonStr = JSON.stringify(v2Data)
        if (!avatarDataUrl.value) {
          ui.addToast('该角色没有头像, 将导出纯 JSON 格式', 'info')
          if (window.electronAPI?.saveFileDialog) {
            const result = await window.electronAPI.saveFileDialog({
              defaultPath: (sections.value.name || 'character') + '.json',
              filters: [{ name: 'JSON 文件', extensions: ['json'] }]
            })
            if (result?.path) {
              await window.electronAPI.writeFile(result.path, jsonStr)
              ui.addToast('角色卡导出成功', 'success')
            }
          } else {
            const blob = new Blob([jsonStr], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = (sections.value.name || 'character') + '.json'
            a.click(); URL.revokeObjectURL(url)
            ui.addToast('角色卡导出成功', 'success')
          }
          return
        }
        const pngBytes = await cardUtils.imageUrlToPngBytes(avatarDataUrl.value, { crossOrigin: 'Anonymous' })
        const finalPng = cardUtils.injectPngTextChunk(pngBytes, 'chara', cardUtils.encodeBase64Utf8(jsonStr))
        if (window.electronAPI?.saveFileDialog) {
          const result = await window.electronAPI.saveFileDialog({
            defaultPath: (sections.value.name || 'character') + '.png',
            filters: [{ name: 'PNG 图片', extensions: ['png'] }]
          })
          if (result?.path) {
            await window.electronAPI.writeFile(result.path, finalPng)
            ui.addToast(`角色卡「${sections.value.name}」导出成功`, 'success')
          }
        } else {
          const blob = new Blob([finalPng], { type: 'image/png' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = (sections.value.name || 'character') + '.png'
          a.click(); URL.revokeObjectURL(url)
          ui.addToast('角色卡导出成功', 'success')
        }
      } catch (err) {
        console.error('Export error:', err)
        ui.addToast('导出失败: ' + err.message, 'error')
      }
    }

    return {
      settings, ui,
      isGenerating, status, progress, error, sections,
      showWorldInfo, showRegex,
      avatarPreview, fileInput, isGeneratingAvatar,
      onSend, onStop,
      triggerAvatarUpload, handleAvatarUpload, handleGenerateAvatar,
      handleSave, handleExportCard, estimateCardSize
    }
  }
}
</script>
