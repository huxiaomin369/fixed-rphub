<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <div>
        <h2 class="text-lg font-bold text-gray-800">工具</h2>
        <p class="text-xs text-gray-400 mt-0.5">插件与辅助工具</p>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Tool Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Character Card Tool -->
        <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <h3 class="font-bold text-gray-800 mb-1">角色卡生成器</h3>
          <p class="text-sm text-gray-500 mb-4">一键生成角色卡，支持 V2/V3 格式导出。</p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400">状态：可用</span>
            <span class="px-2.5 py-1 text-xs rounded-full bg-green-50 text-green-600 font-medium">已启用</span>
          </div>
        </div>

        <!-- Memory Tool -->
        <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
          </div>
          <h3 class="font-bold text-gray-800 mb-1">记忆系统</h3>
          <p class="text-sm text-gray-500 mb-4">长期记忆与上下文管理，支持经典和向量模式。</p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400">状态：可用</span>
            <span class="px-2.5 py-1 text-xs rounded-full bg-green-50 text-green-600 font-medium">已启用</span>
          </div>
        </div>

        <!-- World Info Tool -->
        <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.25v13m0-13C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v13C4.17 18.48 5.75 18 7.5 18s3.33.48 4.5 1.25m0-13C13.17 5.48 14.75 5 16.5 5S19.83 5.48 21 6.25v13C19.83 18.48 18.25 18 16.5 18s-3.33.48-4.5 1.25"></path>
            </svg>
          </div>
          <h3 class="font-bold text-gray-800 mb-1">世界书</h3>
          <p class="text-sm text-gray-500 mb-4">世界观设定管理，按关键词自动注入上下文。</p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400">状态：可用</span>
            <span class="px-2.5 py-1 text-xs rounded-full bg-green-50 text-green-600 font-medium">已启用</span>
          </div>
        </div>

        <!-- Regex Tool -->
        <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
            </svg>
          </div>
          <h3 class="font-bold text-gray-800 mb-1">正则脚本</h3>
          <p class="text-sm text-gray-500 mb-4">对话内容替换与格式化，支持全局/角色级。</p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400">状态：可用</span>
            <span class="px-2.5 py-1 text-xs rounded-full bg-green-50 text-green-600 font-medium">已启用</span>
          </div>
        </div>

        <!-- Presets Tool -->
        <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-100 to-cyan-50 flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4M6 18a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
            </svg>
          </div>
          <h3 class="font-bold text-gray-800 mb-1">预设管理</h3>
          <p class="text-sm text-gray-500 mb-4">保存和切换系统提示词预设。</p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400">状态：可用</span>
            <span class="px-2.5 py-1 text-xs rounded-full bg-green-50 text-green-600 font-medium">已启用</span>
          </div>
        </div>

        <!-- UI Templates Tool -->
        <div class="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm4 3h8M8 12h8M8 16h5"></path>
            </svg>
          </div>
          <h3 class="font-bold text-gray-800 mb-1">UI 模板</h3>
          <p class="text-sm text-gray-500 mb-4">自定义角色卡界面模板，增强展示效果。</p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400">状态：可用</span>
            <span class="px-2.5 py-1 text-xs rounded-full bg-green-50 text-green-600 font-medium">已启用</span>
          </div>
        </div>
      </div>

      <!-- Plugin System Notice -->
      <div class="mt-8 bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl border border-primary-100/80 p-6">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-gray-800 mb-1">插件系统 (即将推出)</h3>
            <p class="text-sm text-gray-600">插件系统正在开发中，未来将支持社区贡献的第三方插件。您可以通过自定义脚本和世界书扩展应用功能。</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ToolView'
}
</script>
