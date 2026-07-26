<!-- src/components/presets/PresetEditorModal.vue -->
<template>
  <div v-if="open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('cancel')">
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
      <h2 class="text-lg font-semibold mb-4">{{ isNew ? '新建预设' : '编辑预设' }}</h2>
      <div class="space-y-3">
        <div>
          <label class="text-sm font-medium">名称</label>
          <input v-model="form.name" class="w-full mt-1 px-2 py-1 border rounded text-sm" :disabled="preset.systemSeed">
        </div>
        <div>
          <label class="text-sm font-medium">角色</label>
          <select v-model="form.role" class="w-full mt-1 px-2 py-1 border rounded text-sm">
            <option value="system">system</option>
            <option value="user">user</option>
            <option value="assistant">assistant</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium">作用域</label>
          <select v-model="form.scope" class="w-full mt-1 px-2 py-1 border rounded text-sm">
            <option value="global">全局</option>
            <option value="character">绑定当前角色卡</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium">内容</label>
          <textarea v-model="form.content" class="w-full mt-1 px-2 py-1 border rounded text-sm h-40 font-mono" />
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button @click="$emit('cancel')" class="px-3 py-1.5 text-sm rounded border">取消</button>
        <button @click="$emit('save', form)" class="px-3 py-1.5 text-sm rounded bg-primary-600 text-white">保存</button>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive, watch } from 'vue'

export default {
  name: 'PresetEditorModal',
  props: {
    open: { type: Boolean, default: false },
    preset: { type: Object, required: true },
    isNew: { type: Boolean, default: false },
  },
  emits: ['save', 'cancel'],
  setup(props) {
    const form = reactive({ name: '', content: '', role: 'system', scope: 'global' })
    watch(() => props.preset, (p) => {
      Object.assign(form, { name: p.name, content: p.content, role: p.role, scope: p.scope })
    }, { immediate: true, deep: true })
    return { form }
  },
}
</script>
