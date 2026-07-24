<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <div class="flex items-center">
        <button @click="ui.toggleMobileMenu"
          class="md:hidden mr-3 text-gray-500 md:hover:text-gray-700 active:text-gray-700 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
          </svg>
        </button>
        <h2 class="text-lg font-bold text-gray-800 flex items-center">
          <svg class="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
          世界书
        </h2>
      </div>
      <div class="flex items-center gap-2">
        <!-- Import -->
        <label class="cursor-pointer p-2.5 bg-white hover:bg-gray-50 text-gray-600 rounded-xl border border-gray-200 transition-all shadow-sm hover:shadow-md active:scale-95" title="导入">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          <input type="file" accept=".json" @change="handleImport" class="hidden">
        </label>
        <!-- Create -->
        <button @click="handleCreate"
          class="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-sm font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          新建
        </button>
      </div>
    </div>

    <!-- Scrollable body -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Global World Info Section -->
      <div class="mb-6">
        <div class="bg-white/70 backdrop-blur-sm p-1 rounded-2xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
          <button @click="showSettings = !showSettings"
            :class="['w-full flex justify-between items-center px-4 py-3 rounded-xl transition-all font-bold',
                     showSettings ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50']">
            <span class="flex items-center">
              <div :class="['p-1.5 rounded-lg mr-3 transition-colors', showSettings ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500']">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
                </svg>
              </div>
              全局世界信息/知识书激活设置
            </span>
            <svg :class="{'rotate-180': showSettings}" class="w-5 h-5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          <div v-show="showSettings" class="p-4 pt-3 border-t border-gray-100 animate-fade-in">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 text-sm">
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="font-medium text-gray-600">扫描深度</label>
                  <span class="text-primary-600 font-mono bg-primary-50 px-2 py-0.5 rounded">{{ store.worldInfoSettings.scanDepth }}</span>
                </div>
                <input type="range" v-model.number="store.worldInfoSettings.scanDepth" min="0" max="20"
                  @change="store.saveWorldInfoSettings()"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600">
              </div>
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="font-medium text-gray-600">最大扫描深度</label>
                  <span class="text-primary-600 font-mono bg-primary-50 px-2 py-0.5 rounded">{{ store.worldInfoSettings.maxDepth }}</span>
                </div>
                <input type="range" v-model.number="store.worldInfoSettings.maxDepth" min="0" max="50"
                  @change="store.saveWorldInfoSettings()"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- World Info List -->
      <div v-if="store.worldInfo.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-400">
        <div class="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
          <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
        </div>
        <p class="font-medium mb-1">还没有世界书条目</p>
        <p class="text-sm">点击「新建」创建世界书条目</p>
      </div>

      <div v-else ref="sortableEl" class="space-y-3">
        <div v-for="(entry, index) in store.worldInfo" :key="(entry.comment || '') + '_' + index"
          class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex justify-between items-center wi-drag-handle">
          <div class="flex-1 min-w-0 mr-4 flex items-center">
            <div class="cursor-move text-gray-400 mr-3 hover:text-gray-600 flex-shrink-0" title="拖动排序">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
              </svg>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-gray-800 truncate">{{ entry.comment || '未命名条目' }}</h3>
                <span class="hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0"
                  :class="entry.scope === 'global' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'">
                  {{ entry.scope === 'global' ? '全局' : '绑定' }}
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-0.5 truncate">{{ entry.content ? entry.content.substring(0, 80) : '' }}{{ entry.content && entry.content.length > 80 ? '...' : '' }}</p>
              <p v-if="entry.key && entry.key.length" class="text-xs text-primary-500 mt-0.5">
                {{ entry.key.length }} 个关键词
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" :checked="entry.enabled" @change="toggleEnabled(index, $event.target.checked)" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
            <div class="flex gap-1 border-l border-gray-200 pl-3">
              <button @click="handleEdit(index)" class="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="编辑">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button @click="handleDelete(index)" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- World Info Editor Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showEditor" class="fixed inset-0 z-[60] flex items-center justify-center p-4" @click.self="showEditor = false">
          <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-3xl bg-white rounded-2xl border border-gray-200 shadow-2xl max-h-[94vh] overflow-hidden">
            <!-- Header -->
            <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-sm">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-primary-50 text-primary-600 rounded-lg">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-800">{{ editingIndex >= 0 ? '编辑世界书' : '新建世界书' }}</h3>
                  <p class="text-xs text-gray-500">世界书条目</p>
                </div>
              </div>
              <button @click="showEditor = false" class="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="p-6 space-y-6 bg-gray-50/30 overflow-y-auto" style="max-height: calc(94vh - 140px);">
              <!-- Basic Info & Trigger -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                  <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">名称/备注 (Comment)</label>
                    <input v-model="editingData.comment" type="text"
                      class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none transition-all shadow-sm font-medium"
                      placeholder="例如：主城描述">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">作用范围</label>
                    <select v-model="editingData.scope"
                      class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none transition-all shadow-sm font-medium">
                      <option value="character">绑定（跟随角色）</option>
                      <option value="global">全局</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">主关键词 (Keys)</label>
                    <div class="relative">
                      <input :value="keysText" @input="updateKeys($event.target.value)" type="text"
                        class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none transition-all shadow-sm"
                        placeholder="逗号分隔，留空则需勾选「常驻」">
                    </div>
                    <div v-if="editingData.key && editingData.key.length" class="mt-2 flex flex-wrap gap-1.5">
                      <span v-for="(key, kidx) in editingData.key" :key="'wi-key-' + kidx"
                        :title="key"
                        class="inline-flex items-center max-w-full rounded-xl border border-primary-100 bg-primary-50 px-2.5 py-1.5 text-xs font-bold text-primary-700 shadow-sm">
                        <span :class="editingData.useRegex ? 'break-all whitespace-normal leading-relaxed' : 'truncate'">{{ key }}</span>
                      </span>
                    </div>
                  </div>
                  <!-- Match Strategy -->
                  <div class="flex flex-wrap gap-2">
                    <label :class="['flex-1 flex items-center justify-center gap-1.5 cursor-pointer px-3 py-1.5 border rounded-xl transition-all select-none shadow-sm active:scale-95',
                                   editingData.useRegex ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300']">
                      <input type="checkbox" v-model="editingData.useRegex" class="hidden">
                      <svg v-if="editingData.useRegex" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span class="text-xs font-bold">正则匹配</span>
                    </label>
                    <label :class="['flex-1 flex items-center justify-center gap-1.5 cursor-pointer px-3 py-1.5 border rounded-xl transition-all select-none shadow-sm active:scale-95',
                                   editingData.constant ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300']"
                      title="常驻条目无需关键词触发，启用后始终插入">
                      <input type="checkbox" v-model="editingData.constant" class="hidden">
                      <svg v-if="editingData.constant" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span class="text-xs font-bold">始终常驻</span>
                    </label>
                  </div>
                </div>

                <!-- Right: Position & Probability -->
                <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
                  <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">插入位置</label>
                    <select v-model="editingData.position"
                      class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none transition-all shadow-sm font-medium text-sm">
                      <option value="global_note">全局备注</option>
                      <option value="before_character">角色定义前</option>
                      <option value="after_character">角色定义后</option>
                      <option value="at_depth">指定深度</option>
                      <option value="user_only">仅用户消息</option>
                      <option value="assistant_only">仅AI消息</option>
                    </select>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">顺序</label>
                      <input type="number" v-model.number="editingData.order"
                        class="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        placeholder="100">
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">触发概率 (%)</label>
                      <div :class="['flex items-center border rounded-xl transition-all overflow-hidden shadow-sm',
                                   editingData.useProbability ? 'border-primary-300 ring-2 ring-primary-500/10' : 'border-gray-200 opacity-60']">
                        <button @click="editingData.useProbability = !editingData.useProbability"
                          :class="['px-3 py-2 transition-colors border-r',
                                   editingData.useProbability ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-100 text-gray-400 border-gray-200']">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                          </svg>
                        </button>
                        <input type="number" v-model.number="editingData.probability" min="0" max="100"
                          class="w-full bg-white px-3 py-1.5 text-sm font-bold text-gray-700 focus:outline-none"
                          :disabled="!editingData.useProbability" placeholder="100">
                      </div>
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">自定义扫描深度</label>
                    <input type="number" v-model.number="editingData.scanDepth"
                      class="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      placeholder="默认">
                  </div>
                  <div v-if="editingData.position === 'at_depth'" class="pt-2 border-t border-gray-100">
                    <label class="block text-xs text-gray-500 mb-1">插入深度 <span class="text-[10px] text-gray-400">@D</span></label>
                    <input type="number" v-model.number="editingData.depth"
                      class="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      placeholder="4">
                  </div>
                </div>
              </div>

              <!-- Content -->
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 flex justify-between">
                  <span>内容</span>
                  <span class="text-[10px] font-normal normal-case bg-gray-100 px-1.5 rounded text-gray-500">{{ (editingData.content || '').length }} 字符</span>
                </label>
                <textarea v-model="editingData.content" rows="12"
                  class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none text-sm shadow-inner leading-relaxed resize-y min-h-[260px]"
                  placeholder="在此输入世界书条目的具体内容..."></textarea>
              </div>
            </div>

            <!-- Footer -->
            <div class="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/80 backdrop-blur-sm">
              <button @click="showEditor = false"
                class="px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl transition-all shadow-sm font-medium text-sm active:scale-95">取消</button>
              <button @click="handleSave"
                class="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-bold text-sm active:scale-95 flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                保存条目
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Delete Confirmation -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showDeleteConfirm" class="fixed inset-0 z-[70] flex items-center justify-center p-4" @click.self="showDeleteConfirm = false">
          <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden p-6">
            <div class="text-center">
              <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-800 mb-2">确认删除</h3>
              <p class="text-sm text-gray-500 mb-6">确定要删除世界书条目「{{ deleteTargetName }}」吗？</p>
              <div class="flex items-center justify-center gap-3">
                <button @click="showDeleteConfirm = false"
                  class="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors">取消</button>
                <button @click="confirmDelete"
                  class="px-5 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium shadow-sm">确认删除</button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useWorldInfoStore } from '../stores/worldinfo'
import { useUIStore } from '../stores/ui'

export default {
  name: 'WorldInfoView',
  setup() {
    const store = useWorldInfoStore()
    const ui = useUIStore()

    const sortableEl = ref(null)
    const showEditor = ref(false)
    const showSettings = ref(false)
    const showDeleteConfirm = ref(false)
    const editingIndex = ref(-1)
    const editingData = ref({})
    const deleteTargetIndex = ref(-1)
    const deleteTargetName = ref('')
    const keysText = ref('')

    let sortableInstance = null

    const defaultEntry = {
      comment: '',
      content: '',
      key: [],
      enabled: true,
      position: 'global_note',
      scope: 'character',
      useRegex: false,
      caseSensitive: true,
      constant: false,
      selectiveLogic: 'or',
      group: '',
      note: '',
      groupOverride: false,
      scanDepth: null,
      order: 0,
      useProbability: false,
      probability: 100,
      depth: 4,
      disableAddedEntryNotifications: false
    }

    async function initSortable() {
      await nextTick()
      if (!sortableEl.value) return
      try {
        const Sortable = (await import('sortablejs')).default
        sortableInstance = new Sortable(sortableEl.value, {
          animation: 200,
          handle: '.wi-drag-handle',
          ghostClass: 'opacity-40',
          dragClass: '!shadow-xl !scale-105 !z-50',
          onEnd: (evt) => {
            store.moveWorldInfoEntry(evt.oldIndex, evt.newIndex)
            store.saveWorldInfo()
          }
        })
      } catch (err) {
        console.warn('SortableJS init failed:', err)
      }
    }

    function destroySortable() {
      if (sortableInstance) {
        sortableInstance.destroy()
        sortableInstance = null
      }
    }

    function parseKeys(text) {
      return text ? text.split(',').map(k => k.trim()).filter(Boolean) : []
    }

    function updateKeys(value) {
      keysText.value = value
      editingData.value.key = parseKeys(value)
    }

    function handleCreate() {
      editingIndex.value = -1
      editingData.value = { ...defaultEntry }
      keysText.value = ''
      showEditor.value = true
    }

    function handleEdit(index) {
      const entry = store.worldInfo[index]
      editingIndex.value = index
      editingData.value = { ...entry }
      keysText.value = (entry.key || []).join(', ')
      showEditor.value = true
    }

    function handleSave() {
      const data = { ...editingData.value }
      data.key = parseKeys(keysText.value)
      if (editingIndex.value >= 0) {
        store.updateWorldInfoEntry(editingIndex.value, data)
      } else {
        store.addWorldInfoEntry(data)
      }
      store.saveWorldInfo()
      showEditor.value = false
      ui.addToast(editingIndex.value >= 0 ? '世界书条目已更新' : '世界书条目已创建', 'success')
    }

    function handleDelete(index) {
      deleteTargetIndex.value = index
      deleteTargetName.value = store.worldInfo[index].comment || '未命名条目'
      showDeleteConfirm.value = true
    }

    function confirmDelete() {
      if (deleteTargetIndex.value >= 0) {
        store.removeWorldInfoEntry(deleteTargetIndex.value)
        store.saveWorldInfo()
        ui.addToast(`已删除世界书条目「${deleteTargetName.value}」`, 'success')
      }
      showDeleteConfirm.value = false
      deleteTargetIndex.value = -1
      deleteTargetName.value = ''
    }

    function toggleEnabled(index, val) {
      store.updateWorldInfoEntry(index, { enabled: val })
      store.saveWorldInfo()
    }

    async function handleImport(e) {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const items = Array.isArray(data) ? data : [data]
        items.forEach(item => store.addWorldInfoEntry(item))
        await store.saveWorldInfo()
        ui.addToast(`成功导入 ${items.length} 个世界书条目`, 'success')
      } catch (err) {
        ui.addToast('导入失败：' + err.message, 'error')
      }
      e.target.value = ''
    }

    onMounted(async () => {
      if (!store.worldInfoLoaded) {
        await store.loadWorldInfo()
      }
      await initSortable()
    })

    onBeforeUnmount(() => {
      destroySortable()
    })

    watch(() => store.worldInfo?.length, async () => {
      destroySortable()
      await nextTick()
      await initSortable()
    })

    return {
      store,
      ui,
      sortableEl,
      showEditor,
      showSettings,
      showDeleteConfirm,
      editingIndex,
      editingData,
      deleteTargetName,
      keysText,
      updateKeys,
      handleCreate,
      handleEdit,
      handleSave,
      handleDelete,
      confirmDelete,
      toggleEnabled,
      handleImport
    }
  }
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
