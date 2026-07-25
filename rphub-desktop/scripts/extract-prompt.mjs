// One-shot script: extract singlePlayerSystemPrompt from web character/index.html
// and write it to desktop characterGenerator.js as SINGLE_PLAYER_SYSTEM_PROMPT.
// Resolves the ${options.generateExtra ? `...` : ''} conditional by inlining the truthy branch.

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const webFile = resolve(__dirname, '..', '..', 'character', 'index.html')
const desktopFile = resolve(__dirname, '..', 'src', 'services', 'characterGenerator.js')

const web = readFileSync(webFile, 'utf8')
const lines = web.split('\n')

// Find the start and end of the const declaration (lines 3744-3830 in the file).
// The const starts with "const singlePlayerSystemPrompt = `" and ends with `;` on a line
// whose content (stripped of indentation) ends with `;` and contains a closing backtick.
let startLine = -1
let endLine = -1
for (let i = 0; i < lines.length; i++) {
  if (/^[\s\S]*const\s+singlePlayerSystemPrompt\s*=\s*`/.test(lines[i])) {
    startLine = i
  }
  if (startLine >= 0 && /;\s*$/.test(lines[i]) && /`/.test(lines[i])) {
    endLine = i
    break
  }
}

if (startLine < 0 || endLine < 0) {
  console.error('Could not locate singlePlayerSystemPrompt in', webFile)
  process.exit(1)
}

console.log(`Located prompt at lines ${startLine + 1}..${endLine + 1}`)

// Concatenate the source content between (and including) those lines,
// EXCLUDING the `const singlePlayerSystemPrompt = ` prefix and the trailing `;`.
// Each line is one chunk of the template literal; the literal honors \n escapes.
const sourceContent = lines.slice(startLine, endLine + 1)
  .map(l => l.replace(/^[\s\S]*?const\s+singlePlayerSystemPrompt\s*=\s*`/, '').replace(/`\s*;?\s*$/, ''))
  .join('\n')

// Resolve the conditional: replace ${options.generateExtra ? `INNER` : ''} with INNER
// The conditional is the only ${...} expression in the prompt.
const conditionalRe = /\$\{options\.generateExtra\s*\?\s*`([\s\S]*?)`\s*:\s*''\}/
const match = sourceContent.match(conditionalRe)
if (!match) {
  console.error('Could not find the options.generateExtra conditional')
  process.exit(1)
}
const resolved = sourceContent.replace(conditionalRe, match[1])

// Now `resolved` is the prompt content (with the conditional inlined).
// It's a template-literal-style string with \n escapes; we keep that — template
// literals honor \n as newlines, so wrapping in backticks is correct.
const exportStmt = `/**
 * Single-player character card generation system prompt.
 * VERBATIM COPY of web version's \`singlePlayerSystemPrompt\` constant
 * (located in character/index.html near line 3744).
 * The web version gates the World Info / Regex Scripts block behind
 * \`options.generateExtra\`; the desktop version always inlines it
 * (the web sets \`options.generateExtra = true\` unconditionally).
 * Do NOT modify without testing against the web version.
 */
export const SINGLE_PLAYER_SYSTEM_PROMPT = \`${resolved}\`
`

// Prepend to the existing characterGenerator.js (the file already has the
// earlier exports from Tasks 3-7; the new const goes at the top).
const existing = readFileSync(desktopFile, 'utf8')
writeFileSync(desktopFile, exportStmt + existing)

console.log(`Wrote ${exportStmt.length} chars to ${desktopFile}`)
