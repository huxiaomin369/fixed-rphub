<!-- src/components/presets/PresetScopeTabs.vue -->
<template>
  <div class="flex gap-2 mb-3 border-b border-gray-200">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      :class="['px-3 py-1.5 text-sm', modelValue === tab.value ? 'border-b-2 border-primary-500 text-primary-700 font-medium' : 'text-gray-500']"
      @click="$emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'PresetScopeTabs',
  props: {
    modelValue: { type: String, default: 'all' },
  },
  emits: ['update:modelValue'],
  setup() {
    return {
      tabs: [
        { value: 'all', label: '全部' },
        { value: 'global', label: '全局' },
        { value: 'character', label: '绑定' },
      ],
    }
  },
}
</script>
