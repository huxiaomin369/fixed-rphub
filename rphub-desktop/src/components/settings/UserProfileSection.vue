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
import { computed } from 'vue'
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
