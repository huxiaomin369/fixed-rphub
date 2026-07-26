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

      <!-- Refresh available models list -->
      <div>
        <button @click="handleRefreshModels" :disabled="loadingModels"
          class="w-full px-4 py-2.5 bg-white hover:bg-primary-50 text-gray-600 hover:text-primary-700 rounded-xl border border-gray-200/80 hover:border-primary-200 transition-all shadow-sm active:scale-[0.99] text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
          <svg class="w-4 h-4" :class="loadingModels ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          {{ loadingModels ? '获取中…' : '刷新可用模型列表' }}
        </button>
        <p v-if="modelsError" class="text-xs text-rose-600 mt-1.5">{{ modelsError }}</p>
      </div>

      <!-- Model + tiers -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">默认模型</label>
        <button type="button" @click="handleOpenSelector('model')"
          class="w-full px-3 py-2.5 bg-white border border-gray-200/80 rounded-xl flex items-center justify-between text-sm hover:border-gray-300 transition-all">
          <span class="truncate font-mono text-gray-800 font-medium">{{ settings.model || '选择默认模型' }}</span>
          <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
      </div>
      <div class="border-t border-gray-100/80 pt-5">
        <h4 class="text-sm font-medium text-gray-700 mb-3">模型分层配置</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">质量模型</label>
            <button type="button" @click="handleOpenSelector('qualityModel')"
              class="w-full px-3 py-2.5 bg-white border border-gray-200/80 rounded-xl flex items-center justify-between text-sm hover:border-gray-300 transition-all">
              <span class="truncate font-mono text-gray-800 font-medium">{{ settings.qualityModel || '选择质量模型' }}</span>
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">平衡模型</label>
            <button type="button" @click="handleOpenSelector('balancedModel')"
              class="w-full px-3 py-2.5 bg-white border border-gray-200/80 rounded-xl flex items-center justify-between text-sm hover:border-gray-300 transition-all">
              <span class="truncate font-mono text-gray-800 font-medium">{{ settings.balancedModel || '选择平衡模型' }}</span>
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">快速模型</label>
            <button type="button" @click="handleOpenSelector('fastModel')"
              class="w-full px-3 py-2.5 bg-white border border-gray-200/80 rounded-xl flex items-center justify-between text-sm hover:border-gray-300 transition-all">
              <span class="truncate font-mono text-gray-800 font-medium">{{ settings.fastModel || '选择快速模型' }}</span>
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <ModelSelectorModal
        v-model="selectorOpen"
        :models="availableModels"
        :current-value="selectorTarget ? settings[selectorTarget] : ''"
        @select="handleSelectModel" />

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
import { checkApiConnection, fetchApiModels } from '../../services/connectionCheck'
import ProviderDropdown from './ProviderDropdown.vue'
import ConnectionStatusBadge from './ConnectionStatusBadge.vue'
import ModelSelectorModal from './ModelSelectorModal.vue'

export default {
  name: 'ApiConfigSection',
  components: { ProviderDropdown, ConnectionStatusBadge, ModelSelectorModal },
  setup() {
    const settingsStore = useSettingsStore()
    const uiStore = useUIStore()
    const settings = settingsStore.settings
    const showKey = ref(false)
    const lastError = ref('')
    const availableModels = ref([])
    const loadingModels = ref(false)
    const modelsError = ref('')
    const selectorOpen = ref(false)
    const selectorTarget = ref('model')

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
      // 切换 provider 时清空已拉取的模型列表
      availableModels.value = []
      modelsError.value = ''
    }

    async function handleTest() {
      lastError.value = ''
      settingsStore.setApiStatus('checking')
      const r = await checkApiConnection({ baseURL: settings.apiUrl, apiKey: settings.apiKey })
      settingsStore.setApiStatus(r.status, r.latency)
      if (r.status === 'error') lastError.value = r.error || '检测失败'
    }

    async function handleRefreshModels() {
      modelsError.value = ''
      loadingModels.value = true
      uiStore.addToast('正在获取模型列表...', 'info', 2000)
      const r = await fetchApiModels({ baseURL: settings.apiUrl, apiKey: settings.apiKey })
      loadingModels.value = false
      if (r.status === 'error') {
        modelsError.value = `获取失败：${r.error || '未知错误'}`
        uiStore.addToast('获取模型失败: ' + (r.error || '未知错误'), 'error', 4000)
        return
      }
      availableModels.value = r.models
      uiStore.addToast(`成功获取 ${r.models.length} 个模型`, 'success', 3000)
    }

    function handleOpenSelector(target) {
      selectorTarget.value = target
      selectorOpen.value = true
    }

    function handleSelectModel(id) {
      if (selectorTarget.value) {
        settings[selectorTarget.value] = id
      }
      selectorOpen.value = false
    }

    return { settings, showKey, lastError, availableModels, loadingModels, modelsError, selectorOpen, selectorTarget, isCustom, activeName, placeholderUrl, selectProvider, handleTest, handleRefreshModels, handleOpenSelector, handleSelectModel, API_PROVIDERS, CUSTOM_PROVIDER_SLOTS }
  }
}
</script>
