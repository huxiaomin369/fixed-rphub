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
        <!-- TODO: 文生图 provider 目前没有可用模型拉取接口，后续可接入 ModelSelectorModal -->
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
      const r = await checkImageGenConnection({ baseURL })
      settingsStore.setImageGenStatus(r.status, r.latency)
      if (r.status === 'error') lastError.value = r.error || '检测失败'
    }

    return { settings, showKey, lastError, isCustom, activeBaseUrl, placeholderUrl, currentImageGenUrl, setImageGenUrl, selectProvider, handleTest, IMAGE_GEN_PROVIDERS, CUSTOM_IMAGE_GEN_SLOTS, IMAGE_STYLES, IMAGE_SIZES }
  }
}
</script>
