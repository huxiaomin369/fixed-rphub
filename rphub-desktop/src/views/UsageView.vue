<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <div>
        <h2 class="text-lg font-bold text-gray-800">统计</h2>
        <p class="text-xs text-gray-400 mt-0.5">API 使用统计与配额信息</p>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- Usage Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-gray-500">API 调用次数</span>
            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
          </div>
          <div class="text-3xl font-bold text-gray-800 tabular-nums">{{ stats.totalCalls }}</div>
          <div class="text-xs text-gray-400 mt-1">累计调用</div>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-gray-500">总 Token 消耗</span>
            <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
          </div>
          <div class="text-3xl font-bold text-gray-800 tabular-nums">{{ formatNumber(stats.totalTokens) }}</div>
          <div class="text-xs text-gray-400 mt-1">所有模型合计</div>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-gray-500">今日用量</span>
            <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div class="text-3xl font-bold text-gray-800 tabular-nums">{{ formatNumber(stats.todayTokens) }}</div>
          <div class="text-xs text-gray-400 mt-1">今日 Token</div>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-gray-500">会话数</span>
            <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
              </svg>
            </div>
          </div>
          <div class="text-3xl font-bold text-gray-800 tabular-nums">{{ stats.totalSessions }}</div>
          <div class="text-xs text-gray-400 mt-1">总对话数</div>
        </div>
      </div>

      <!-- Model Breakdown -->
      <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30">
          <h3 class="font-bold text-gray-800">模型用量分布</h3>
        </div>
        <div class="px-6 py-5">
          <div v-if="stats.modelStats.length === 0" class="text-center py-8 text-gray-400">
            <p>暂无使用数据</p>
          </div>
          <div v-else class="space-y-4">
            <div v-for="(model, idx) in stats.modelStats" :key="idx"
              class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                  {{ idx + 1 }}
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-800">{{ model.name }}</div>
                  <div class="text-xs text-gray-400">{{ model.calls }} 次调用</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium text-gray-800 tabular-nums">{{ formatNumber(model.tokens) }}</div>
                <div class="text-xs text-gray-400">tokens</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quota Info -->
      <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30">
          <h3 class="font-bold text-gray-800">配额信息</h3>
        </div>
        <div class="px-6 py-5">
          <div class="flex items-center gap-3 text-sm text-gray-500">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>配额信息需要 API 提供商支持。请查看您的 API 提供商控制台获取详细用量数据。</span>
          </div>
          <div class="mt-4 flex items-center gap-2">
            <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-primary-500 rounded-full" style="width: 0%"></div>
            </div>
            <span class="text-xs text-gray-400 tabular-nums">-- / --</span>
          </div>
        </div>
      </div>

      <!-- Usage History -->
      <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100/80 bg-gray-50/30">
          <h3 class="font-bold text-gray-800">使用历史</h3>
        </div>
        <div class="px-6 py-8 text-center text-gray-400">
          <div class="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-2xl flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <p class="text-sm">详细使用历史功能即将推出</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'

export default {
  name: 'UsageView',
  setup() {
    const settingsStore = useSettingsStore()

    // Usage stats — currently placeholder/demo data
    const stats = reactive({
      totalCalls: 0,
      totalTokens: 0,
      todayTokens: 0,
      totalSessions: 0,
      modelStats: []
    })

    function loadStats() {
      try {
        // Try to load persisted usage stats
        const raw = localStorage.getItem('rphub_usage_stats')
        if (raw) {
          const data = JSON.parse(raw)
          Object.assign(stats, data)
        } else {
          // Demo stats
          stats.totalCalls = 0
          stats.totalTokens = 0
          stats.todayTokens = 0
          stats.totalSessions = 0
          stats.modelStats = []
        }
      } catch (_) {
        // Ignore parse errors
      }
    }

    function formatNumber(n) {
      if (n == null || isNaN(n)) return '0'
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
      return n.toLocaleString()
    }

    onMounted(() => {
      loadStats()
    })

    return {
      stats,
      formatNumber
    }
  }
}
</script>
