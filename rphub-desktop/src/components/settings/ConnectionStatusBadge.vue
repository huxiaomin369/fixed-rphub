<template>
  <div class="inline-flex items-center gap-1.5 text-xs font-medium">
    <span class="relative flex w-2 h-2">
      <span v-if="status === 'checking'" class="absolute inline-flex w-full h-full rounded-full bg-amber-400 opacity-75 animate-ping"></span>
      <span class="relative inline-flex w-2 h-2 rounded-full" :class="dotClass"></span>
    </span>
    <span :class="textClass">{{ label }}</span>
    <span v-if="status === 'connected' && latency > 0" class="text-gray-400 tabular-nums">{{ latency }}ms</span>
  </div>
</template>

<script>
export default {
  name: 'ConnectionStatusBadge',
  props: {
    status: { type: String, default: 'unknown' }, // unknown | checking | connected | error
    latency: { type: Number, default: 0 }
  },
  computed: {
    dotClass() {
      return {
        'bg-emerald-500': this.status === 'connected',
        'bg-rose-500': this.status === 'error',
        'bg-amber-400': this.status === 'checking',
        'bg-gray-300': this.status === 'unknown'
      }[this.status] || 'bg-gray-300'
    },
    textClass() {
      return {
        'text-emerald-700': this.status === 'connected',
        'text-rose-600': this.status === 'error',
        'text-amber-600': this.status === 'checking',
        'text-gray-500': this.status === 'unknown'
      }[this.status] || 'text-gray-500'
    },
    label() {
      return {
        connected: '已连接',
        error: '连接失败',
        checking: '检测中…',
        unknown: '未检测'
      }[this.status] || '未检测'
    }
  }
}
</script>
