<template>
  <div v-if="status" class="space-y-1.5 pt-2">
    <div class="flex items-center justify-between text-xs">
      <span class="text-gray-600 flex items-center gap-1.5">
        <span v-if="isGenerating" class="inline-block w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
        <span v-else class="inline-block w-2 h-2 rounded-full bg-green-500"></span>
        {{ status }}
      </span>
      <span class="text-gray-400 font-mono">{{ progress }}%</span>
    </div>
    <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div class="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-300 ease-out"
        :class="isGenerating ? 'animate-pulse' : ''"
        :style="{ width: progress + '%' }"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GenerationProgress',
  props: {
    status: { type: String, default: '' },
    progress: { type: Number, default: 0 },
    isGenerating: { type: Boolean, default: false }
  }
}
</script>
