import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import localforage from 'localforage'

export const useCharacterStore = defineStore('characters', () => {
  const characterList = ref([])
  const currentCharacterIndex = ref(-1)
  const charactersLoaded = ref(false)

  const currentCharacter = computed(() => {
    if (currentCharacterIndex.value >= 0 && currentCharacterIndex.value < characterList.value.length) {
      return characterList.value[currentCharacterIndex.value]
    }
    return null
  })

  function setCurrentCharacter(index) {
    currentCharacterIndex.value = index
  }

  function selectCharacter(card) {
    const idx = characterList.value.findIndex(c => c.id === card.id || c.uuid === card.uuid)
    if (idx >= 0) {
      setCurrentCharacter(idx)
    }
  }

  async function loadCharacters() {
    const data = await localforage.getItem('characters')
    characterList.value = data || []
    charactersLoaded.value = true
  }

  async function saveCharacters() {
    await localforage.setItem('characters', characterList.value)
  }

  function addCharacter(char) {
    characterList.value.push(char)
  }

  function removeCharacter(idx) {
    if (idx >= 0 && idx < characterList.value.length) {
      characterList.value.splice(idx, 1)
      if (currentCharacterIndex.value === idx) {
        currentCharacterIndex.value = -1
      } else if (currentCharacterIndex.value > idx) {
        currentCharacterIndex.value--
      }
    }
  }

  function updateCharacter(idx, data) {
    if (idx >= 0 && idx < characterList.value.length) {
      characterList.value[idx] = { ...characterList.value[idx], ...data }
    }
  }

  return {
    characterList,
    currentCharacterIndex,
    currentCharacter,
    charactersLoaded,
    setCurrentCharacter,
    selectCharacter,
    loadCharacters,
    saveCharacters,
    addCharacter,
    removeCharacter,
    updateCharacter
  }
})
