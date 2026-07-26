<!-- src/components/presets/PresetListItem.vue -->
<template>
  <div class="flex items-center gap-2 p-3 border-b border-gray-100 hover:bg-gray-50">
    <input
      type="checkbox"
      :checked="preset.enabled"
      @change="$emit('toggle', preset)"
      class="h-4 w-4"
    >
    <SystemSeedBadge v-if="preset.systemSeed" />
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="font-medium text-sm truncate">{{ preset.name }}</span>
        <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{{ preset.role }}</span>
        <ScopeBadge :scope="preset.scope" />
      </div>
      <p class="text-xs text-gray-500 mt-0.5 truncate">{{ preset.content.slice(0, 80) }}</p>
    </div>
    <button @click="$emit('edit', preset)" class="text-xs text-primary-600 hover:underline">编辑</button>
    <button
      v-if="!preset.systemSeed"
      @click="$emit('delete', preset)"
      class="text-xs text-red-600 hover:underline"
    >删除</button>
    <button
      v-else
      disabled
      title="内置条目不可删除"
      class="text-xs text-gray-300 cursor-not-allowed"
    >删除</button>
  </div>
</template>

<script>
import SystemSeedBadge from '../common/SystemSeedBadge.vue'
import ScopeBadge from '../common/ScopeBadge.vue'

export default {
  name: 'PresetListItem',
  components: { SystemSeedBadge, ScopeBadge },
  props: {
    preset: { type: Object, required: true },
  },
  emits: ['toggle', 'edit', 'delete'],
}
</script>
