<!-- src/components/worldinfo/WorldInfoEditorModal.vue -->
<template>
  <div v-if="open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('cancel')">
    <div class="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[85vh] overflow-auto">
      <h2 class="text-lg font-semibold mb-4">{{ isNew ? '新建世界书条目' : '编辑世界书条目' }}</h2>
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2">
          <label class="text-sm font-medium">标题 / 关键词组名</label>
          <input v-model="form.comment" class="w-full mt-1 px-2 py-1 border rounded text-sm" :disabled="entry.systemSeed">
        </div>
        <div class="col-span-2">
          <label class="text-sm font-medium">关键词 (逗号分隔)</label>
          <input v-model="keysText" class="w-full mt-1 px-2 py-1 border rounded text-sm" placeholder="如：苹果, banana, regex:.*test.*">
        </div>
        <div>
          <label class="text-sm font-medium">位置</label>
          <select v-model="form.position" class="w-full mt-1 px-2 py-1 border rounded text-sm">
            <option value="global_note">系统提示（注入到 system prompt）</option>
            <option value="before_character">角色前</option>
            <option value="after_character">角色后</option>
            <option value="at_depth">按深度（at_depth）</option>
            <option value="user_only">仅用户消息</option>
            <option value="assistant_only">仅 AI 消息</option>
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
          <label class="text-sm font-medium">深度 (at_depth 时生效)</label>
          <input v-model.number="form.depth" type="number" min="0" class="w-full mt-1 px-2 py-1 border rounded text-sm">
        </div>
        <div>
          <label class="text-sm font-medium">排序权重</label>
          <input v-model.number="form.order" type="number" class="w-full mt-1 px-2 py-1 border rounded text-sm">
        </div>
        <div>
          <label class="text-sm font-medium">触发概率 (%)</label>
          <input v-model.number="form.probability" type="number" min="0" max="100" class="w-full mt-1 px-2 py-1 border rounded text-sm">
        </div>
        <div>
          <label class="text-sm font-medium">分组</label>
          <input v-model="form.group" class="w-full mt-1 px-2 py-1 border rounded text-sm">
        </div>
        <div class="col-span-2 flex flex-wrap gap-3 mt-2">
          <label class="flex items-center gap-1 text-sm">
            <input type="checkbox" v-model="form.constant"> 常驻（忽略关键词）
          </label>
          <label class="flex items-center gap-1 text-sm">
            <input type="checkbox" v-model="form.useRegex"> 关键词使用正则
          </label>
          <label class="flex items-center gap-1 text-sm">
            <input type="checkbox" v-model="form.caseSensitive"> 区分大小写
          </label>
        </div>
        <div class="col-span-2">
          <label class="text-sm font-medium">内容</label>
          <textarea v-model="form.content" class="w-full mt-1 px-2 py-1 border rounded text-sm h-32 font-mono" />
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
import { reactive, ref, watch } from 'vue'

export default {
  name: 'WorldInfoEditorModal',
  props: {
    open: { type: Boolean, default: false },
    entry: { type: Object, required: true },
    isNew: { type: Boolean, default: false },
  },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    const form = reactive({
      id: null, comment: '', content: '', key: [], position: 'global_note', scope: 'global',
      depth: 4, order: 100, probability: 100, group: '',
      constant: false, useRegex: false, caseSensitive: false, enabled: true,
    })
    const keysText = ref('')

    watch(() => props.entry, (e) => {
      Object.assign(form, {
        id: e.id, comment: e.comment, content: e.content, key: [...(e.key || [])],
        position: e.position, scope: e.scope, depth: e.depth, order: e.order,
        probability: e.probability, group: e.group, constant: e.constant,
        useRegex: e.useRegex, caseSensitive: e.caseSensitive, enabled: e.enabled,
      })
      keysText.value = (e.key || []).join(', ')
    }, { immediate: true, deep: true })

    function handleSave() {
      form.key = keysText.value.split(',').map(s => s.trim()).filter(Boolean)
      emit('save', { ...form })
    }

    return { form, keysText, handleSave }
  },
}
</script>
