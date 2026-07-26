// rphub-desktop/scripts/test-settingsServices.mjs
// Mock-fetch tests for settings-related services.
// Run with: node scripts/test-settingsServices.mjs

let passed = 0, failed = 0
const testPromises = []
function test(name, fn) {
  testPromises.push((async () => {
    try {
      await fn()
      console.log(`  PASS  ${name}`)
      passed++
    } catch (err) {
      console.error(`  FAIL  ${name}\n    ${err.message}`)
      failed++
    }
  })())
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed')
}
function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'assertEq'}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`)
  }
}
function setFetchMock(responder) { globalThis.fetch = async (url, opts) => responder(url, opts) }
function restoreFetch() { delete globalThis.fetch }

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) }
}
function emptyResponse(status) {
  return { ok: status >= 200 && status < 300, status, json: async () => null, text: async () => '' }
}

test('scaffold runs', () => { assertEq(1 + 1, 2, 'sanity') })

// ─── connectionCheck (Task 1.2) ─────────────────────
import { checkApiConnection, checkImageGenConnection } from '../src/services/connectionCheck.js'

test('checkApiConnection returns connected on 200', async () => {
  setFetchMock(async (url) => {
    assertEq(url, 'https://api.example.com/v1/models', 'url should append /v1/models')
    return jsonResponse(200, { data: [] })
  })
  const r = await checkApiConnection({ baseURL: 'https://api.example.com/', apiKey: 'sk-test' })
  assertEq(r.status, 'connected', 'status')
  assert(typeof r.latency === 'number' && r.latency >= 0, 'latency is number')
  restoreFetch()
})

test('checkApiConnection does not double-append /v1', async () => {
  let called = ''
  setFetchMock(async (url) => { called = url; return jsonResponse(200, {}) })
  await checkApiConnection({ baseURL: 'https://api.example.com/v1/', apiKey: 'k' })
  assertEq(called, 'https://api.example.com/v1/models', 'no double /v1')
  restoreFetch()
})

test('checkApiConnection returns error on 401', async () => {
  setFetchMock(async () => jsonResponse(401, { error: 'unauthorized' }))
  const r = await checkApiConnection({ baseURL: 'https://api.example.com/v1', apiKey: 'bad' })
  assertEq(r.status, 'error', 'status on 401')
  restoreFetch()
})

test('checkApiConnection returns error on network failure', async () => {
  setFetchMock(async () => { throw new Error('network down') })
  const r = await checkApiConnection({ baseURL: 'https://api.example.com/v1', apiKey: 'k' })
  assertEq(r.status, 'error', 'status on throw')
  restoreFetch()
})

test('checkImageGenConnection uses HEAD on /images/generations', async () => {
  let calledMethod = '', calledUrl = ''
  setFetchMock(async (url, opts) => { calledMethod = opts.method; calledUrl = url; return emptyResponse(200) })
  const r = await checkImageGenConnection({ baseURL: 'https://ig.example.com/v1', apiKey: 'k' })
  assertEq(calledMethod, 'HEAD', 'HEAD method')
  assertEq(calledUrl, 'https://ig.example.com/v1/images/generations', 'url')
  assertEq(r.status, 'connected', 'status')
  restoreFetch()
})

test('checkImageGenConnection returns error on 4xx/5xx', async () => {
  setFetchMock(async () => emptyResponse(500))
  const r = await checkImageGenConnection({ baseURL: 'https://ig.example.com/v1', apiKey: 'k' })
  assertEq(r.status, 'error', 'status on 500')
  restoreFetch()
})

// ─── apiProviders (Task 1.1 sanity) ─────────────────
import { API_PROVIDERS, IMAGE_GEN_PROVIDERS, resolveActiveApiProvider, isCustomApiProviderId } from '../src/services/apiProviders.js'

test('API_PROVIDERS has 8 entries', () => {
  assertEq(API_PROVIDERS.length, 8, 'count')
})

test('IMAGE_GEN_PROVIDERS has 2 entries with defaultModel', () => {
  assertEq(IMAGE_GEN_PROVIDERS.length, 2, 'count')
  assert(IMAGE_GEN_PROVIDERS[0].defaultModel, 'first has defaultModel')
  assertEq(IMAGE_GEN_PROVIDERS[1].fixedSize, '1760x2368', 'sensenova fixedSize')
})

test('resolveActiveApiProvider returns builtin for agnes', () => {
  const s = { apiProviderId: 'agnes', apiProviderKeys: { agnes: 'sk-x' }, apiKey: 'sk-x' }
  const r = resolveActiveApiProvider(s)
  assertEq(r.id, 'agnes')
  assertEq(r.apiKey, 'sk-x')
  assertEq(r.isCustom, false)
  assertEq(r.apiUrl, 'https://apihub.agnes-ai.com/v1')
})

test('resolveActiveApiProvider returns custom for custom2', () => {
  const s = { apiProviderId: 'custom2', apiProviderKeys: { custom2: 'k' }, customApiUrl2: 'https://my.api/v1' }
  const r = resolveActiveApiProvider(s)
  assertEq(r.id, 'custom2')
  assertEq(r.apiUrl, 'https://my.api/v1')
  assertEq(r.isCustom, true)
})

test('isCustomApiProviderId handles custom/custom2', () => {
  assertEq(isCustomApiProviderId('custom'), true)
  assertEq(isCustomApiProviderId('custom2'), true)
  assertEq(isCustomApiProviderId('agnes'), false)
})

// ─── imageGen (Task 1.3) ─────────────────────────
import { IMAGE_STYLES, IMAGE_SIZES, sizeToDims, styleToArtists, generateImages } from '../src/services/imageGen.js'

test('IMAGE_STYLES has 7 entries with correct labels', () => {
  assertEq(IMAGE_STYLES.length, 7, 'count')
  assertEq(IMAGE_STYLES[0].value, 'vertical')
  assertEq(IMAGE_STYLES[0].label, '韩漫小清新风')
  assertEq(IMAGE_STYLES[6].value, 'custom')
  assertEq(IMAGE_STYLES[6].label, '自定义')
})

test('IMAGE_SIZES has 9 entries with correct labels', () => {
  assertEq(IMAGE_SIZES.length, 9, 'count')
  assertEq(IMAGE_SIZES[0].value, '竖图')
  assertEq(IMAGE_SIZES[0].label, '竖图(736x1312)')
  assertEq(IMAGE_SIZES[8].value, '4K方图')
  assertEq(IMAGE_SIZES[8].label, '4K方图(3456x2592)')
})

test('sizeToDims returns correct dims for known sizes', () => {
  assertEq(sizeToDims('竖图'), '736x1312')
  assertEq(sizeToDims('横图'), '1312x736')
  assertEq(sizeToDims('方图'), '1152x864')
  assertEq(sizeToDims('2K竖图'), '1472x2624')
  assertEq(sizeToDims('4K方图'), '3456x2592')
})

test('sizeToDims returns default for unknown or undefined', () => {
  assertEq(sizeToDims('unknown'), '736x1312')
  assertEq(sizeToDims(''), '736x1312')
  assertEq(sizeToDims(undefined), '736x1312')
})

test('styleToArtists returns artist string for known styles', () => {
  const comicDoujin = styleToArtists('comicDoujin')
  assert(comicDoujin.length > 0, 'comicDoujin should be non-empty')
  assert(comicDoujin.includes('masterpiece'), 'comicDoujin contains masterpiece')

  const anime = styleToArtists('anime')
  assert(anime.includes('asanagi'), 'anime contains asanagi')

  const r18 = styleToArtists('r18')
  assert(r18.includes('misaka'), 'r18 contains misaka')
})

test('styleToArtists for vertical returns default artist tags', () => {
  const a = styleToArtists('vertical', '')
  assert(a.includes('dishwasher1910'), 'vertical should include defaultArtists')
})

test('styleToArtists returns custom or empty for unknown', () => {
  assertEq(styleToArtists('custom', 'my artist'), 'my artist')
  assertEq(styleToArtists('custom', ''), '')
  assertEq(styleToArtists('custom', '  trimmed  '), 'trimmed')
  assertEq(styleToArtists('nonexistent'), '')
})

test('generateImages POSTs and returns dataURLs', async () => {
  let calledUrl = ''
  let calledHeaders = {}
  setFetchMock(async (url, opts) => {
    calledUrl = url
    calledHeaders = opts.headers
    const body = JSON.parse(opts.body)
    assertEq(opts.method, 'POST', 'POST method')
    assertEq(body.model, 'test-model')
    assertEq(body.n, 1)
    assertEq(body.response_format, 'b64_json')
    assertEq(body.size, '竖图')
    assert(body.prompt, 'has prompt')
    return jsonResponse(200, { data: [{ b64_json: 'abc123' }] })
  })
  const result = await generateImages({
    baseURL: 'https://api.example.com/v1',
    apiKey: 'sk-test',
    model: 'test-model',
    prompt: 'a cat',
    size: '竖图',
    n: 1
  })
  assertEq(result.length, 1, '1 image returned')
  assert(result[0].url.startsWith('data:image/png;base64,'), 'dataURL prefix')
  assertEq(result[0].prompt, 'a cat')
  assert(calledUrl.endsWith('/images/generations'), 'url ends with /images/generations')
  assertEq(calledHeaders['Authorization'], 'Bearer sk-test', 'auth header')
  restoreFetch()
})

test('generateImages throws on non-200', async () => {
  setFetchMock(async () => jsonResponse(400, { error: 'bad request' }))
  let threw = false
  try {
    await generateImages({ baseURL: 'https://api.example.com/v1', apiKey: 'k', model: 'm', prompt: 'p', size: '竖图' })
  } catch (e) {
    threw = true
    assert(e.message.includes('ImageGen 400'), 'error message includes status')
  }
  assert(threw, 'should throw on 4xx')
  restoreFetch()
})

// ─── userProfile (Task 1.4) ──────────────────────────
import { createProfile, ensureUserProfiles, buildUserInfoPrompt, applyPersonToggle, migrateLegacyUser } from '../src/services/userProfile.js'

test('createProfile returns defaults and applies partial overrides', () => {
  // defaults
  const def = createProfile()
  assert(typeof def.uuid === 'string' && def.uuid.startsWith('p_'), 'uuid starts with p_')
  assertEq(def.name, '默认人设', 'default name')
  assertEq(def.description, '', 'default description')
  assertEq(def.avatar, '', 'default avatar')
  assertEq(def.person, 'second', 'default person')
  // partial override
  const ovr = createProfile({ name: '小明', person: 'third' })
  assertEq(ovr.name, '小明', 'overridden name')
  assertEq(ovr.person, 'third', 'overridden person')
  assertEq(ovr.description, '', 'description still default')
})

test('ensureUserProfiles returns default array when empty', () => {
  const result = ensureUserProfiles([])
  assertEq(result.length, 1, 'one default profile')
  assert(result[0].uuid && result[0].name === '默认人设', 'default profile content')
})

test('ensureUserProfiles returns input array as-is when non-empty', () => {
  const input = [{ uuid: 'c1', name: 'existing' }]
  const result = ensureUserProfiles(input)
  assertEq(result, input, 'same reference returned')
})

test('buildUserInfoPrompt formats correctly and handles empty fields', () => {
  const r1 = buildUserInfoPrompt({ name: '小明', description: '测试' })
  assertEq(r1, '[User Info]\nName: 小明\nDescription: 测试', 'filled fields')
  const r2 = buildUserInfoPrompt({})
  assertEq(r2, '[User Info]\nName: \nDescription: ', 'empty fields')
})

test('applyPersonToggle enables second person and disables third when person=second', () => {
  const presets = [
    { name: '第二人称', enabled: false },
    { name: '第三人称', enabled: true },
    { name: '无关预设', enabled: true }
  ]
  const result = applyPersonToggle(presets, 'second')
  // original unchanged
  assertEq(presets[0].enabled, false, 'original not mutated')
  // result correct
  assertEq(result[0].enabled, true, '第二人称 enabled')
  assertEq(result[1].enabled, false, '第三人称 disabled')
  assertEq(result[2].enabled, true, '无关预设 unchanged')
  assert(result !== presets, 'new array')
})

test('applyPersonToggle enables third person and disables second when person=third', () => {
  const presets = [
    { name: '第二人称', enabled: true },
    { name: '第三人称', enabled: false }
  ]
  const result = applyPersonToggle(presets, 'third')
  assertEq(result[0].enabled, false, '第二人称 disabled')
  assertEq(result[1].enabled, true, '第三人称 enabled')
  assert(result !== presets, 'new array')
})

test('migrateLegacyUser converts legacy user and handles undefined', () => {
  const legacy = { name: '小明', description: '测试', avatar: 'abc.jpg', person: 'third' }
  const r1 = migrateLegacyUser(legacy)
  assertEq(r1.profiles.length, 1, 'one profile')
  assert(typeof r1.profiles[0].uuid === 'string' && r1.profiles[0].uuid.startsWith('p_'), 'uuid')
  assertEq(r1.profiles[0].name, '小明', 'name')
  assertEq(r1.profiles[0].person, 'third', 'person')
  assertEq(r1.activeProfileId, r1.profiles[0].uuid, 'activeProfileId matches')
  // undefined
  const r2 = migrateLegacyUser(undefined)
  assertEq(r2.profiles.length, 1, 'one profile')
  assertEq(r2.profiles[0].name, '默认人设', 'default name')
  assertEq(r2.activeProfileId, r2.profiles[0].uuid, 'activeProfileId matches')
})

// ─── Runner ─────────────────────────────────────────
import { fileURLToPath } from 'node:url'
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  Promise.allSettled(testPromises).then(() => {
    console.log(`\nResults: ${passed} passed, ${failed} failed`)
    process.exit(failed > 0 ? 1 : 0)
  })
}
export { passed, failed }
