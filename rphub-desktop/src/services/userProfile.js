// rphub-desktop/src/services/userProfile.js
// 纯函数：人设 CRUD + 迁移 helpers，无 Vue/Pinia 依赖

function uuid() {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
}

export function createProfile(partial = {}) {
  return {
    uuid: uuid(),
    name: partial.name || '默认人设',
    description: partial.description || '',
    avatar: partial.avatar || '',
    person: partial.person === 'third' ? 'third' : 'second'
  }
}

/**
 * 如果传入数组为空，返回一个含默认 profile 的新数组；否则原样返回。
 */
export function ensureUserProfiles(arr) {
  if (Array.isArray(arr) && arr.length > 0) return arr
  return [createProfile()]
}

/**
 * 拼成 [User Info] 段，供 chat.js 注入到 system prompt
 */
export function buildUserInfoPrompt(user) {
  return ['[User Info]', `Name: ${user?.name || ''}`, `Description: ${user?.description || ''}`].join('\n')
}

/**
 * 切换人称：自动联动预设中的"第二人称"/"第三人称"两个条目的 enabled 字段
 * 返回新数组（不修改原数组）
 */
export function applyPersonToggle(presets, person) {
  if (!Array.isArray(presets)) return presets
  return presets.map(p => {
    if (p.name === '第二人称') return { ...p, enabled: person !== 'third' }
    if (p.name === '第三人称') return { ...p, enabled: person === 'third' }
    return p
  })
}

/**
 * 从旧版 settings.user 单对象迁移到新的 userProfiles 数组。
 * 返回 { profiles, activeProfileId }
 */
export function migrateLegacyUser(user) {
  const profile = createProfile({
    name: user?.name || '默认人设',
    description: user?.description || '',
    avatar: user?.avatar || '',
    person: user?.person || 'second'
  })
  return { profiles: [profile], activeProfileId: profile.uuid }
}
