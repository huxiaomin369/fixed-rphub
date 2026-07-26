<!-- src/components/worldinfo/WorldInfoListItem.vue -->
<template>
  <div class="flex items-center gap-2 p-3 border-b border-gray-100 hover:bg-gray-50">
    <input
      type="checkbox"
      :checked="entry.enabled"
      @change="$emit('toggle', entry)"
      class="h-4 w-4"
    >
    <SystemSeedBadge v-if="entry.systemSeed" />
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-medium text-sm truncate">{{ entry.comment || '(未命名)' }}</span>
        <span v-if="entry.constant" class="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">常驻</span>
        <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{{ positionLabel }}</span>
        <ScopeBadge :scope="entry.scope" />
      </div>
      <p class="text-xs text-gray-500 mt-0.5 truncate">{{ entry.content.slice(0, 80) }}</p>
      <div v-if="entry.key && entry.key.length" class="flex flex-wrap gap-1 mt-1">
        <span v-for="k in entry.key.slice(0, 5)" :key="k" class="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{{ k }}</span>
        <span v-if="entry.key.length > 5" class="text-xs text-gray-400">+{{ entry.key.length - 5 }}</span>
      </div>
    </div>
    <button @click="$emit('edit', entry)" class="text-xs text-primary-600 hover:underline">编辑</button>
    <button v-if="!entry.systemSeed" @click="$emit('delete', entry)" class="text-xs text-red-600 hover:underline">删除</button>
    <button v-else disabled title="内置条目不可删除" class="text-xs text-gray-300 cursor-not-allowed">删除</button>
  </div>
</template>

<script>
import SystemSeedBadge from '../common/SystemSeedBadge.vue'
import ScopeBadge from '../common/ScopeBadge.vue'

const POSITION_LABELS = {
  global_note: '系统提示',
  before_character: '角色前',
  after_character: '角色后',
  at_depth: '按深度',
  user_only: '仅用户',
  assistant_only: '仅 AI',
}

export default {
  name: 'WorldInfoListItem',
  components: { SystemSeedBadge, ScopeBadge },
  props: { entry: { type: Object, required: true } },
  emits: ['toggle', 'edit', 'delete'],
  computed: {
    positionLabel() { return POSITION_LABELS[this.entry.position] || this.entry.position },
  },
}
</script>
