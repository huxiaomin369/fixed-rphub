<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="show" class="fixed inset-0 z-[70] flex items-center justify-center p-4" @click.self="$emit('cancel')">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>

        <!-- Modal -->
        <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden z-10">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 pt-5 pb-2">
            <h2 class="text-lg font-bold text-gray-800">{{ title }}</h2>
          </div>

          <!-- Body -->
          <div class="px-6 pb-6">
            <p class="text-sm text-gray-600 leading-relaxed">{{ message }}</p>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <button @click="$emit('cancel')"
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors">
              {{ cancelText }}
            </button>
            <button @click="$emit('confirm')"
              :class="['px-5 py-2 text-sm text-white rounded-xl transition-colors font-medium shadow-sm', confirmButtonClass]">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script>
export default {
  name: 'ConfirmModal',
  props: {
    show: { type: Boolean, default: false },
    title: { type: String, default: '确认操作' },
    message: { type: String, default: '确定要执行此操作吗？' },
    confirmText: { type: String, default: '确认' },
    cancelText: { type: String, default: '取消' },
    confirmButtonClass: { type: String, default: 'bg-red-500 hover:bg-red-600' }
  },
  emits: ['confirm', 'cancel']
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
