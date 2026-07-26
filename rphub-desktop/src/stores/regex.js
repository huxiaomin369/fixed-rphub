import { defineStore } from 'pinia'
import { ref } from 'vue'
import localforage from 'localforage'
import { ensureSeedRegex } from '../services/seedDefaults.js'
import { useCharacterStore } from './characters.js'

export const useRegexStore = defineStore('regex', () => {
  const regexScripts = ref([])
  const globalRegexScripts = ref([])
  const regexLoaded = ref(false)

  function normalizeRegexScript(script = {}, scope = 'character') {
    return {
      ...script,
      scriptName: script.scriptName || script.name || '',
      name: script.name || script.scriptName || '',
      content: String(script.content || ''),
      enabled: script.enabled !== false,
      scope: scope || 'character',
      runOnEdit: script.runOnEdit !== false,
      replaceString: script.replaceString || '',
      substituteRegex: script.substituteRegex || 0,
      minDepth: script.minDepth != null ? script.minDepth : null,
      maxDepth: script.maxDepth != null ? script.maxDepth : null
    }
  }

  async function loadRegex() {
    let combined = []
    try {
      const data = await localforage.getItem('regex')
      combined = (data || []).map(s => {
        // Backfill missing scope — default to 'character'
        const scope = s.scope === 'global' ? 'global' : 'character'
        return normalizeRegexScript(s, scope)
      })
    } catch (err) {
      console.error('Failed to load regex scripts:', err)
      combined = []
    }

    // Merge built-in seeds (idempotent)
    const merged = ensureSeedRegex(combined)

    // Split into character and global arrays
    regexScripts.value = merged.filter(s => s.scope !== 'global')
    globalRegexScripts.value = merged.filter(s => s.scope === 'global')

    regexLoaded.value = true
  }

  async function saveRegex() {
    try {
      const combined = [...regexScripts.value, ...globalRegexScripts.value]
      await localforage.setItem('regex', combined)
    } catch (err) {
      console.error('Failed to save regex scripts:', err)
    }
  }

  async function saveGlobalRegex() {
    // Deprecated — global entries are saved as part of saveRegex()
    await saveRegex()
  }

  function addRegexScript(script) {
    // Default scope: 'character' if a character is loaded, otherwise 'global'
    const charStore = useCharacterStore()
    const scope = charStore.currentCharacter ? 'character' : 'global'
    const entry = normalizeRegexScript(script, scope)
    if (scope === 'global') {
      globalRegexScripts.value.push(entry)
    } else {
      regexScripts.value.push(entry)
    }
  }

  function removeRegexScript(index) {
    if (index >= 0 && index < regexScripts.value.length) {
      if (regexScripts.value[index].systemSeed === true) return
      regexScripts.value.splice(index, 1)
    }
  }

  function updateRegexScript(index, data) {
    if (index >= 0 && index < regexScripts.value.length) {
      regexScripts.value[index] = normalizeRegexScript({ ...regexScripts.value[index], ...data }, 'character')
    }
  }

  function moveRegexScript(fromIndex, toIndex) {
    if (fromIndex >= 0 && fromIndex < regexScripts.value.length &&
        toIndex >= 0 && toIndex < regexScripts.value.length) {
      const item = regexScripts.value.splice(fromIndex, 1)[0]
      regexScripts.value.splice(toIndex, 0, item)
    }
  }

  function addGlobalRegexScript(script) {
    globalRegexScripts.value.push(normalizeRegexScript(script, 'global'))
  }

  function removeGlobalRegexScript(index) {
    if (index >= 0 && index < globalRegexScripts.value.length) {
      if (globalRegexScripts.value[index].systemSeed === true) return
      globalRegexScripts.value.splice(index, 1)
    }
  }

  function updateGlobalRegexScript(index, data) {
    if (index >= 0 && index < globalRegexScripts.value.length) {
      globalRegexScripts.value[index] = normalizeRegexScript({ ...globalRegexScripts.value[index], ...data }, 'global')
    }
  }

  return {
    regexScripts,
    globalRegexScripts,
    regexLoaded,
    loadRegex,
    saveRegex,
    saveGlobalRegex,
    addRegexScript,
    removeRegexScript,
    updateRegexScript,
    moveRegexScript,
    addGlobalRegexScript,
    removeGlobalRegexScript,
    updateGlobalRegexScript
  }
})
