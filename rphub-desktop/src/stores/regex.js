import { defineStore } from 'pinia'
import { ref } from 'vue'
import localforage from 'localforage'

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
    try {
      const data = await localforage.getItem('regex')
      regexScripts.value = (data || []).map(s => normalizeRegexScript(s, 'character'))
    } catch (err) {
      console.error('Failed to load regex scripts:', err)
      regexScripts.value = []
    }

    try {
      const data = await localforage.getItem('global_regex')
      globalRegexScripts.value = (data || []).map(s => normalizeRegexScript(s, 'global'))
    } catch (err) {
      console.error('Failed to load global regex scripts:', err)
      globalRegexScripts.value = []
    }

    regexLoaded.value = true
  }

  async function saveRegex() {
    try {
      await localforage.setItem('regex', regexScripts.value)
    } catch (err) {
      console.error('Failed to save regex scripts:', err)
    }
  }

  async function saveGlobalRegex() {
    try {
      await localforage.setItem('global_regex', globalRegexScripts.value)
    } catch (err) {
      console.error('Failed to save global regex scripts:', err)
    }
  }

  function addRegexScript(script) {
    regexScripts.value.push(normalizeRegexScript(script, 'character'))
  }

  function removeRegexScript(index) {
    if (index >= 0 && index < regexScripts.value.length) {
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
