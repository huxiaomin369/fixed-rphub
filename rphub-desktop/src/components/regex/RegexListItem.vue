<!-- src/components/regex/RegexListItem.vue -->
<template>
  <div class="flex items-center gap-2 p-3 border-b border-gray-100 hover:bg-gray-50">
    <input
      type="checkbox"
      :checked="script.enabled"
      @change="$emit('toggle', script)"
      class="h-4 w-4"
    >
    <SystemSeedBadge v-if="script.systemSeed" />
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-medium text-sm truncate">{{ script.name }}</span>
        <ScopeBadge :scope="script.scope" />
        <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
          /{{ script.regex.slice(0, 30) }}{{ script.regex.length > 30 ? '...' : '' }}/{{ script.flags }}
        </span>
        <span v-if="script.markdownOnly" class="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">仅显示</span>
        <span v-if="script.promptOnly" class="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">仅提示</span>
      </div>
      <p v-if="script.replacement" class="text-xs text-gray-500 mt-0.5 truncate font-mono">→ {{ script.replacement.slice(0, 60) }}</p>
    </div>
    <button @click="$emit('edit', script)" class="text-xs text-primary-600 hover:underline">编辑</button>
    <button v-if="!script.systemSeed" @click="$emit('delete', script)" class="text-xs text-red-600 hover:underline">删除</button>
    <button v-else disabled title="内置条目不可删除" class="text-xs text-gray-300 cursor-not-allowed">删除</button>
  </div>
</template>

<script>
import SystemSeedBadge from '../common/SystemSeedBadge.vue'
import ScopeBadge from '../common/ScopeBadge.vue'

export default {
  name: 'RegexListItem',
  components: { SystemSeedBadge, ScopeBadge },
  props: { script: { type: Object, required: true } },
  emits: ['toggle', 'edit', 'delete'],
}
</script>
