// rphub-desktop/scripts/test-characterGenerator.mjs
// Manual test script for characterGenerator service.
// Run with: npm run test:generator
// Mocks global.fetch to feed synthetic SSE chunks; asserts parser behavior.

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS  ${name}`)
    passed++
  } catch (err) {
    console.error(`  FAIL  ${name}\n    ${err.message}`)
    failed++
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed')
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'assertEq'}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`)
  }
}

// ────────────────────────────────────────────────────────────
// MOCK FETCH HELPERS
// ────────────────────────────────────────────────────────────

/**
 * Build a fake Response that yields the given SSE chunks as a ReadableStream.
 * chunks: array of strings, each is a complete SSE event block (with "data: ..." lines)
 */
function sseResponse(chunks) {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    }
  })
  return { ok: true, status: 200, body }
}

function setFetchMock(chunksOrResponder) {
  globalThis.fetch = async (url, opts) => {
    if (typeof chunksOrResponder === 'function') return chunksOrResponder(url, opts)
    return sseResponse(chunksOrResponder)
  }
}

function restoreFetch() {
  delete globalThis.fetch
}

// ────────────────────────────────────────────────────────────
// PLACEHOLDER (real tests start in Task 3)
// ────────────────────────────────────────────────────────────

test('scaffold runs', () => {
  assertEq(1 + 1, 2, 'sanity')
})

// ────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
