<template>
  <div class="relative">
    <button type="button" @click="open = !open"
      class="w-full px-3 py-2.5 bg-white border border-gray-200/80 rounded-xl flex items-center justify-between text-sm hover:border-gray-300 transition-all">
      <span class="flex items-center gap-2 min-w-0">
        <img v-if="active?.icon" :src="active.icon" class="w-5 h-5 rounded object-contain flex-shrink-0" alt="">
        <span class="w-5 h-5 rounded bg-gray-100 flex-shrink-0" v-else></span>
        <span class="truncate text-gray-800 font-medium">{{ active?.name || '选择提供商' }}</span>
      </span>
      <svg class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform" :class="{ 'rotate-180': open }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>
    <div v-if="open" @click.stop
      class="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
      <div v-for="p in providers" :key="p.id" @click="select(p.id)"
        class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
        :class="{ 'bg-primary-50 text-primary-700': p.id === modelValue }">
        <img v-if="p[iconField]" :src="p[iconField]" class="w-5 h-5 rounded object-contain flex-shrink-0" alt="">
        <span class="w-5 h-5 rounded bg-gray-100 flex-shrink-0" v-else></span>
        <span class="truncate">{{ p.name }}</span>
      </div>
      <div v-if="customSlots?.length" class="border-t border-gray-100 mt-1 pt-1">
        <div v-for="p in customSlots" :key="p.id" @click="select(p.id)"
          class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
          :class="{ 'bg-primary-50 text-primary-700': p.id === modelValue }">
          <span class="w-5 h-5 rounded bg-gradient-to-br from-primary-100 to-primary-200 flex-shrink-0 flex items-center justify-center text-[10px] text-primary-700 font-bold">{{ p.name.slice(0, 1) }}</span>
          <span class="truncate">{{ p.name }}</span>
        </div>
      </div>
    </div>
    <div v-if="open" class="fixed inset-0 z-10" @click="open = false"></div>
  </div>
</template>

<script>
export default {
  name: 'ProviderDropdown',
  props: {
    modelValue: { type: String, required: true },
    providers: { type: Array, required: true },
    customSlots: { type: Array, default: () => [] },
    iconField: { type: String, default: 'icon' }
  },
  emits: ['update:modelValue'],
  data() {
    return { open: false }
  },
  computed: {
    active() {
      return this.providers.find(p => p.id === this.modelValue)
        || this.customSlots.find(p => p.id === this.modelValue)
        || null
    }
  },
  methods: {
    select(id) {
      this.$emit('update:modelValue', id)
      this.open = false
    }
  }
}
</script>
