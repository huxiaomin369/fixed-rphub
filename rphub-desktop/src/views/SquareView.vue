<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <div>
        <h2 class="text-lg font-bold text-gray-800">万相广场</h2>
        <p class="text-xs text-gray-400 mt-0.5">社区角色卡与模板分享</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="搜索角色..."
            class="w-48 pl-9 pr-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all placeholder-gray-400" />
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Featured Banner -->
      <div class="bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        <div class="relative z-10">
          <h3 class="text-2xl font-bold mb-2">万相广场</h3>
          <p class="text-primary-100 text-sm max-w-lg">发现、分享和下载社区创作的精彩角色卡。万相广场汇集了各类角色模板，让你的角色扮演体验更加丰富多彩。</p>
        </div>
      </div>

      <!-- Categories -->
      <div class="mb-8">
        <h3 class="text-sm font-bold text-gray-700 mb-4">分类浏览</h3>
        <div class="flex flex-wrap gap-2">
          <button v-for="cat in categories" :key="cat.id"
            @click="activeCategory = cat.id"
            class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            :class="activeCategory === cat.id ? 'bg-primary-500 text-white shadow-sm' : 'bg-white border border-gray-200/80 text-gray-600 hover:border-gray-300 hover:bg-gray-50'">
            {{ cat.name }}
          </button>
        </div>
      </div>

      <!-- Character Grid -->
      <div v-if="filteredCharacters.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <div class="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mb-5">
          <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
          </svg>
        </div>
        <p class="font-medium mb-1">{{ searchQuery ? '未找到匹配的角色' : '广场即将开放' }}</p>
        <p class="text-sm">{{ searchQuery ? '尝试其他关键词' : '社区角色分享功能正在建设中，敬请期待' }}</p>
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <div v-for="(item, idx) in filteredCharacters" :key="idx"
          class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group">
          <div class="aspect-square bg-gradient-to-br from-gray-100 to-gray-50 relative overflow-hidden">
            <img v-if="item.avatar" :src="item.avatar" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </div>
          <div class="p-3">
            <div class="text-sm font-medium text-gray-800 truncate">{{ item.name || '未知角色' }}</div>
            <div class="text-xs text-gray-400 mt-1 line-clamp-1">{{ item.description || '暂无描述' }}</div>
            <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
              <span class="text-xs text-gray-400">❤️ {{ item.likes || 0 }}</span>
              <span class="text-xs text-gray-400">下载 {{ item.downloads || 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Coming Soon Feature List -->
      <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-50 flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
            </svg>
          </div>
          <h4 class="text-sm font-bold text-gray-800 mb-1">上传分享</h4>
          <p class="text-xs text-gray-500">将自己的角色卡上传到广场，与社区分享</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-green-50 flex items-center justify-center">
            <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
            </svg>
          </div>
          <h4 class="text-sm font-bold text-gray-800 mb-1">模板合集</h4>
          <p class="text-xs text-gray-500">精选角色模板和世界观设定包</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-purple-50 flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
            </svg>
          </div>
          <h4 class="text-sm font-bold text-gray-800 mb-1">评价系统</h4>
          <p class="text-xs text-gray-500">评分和评论，发现最受欢迎的角色卡</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'SquareView',
  setup() {
    const searchQuery = ref('')
    const activeCategory = ref('all')

    const categories = [
      { id: 'all', name: '全部' },
      { id: 'anime', name: '动漫' },
      { id: 'game', name: '游戏' },
      { id: 'original', name: '原创' },
      { id: 'furry', name: '兽人' },
      { id: 'fantasy', name: '奇幻' },
      { id: 'sci-fi', name: '科幻' }
    ]

    // Demo characters / placeholder
    const characters = ref([])

    const filteredCharacters = computed(() => {
      let list = characters.value
      if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase().trim()
        list = list.filter(c => (c.name || '').toLowerCase().includes(q))
      }
      if (activeCategory.value !== 'all') {
        list = list.filter(c => c.category === activeCategory.value)
      }
      return list
    })

    return {
      searchQuery,
      activeCategory,
      categories,
      characters,
      filteredCharacters
    }
  }
}
</script>
