<template>
  <div
    class="char-grid-item group relative rounded-2xl border-2 transition-all duration-200 cursor-pointer overflow-hidden"
    :class="[
      selected
        ? 'border-primary-400 bg-primary-50/60 shadow-md shadow-primary-100/50'
        : 'border-gray-200/80 bg-white hover:border-gray-300 hover:shadow-md hover:shadow-gray-100/50'
    ]"
    @click="$emit('select')"
  >
    <!-- Actions menu (appears on hover) -->
    <div class="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <button
        @click.stop="$emit('edit')"
        class="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 border border-gray-200 shadow-sm text-gray-500 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50 transition-all"
        title="编辑"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
      </button>
      <button
        @click.stop="$emit('export')"
        class="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 border border-gray-200 shadow-sm text-gray-500 hover:text-green-600 hover:border-green-300 hover:bg-green-50 transition-all"
        title="导出"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>
      </button>
      <button
        @click.stop="$emit('delete')"
        class="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 border border-gray-200 shadow-sm text-gray-500 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-all"
        title="删除"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </button>
    </div>

    <!-- Avatar -->
    <div class="flex items-center justify-center pt-5 pb-2">
      <div class="relative">
        <img
          v-if="character.avatar && !avatarError"
          :src="character.avatar"
          :alt="character.name"
          class="w-20 h-20 rounded-2xl object-cover shadow-sm ring-2 ring-white"
          @error="avatarError = true"
        />
        <div
          v-else
          class="w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 text-white text-3xl font-bold shadow-sm ring-2 ring-white"
        >
          {{ avatarFallback }}
        </div>
        <!-- Selected indicator -->
        <div v-if="selected"
          class="absolute -top-1 -right-1 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-md">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
      </div>
    </div>

    <!-- Info -->
    <div class="px-4 pb-4 text-center">
      <h3 class="font-bold text-gray-800 text-sm truncate">{{ character.name || '未命名角色' }}</h3>
      <p class="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed min-h-[2.5rem]">
        {{ descriptionSnippet }}
      </p>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'CharacterCard',
  props: {
    character: { type: Object, required: true },
    selected: { type: Boolean, default: false }
  },
  emits: ['select', 'edit', 'export', 'delete'],
  setup(props) {
    const avatarError = ref(false)

    const avatarFallback = computed(() => {
      const name = props.character.name || '?'
      return name.charAt(0).toUpperCase()
    })

    const descriptionSnippet = computed(() => {
      const desc = props.character.description || ''
      return desc.length > 80 ? desc.slice(0, 80) + '...' : desc || '暂无描述'
    })

    return { avatarError, avatarFallback, descriptionSnippet }
  }
}
</script>
