<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <div>
        <h2 class="text-lg font-bold text-gray-800">角色卡生成</h2>
        <p class="text-xs text-gray-400 mt-0.5">创建和导出角色卡</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="handleExportCard"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-sm font-medium"
          :disabled="!characterName.trim()">
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
        <!-- Basic Info -->
        <section class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30">
            <h3 class="font-bold text-gray-800">基本信息</h3>
          </div>
          <div class="px-6 py-5 space-y-5">
            <!-- Character Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">角色名称</label>
              <input v-model="characterName" type="text" placeholder="输入角色名称"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">角色描述</label>
              <textarea v-model="description" rows="4" placeholder="描述角色的背景、性格、外貌等..."
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm resize-none"></textarea>
            </div>

            <!-- Personality -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">性格特征</label>
              <textarea v-model="personality" rows="3" placeholder="描述角色性格特点..."
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm resize-none"></textarea>
            </div>

            <!-- First Message -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">开场白</label>
              <textarea v-model="firstMessage" rows="3" placeholder="角色的第一句话..."
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm resize-none"></textarea>
            </div>

            <!-- Creator Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">作者备注</label>
              <input v-model="creatorNotes" type="text" placeholder="可选"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
            </div>
          </div>
        </section>

        <!-- Avatar Section -->
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
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  上传头像
                </button>
                <button @click="handleGenerateAvatar"
                  class="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl hover:from-primary-600 hover:to-purple-600 transition-all shadow-sm text-sm font-medium"
                  :disabled="isGeneratingAvatar">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  {{ isGeneratingAvatar ? '生成中...' : 'AI 生成头像' }}
                </button>
                <p class="text-xs text-gray-400">支持 JPG、PNG 格式。建议 512x512 以上方形图片。</p>
                <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
              </div>
            </div>
          </div>
        </section>

        <!-- Preview Section -->
        <section class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30">
            <h3 class="font-bold text-gray-800">卡片预览</h3>
          </div>
          <div class="px-6 py-5">
            <div v-if="!characterName.trim()" class="text-center py-6 text-gray-400">
              <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              <p>输入角色名称后查看预览</p>
            </div>
            <div v-else class="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div class="w-16 h-16 rounded-2xl overflow-hidden border border-gray-200 flex-shrink-0 bg-white shadow-sm">
                <img v-if="avatarPreview" :src="avatarPreview" class="w-full h-full object-cover">
                <div v-else class="w-full h-full bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center text-primary-500 font-bold text-xl">
                  {{ characterName.charAt(0) }}
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <div class="font-bold text-gray-800 truncate">{{ characterName }}</div>
                <div class="text-xs text-gray-500 mt-0.5 line-clamp-2">{{ description || '暂无描述' }}</div>
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
  </div>
</template>

<script>
import { ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import cardUtils from '../utils/card-utils.js'
import { generateUUID } from '../utils/utils.js'

export default {
  name: 'GeneratorView',
  setup() {
    const settingsStore = useSettingsStore()
    const ui = useUIStore()
    const settings = settingsStore.settings

    const characterName = ref('')
    const description = ref('')
    const personality = ref('')
    const firstMessage = ref('')
    const creatorNotes = ref('')
    const avatarPreview = ref(null)
    const avatarDataUrl = ref(null)
    const fileInput = ref(null)
    const isGeneratingAvatar = ref(false)

    function triggerAvatarUpload() {
      fileInput.value?.click()
    }

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
      if (!characterName.value.trim()) {
        ui.addToast('请先输入角色名称', 'warning')
        return
      }

      isGeneratingAvatar.value = true
      try {
        // Try to use image generation API if configured
        const imageGenKey = settings.imageGenKey
        if (imageGenKey && settings.imageGenProviderId) {
          const apiUrl = settings.customImageGenUrl || 'https://apihub.agnes-ai.com/v1'
          const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/images/generations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${imageGenKey}`
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: `Anime portrait of a character named ${characterName.value}, ${description.value || ''}, ${personality.value || ''}, anime style, high quality, facial close-up`,
              n: 1,
              size: '1024x1024'
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

        // Fallback: generate initials avatar via canvas
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')

        const gradient = ctx.createLinearGradient(0, 0, 512, 512)
        gradient.addColorStop(0, '#6366f1')
        gradient.addColorStop(1, '#8b5cf6')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 512, 512)

        ctx.fillStyle = 'white'
        ctx.font = 'bold 180px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(characterName.value.charAt(0).toUpperCase(), 256, 256)

        avatarDataUrl.value = canvas.toDataURL('image/png')
        avatarPreview.value = canvas.toDataURL('image/png')
        ui.addToast('已生成默认头像', 'info'  )
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
        name: characterName.value,
        description: description.value,
        personality: personality.value,
        first_mes: firstMessage.value,
        creator_notes: creatorNotes.value || 'Generated by RP Hub',
        extensions: {},
        character_book: undefined
      }
    }

    async function handleExportCard() {
      if (!characterName.value.trim()) {
        ui.addToast('请输入角色名称', 'warning')
        return
      }

      try {
        const characterData = buildCardData()

        const v2Data = cardUtils.buildCharacterCardData(characterData)
        const jsonStr = JSON.stringify(v2Data)

        if (!avatarDataUrl.value) {
          ui.addToast('该角色没有头像，将导出纯 JSON 格式', 'info')
          // Export as JSON
          if (window.electronAPI?.saveFileDialog) {
            const result = await window.electronAPI.saveFileDialog({
              defaultPath: (characterName.value || 'character') + '.json',
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
            a.href = url
            a.download = (characterName.value || 'character') + '.json'
            a.click()
            URL.revokeObjectURL(url)
            ui.addToast('角色卡导出成功', 'success')
          }
          return
        }

        // Export as PNG with embedded chara data
        const pngBytes = await cardUtils.imageUrlToPngBytes(avatarDataUrl.value, { crossOrigin: 'Anonymous' })
        const finalPng = cardUtils.injectPngTextChunk(pngBytes, 'chara', cardUtils.encodeBase64Utf8(jsonStr))

        if (window.electronAPI?.saveFileDialog) {
          const result = await window.electronAPI.saveFileDialog({
            defaultPath: (characterName.value || 'character') + '.png',
            filters: [{ name: 'PNG 图片', extensions: ['png'] }]
          })
          if (result?.path) {
            await window.electronAPI.writeFile(result.path, finalPng)
            ui.addToast(`角色卡「${characterName.value}」导出成功`, 'success')
          }
        } else {
          const blob = new Blob([finalPng], { type: 'image/png' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = (characterName.value || 'character') + '.png'
          a.click()
          URL.revokeObjectURL(url)
          ui.addToast('角色卡导出成功', 'success')
        }
      } catch (err) {
        console.error('Export error:', err)
        ui.addToast('导出失败: ' + err.message, 'error')
      }
    }

    return {
      characterName,
      description,
      personality,
      firstMessage,
      creatorNotes,
      avatarPreview,
      fileInput,
      isGeneratingAvatar,
      triggerAvatarUpload,
      handleAvatarUpload,
      handleGenerateAvatar,
      handleExportCard,
      estimateCardSize
    }
  }
}
</script>
