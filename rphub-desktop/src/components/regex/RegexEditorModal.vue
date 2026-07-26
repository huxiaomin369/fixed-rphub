<!-- src/components/regex/RegexEditorModal.vue -->
<template>
  <div v-if="open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('cancel')">
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-auto">
      <h2 class="text-lg font-semibold mb-4">{{ isNew ? '新建正则脚本' : '编辑正则脚本' }}</h2>
      <div class="space-y-3">
        <div>
          <label class="text-sm font-medium">名称</label>
          <input v-model="form.name" class="w-full mt-1 px-2 py-1 border rounded text-sm" :disabled="script.systemSeed">
        </div>
        <div>
          <label class="text-sm font-medium">作用域</label>
          <select v-model="form.scope" class="w-full mt-1 px-2 py-1 border rounded text-sm">
            <option value="global">全局</option>
            <option value="character">绑定当前角色卡</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium">正则 (不含分隔符)</label>
          <input v-model="form.regex" class="w-full mt-1 px-2 py-1 border rounded text-sm font-mono" placeholder="例如：\{\{user\}\}">
        </div>
        <div>
          <label class="text-sm font-medium">标志位</label>
          <input v-model="form.flags" class="w-full mt-1 px-2 py-1 border rounded text-sm font-mono" placeholder="g, gi, ...">
        </div>
        <div>
          <label class="text-sm font-medium">替换为</label>
          <textarea v-model="form.replacement" class="w-full mt-1 px-2 py-1 border rounded text-sm h-16 font-mono" />
        </div>
        <div>
          <label class="text-sm font-medium">作用位置</label>
          <div class="flex gap-3 mt-1">
            <label class="flex items-center gap-1 text-sm">
              <input type="checkbox" :checked="form.placement.includes(1)" @change="togglePlacement(1)"> 显示 (display)
            </label>
            <label class="flex items-center gap-1 text-sm">
              <input type="checkbox" :checked="form.placement.includes(2)" @change="togglePlacement(2)"> 提示词 (prompt)
            </label>
          </div>
        </div>
        <div class="flex flex-wrap gap-3">
          <label class="flex items-center gap-1 text-sm">
            <input type="checkbox" v-model="form.markdownOnly"> 仅渲染后 (markdownOnly)
          </label>
          <label class="flex items-center gap-1 text-sm">
            <input type="checkbox" v-model="form.promptOnly"> 仅发送前 (promptOnly)
          </label>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium">最小深度 (minDepth)</label>
            <input v-model.number="form.minDepth" type="number" class="w-full mt-1 px-2 py-1 border rounded text-sm" placeholder="留空表示无限制">
          </div>
          <div>
            <label class="text-sm font-medium">最大深度 (maxDepth)</label>
            <input v-model.number="form.maxDepth" type="number" class="w-full mt-1 px-2 py-1 border rounded text-sm" placeholder="留空表示无限制">
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button @click="$emit('cancel')" class="px-3 py-1.5 text-sm rounded border">取消</button>
        <button @click="handleSave" class="px-3 py-1.5 text-sm rounded bg-primary-600 text-white">保存</button>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive, watch } from 'vue'

export default {
  name: 'RegexEditorModal',
  props: {
    open: { type: Boolean, default: false },
    script: { type: Object, required: true },
    isNew: { type: Boolean, default: false },
  },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    const form = reactive({
      name: '', regex: '', flags: 'g', replacement: '',
      placement: [1, 2], markdownOnly: false, promptOnly: false,
      minDepth: null, maxDepth: null, scope: 'character', enabled: true,
    })

    watch(() => props.script, (s) => {
      Object.assign(form, {
        name: s.name, regex: s.regex, flags: s.flags, replacement: s.replacement,
        placement: [...(s.placement || [1, 2])],
        markdownOnly: s.markdownOnly, promptOnly: s.promptOnly,
        minDepth: s.minDepth, maxDepth: s.maxDepth,
        scope: s.scope, enabled: s.enabled,
      })
    }, { immediate: true, deep: true })

    function togglePlacement(n) {
      if (form.placement.includes(n)) {
        form.placement = form.placement.filter(x => x !== n)
      } else {
        form.placement = [...form.placement, n].sort()
      }
    }

    function handleSave() {
      emit('save', { ...form })
    }

    return { form, togglePlacement, handleSave }
  },
}
</script>
