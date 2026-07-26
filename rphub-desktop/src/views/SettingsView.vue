<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <div>
        <h2 class="text-lg font-bold text-gray-800">设置</h2>
        <p class="text-xs text-gray-400 mt-0.5">应用配置与偏好</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="handleResetSettings"
          class="px-4 py-2 text-sm bg-white border border-gray-200/80 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm font-medium">
          重置
        </button>
        <button @click="handleSaveSettings"
          class="px-4 py-2 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-sm font-medium">
          保存设置
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6 space-y-8">
      <UserProfileSection />
      <ApiConfigSection />
      <ImageGenSection />

      <!-- UI Preferences -->
      <section class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30">
          <h3 class="font-bold text-gray-800">界面偏好</h3>
          <p class="text-xs text-gray-400 mt-0.5">自定义显示和交互方式</p>
        </div>
        <div class="px-6 py-5 space-y-5">
          <!-- Font Size -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-sm font-medium text-gray-700">字体大小</label>
              <span class="text-sm text-gray-500 tabular-nums">{{ settings.fontSize }}px</span>
            </div>
            <input type="range" min="12" max="24" step="1" v-model.number="settings.fontSize"
              class="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary-500" />
            <div class="flex justify-between text-xs text-gray-400 mt-1">
              <span>小 (12)</span>
              <span>中 (16)</span>
              <span>大 (24)</span>
            </div>
          </div>

          <!-- Font Family -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">字体风格</label>
            <div class="flex gap-3">
              <button @click="settings.fontFamily = 'modern'"
                class="flex-1 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium"
                :class="settings.fontFamily === 'modern' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'">
                现代
              </button>
              <button @click="settings.fontFamily = 'system'"
                class="flex-1 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium"
                :class="settings.fontFamily === 'system' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'">
                系统
              </button>
              <button @click="settings.fontFamily = 'serif'"
                class="flex-1 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium"
                :class="settings.fontFamily === 'serif' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'">
                衬线
              </button>
            </div>
          </div>

          <!-- Use Character Background -->
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-gray-700">使用角色背景</label>
              <p class="text-xs text-gray-400">在聊天界面显示角色头像作为背景</p>
            </div>
            <button @click="settings.useCharacterBackground = !settings.useCharacterBackground"
              class="relative w-10 h-6 rounded-full transition-colors duration-200"
              :class="settings.useCharacterBackground ? 'bg-primary-500' : 'bg-gray-200'">
              <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"
                :class="settings.useCharacterBackground ? 'translate-x-4' : ''"></span>
            </button>
          </div>

          <!-- Immersive Mode -->
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-gray-700">沉浸模式</label>
              <p class="text-xs text-gray-400">全屏沉浸式聊天体验</p>
            </div>
            <button @click="settings.immersiveMode = !settings.immersiveMode"
              class="relative w-10 h-6 rounded-full transition-colors duration-200"
              :class="settings.immersiveMode ? 'bg-primary-500' : 'bg-gray-200'">
              <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"
                :class="settings.immersiveMode ? 'translate-x-4' : ''"></span>
            </button>
          </div>

          <!-- Context Size -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-sm font-medium text-gray-700">上下文大小</label>
              <span class="text-sm text-gray-500 tabular-nums">{{ formatContextSize(settings.contextSize) }}</span>
            </div>
            <input type="range" min="4096" max="1048576" step="4096" v-model.number="settings.contextSize"
              class="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary-500" />
            <div class="flex justify-between text-xs text-gray-400 mt-1">
              <span>4K</span>
              <span>1M</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Data Management -->
      <section class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30">
          <h3 class="font-bold text-gray-800">数据管理</h3>
          <p class="text-xs text-gray-400 mt-0.5">导入导出应用数据</p>
        </div>
        <div class="px-6 py-5">
          <div class="flex flex-wrap gap-3">
            <button @click="handleExportAll"
              class="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200/80 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm text-sm font-medium">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              导出所有数据
            </button>
            <button @click="handleImportAll"
              class="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200/80 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm text-sm font-medium">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              导入数据
            </button>
          </div>
          <p class="text-xs text-gray-400 mt-3">数据将以 .rphub 格式导出，包含所有角色卡、聊天记录和设置。</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import localforage from 'localforage'
import UserProfileSection from '../components/settings/UserProfileSection.vue'
import ApiConfigSection from '../components/settings/ApiConfigSection.vue'
import ImageGenSection from '../components/settings/ImageGenSection.vue'

export default {
  name: 'SettingsView',
  components: { UserProfileSection, ApiConfigSection, ImageGenSection },
  setup() {
    const settingsStore = useSettingsStore()
    const ui = useUIStore()
    const settings = settingsStore.settings
    function handleSaveSettings() {
      settingsStore.saveSettings()
      // Apply font family
      document.documentElement.setAttribute('data-app-font', settings.fontFamily || 'modern')
      // Apply font size
      document.documentElement.style.fontSize = (settings.fontSize || 16) + 'px'
      ui.addToast('设置已保存', 'success')
    }

    function handleResetSettings() {
      settingsStore.resetSettings()
      settingsStore.saveSettings()
      ui.addToast('设置已重置', 'info')
    }

    async function handleExportAll() {
      try {
        if (window.electronAPI?.exportAllData) {
          const result = await window.electronAPI.exportAllData()
          if (result.success) {
            ui.addToast('数据导出成功', 'success')
          } else if (result.error) {
            ui.addToast('导出失败: ' + result.error, 'error')
          }
          // canceled — no feedback needed
        } else {
          // Fallback for non-Electron: use localforage directly
          const allData = {}
          const stores = ['settings', 'characters', 'presets', 'worldinfo', 'global_worldinfo', 'regex', 'memories', 'classic_memories', 'memory_settings', 'worldinfo_settings']
          for (const key of stores) {
            try {
              allData[key] = await localforage.getItem(key)
            } catch (_) { /* skip */ }
          }

          const backup = {
            version: 1,
            exportedAt: new Date().toISOString(),
            data: allData
          }

          const jsonStr = JSON.stringify(backup, null, 2)
          const blob = new Blob([jsonStr], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `rphub-backup-${Date.now()}.rphub`
          a.click()
          URL.revokeObjectURL(url)
          ui.addToast('数据导出成功', 'success')
        }
      } catch (err) {
        console.error('Export error:', err)
        ui.addToast('导出失败: ' + err.message, 'error')
      }
    }

    async function handleImportAll() {
      try {
        if (window.electronAPI?.importAllData) {
          const result = await window.electronAPI.importAllData()
          if (result.success) {
            ui.addToast('数据导入成功，请刷新视图查看', 'success')
          } else if (result.error) {
            ui.addToast('导入失败: ' + result.error, 'error')
          }
        } else {
          // Fallback for non-Electron: file input + localforage
          const jsonStr = await new Promise((resolve, reject) => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.rphub,.json'
            input.onchange = (e) => {
              const file = e.target.files?.[0]
              if (!file) { reject(new Error('未选择文件')); return }
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result)
              reader.onerror = () => reject(reader.error)
              reader.readAsText(file)
            }
            input.click()
          })

          const backup = JSON.parse(jsonStr)
          if (!backup.version || !backup.data) {
            throw new Error('无效的备份文件格式')
          }

          const data = backup.data
          for (const [key, value] of Object.entries(data)) {
            if (value !== null && value !== undefined) {
              try {
                await localforage.setItem(key, value)
              } catch (_) { /* skip individual key failures */ }
            }
          }

          // Reload settings
          await settingsStore.loadSettings()
          ui.addToast('数据导入成功，部分设置可能需要重启应用后生效', 'success')
        }
      } catch (err) {
        console.error('Import error:', err)
        ui.addToast('导入失败: ' + err.message, 'error')
      }
    }

    function formatContextSize(size) {
      if (size >= 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + 'M'
      if (size >= 1024) return (size / 1024).toFixed(0) + 'K'
      return size.toString()
    }

    return {
      settings,
      settingsStore,
      ui,
      handleSaveSettings,
      handleResetSettings,
      handleExportAll,
      handleImportAll,
      formatContextSize
    }
  }
}
</script>
