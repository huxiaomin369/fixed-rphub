/**
 * 热门模型族，用于模型选择器的标签过滤。
 * 与网页版 assets/js/app.js:362 保持一致。
 */
export const POPULAR_MODEL_FAMILIES = [
  'claude',
  'gemini',
  'deepseek',
  'llama',
  'glm',
  'minimax',
  'moonshot',
  'grok'
]

/**
 * 根据模型列表构建标签计数。
 * 返回 [{ name, count, label }, ...]，顺序为：全部、匹配到的族（按字母序）、其他。
 */
export function buildModelTags(models = []) {
  const counts = { all: models.length, other: 0 }
  const familySet = new Set()

  models.forEach(m => {
    const id = String(m.id || '').toLowerCase()
    let found = false
    for (const family of POPULAR_MODEL_FAMILIES) {
      if (id.includes(family)) {
        familySet.add(family)
        counts[family] = (counts[family] || 0) + 1
        found = true
        break
      }
    }
    if (!found) counts.other++
  })

  const result = [{ name: 'all', count: counts.all, label: '全部' }]
  Array.from(familySet).sort().forEach(name => {
    result.push({ name, count: counts[name], label: name.toUpperCase() })
  })
  if (counts.other > 0) {
    result.push({ name: 'other', count: counts.other, label: '其他' })
  }
  return result
}

/**
 * 过滤并排序模型列表。
 */
export function filterModels(models = [], activeTag = 'all', query = '') {
  let result = [...models]

  if (activeTag && activeTag !== 'all') {
    if (activeTag === 'other') {
      result = result.filter(m => {
        const id = String(m.id || '').toLowerCase()
        return !POPULAR_MODEL_FAMILIES.some(family => id.includes(family))
      })
    } else {
      result = result.filter(m => String(m.id || '').toLowerCase().includes(activeTag))
    }
  }

  if (query) {
    const q = String(query).toLowerCase()
    result = result.filter(m => String(m.id || '').toLowerCase().includes(q))
  }

  return result.sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')))
}
