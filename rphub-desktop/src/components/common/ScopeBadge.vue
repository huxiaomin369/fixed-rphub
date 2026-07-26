<!-- src/components/common/ScopeBadge.vue -->
<template>
  <span
    :class="[
      'inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium',
      scope === 'global'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-purple-100 text-purple-700'
    ]"
  >
    {{ scope === 'global' ? '全局' : '绑定当前角色卡' }}
  </span>
</template>

<script>
export default {
  name: 'ScopeBadge',
  props: {
    scope: { type: String, required: true, validator: v => ['global', 'character'].includes(v) },
  },
}
</script>
