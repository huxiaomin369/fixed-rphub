// src/services/builtinWorldInfo.js
// Built-in world info entries. Ported from web (assets/js/app.js lines 9630-9716).

import { normalizeWorldInfoEntry, isBuiltinWorldInfoName } from './worldInfoSchema.js'

const 自动生图 = normalizeWorldInfoEntry({
  comment: '自动生图',
  content: `<auto_image_gen>
当叙事到达具有视觉冲击力的关键场景时，AI 应主动生成 1-2 张配图以增强沉浸感。
输出格式：在正文中插入 @image@<英文 prompt>@imageEnd@ 标签。

标签生成规则：
1. 仅在场景具有以下特征时生成图片：情感强烈转折、视觉奇观、关键人物首次出现、亲密或暴力场景、空间/服装/光影有明显变化。
2. 不得为平淡对话、纯心理活动、纯叙述生成图片。
3. prompt 必须为英文，使用 Danbooru 风格标签（character、1girl/1boy、setting、pose、expression、clothing、action、lighting、camera angle、style tags），并以权重 \`(tag:1.2)\` 强调核心元素。
4. 角色一致性：若场景中含已建立的角色，使用角色名作为标签前缀（如 \`character:角色名\`）。
5. 视角：与用户视角一致（第二人称则使用 over-the-shoulder / POV；第三人称则使用 third-person framing）。
6. NSFW 标签必须完整：breasts、penis、pussy、oral、anal、sex、cum 等。
7. 每张图独立 prompt，长度 60-200 词；可用逗号或换行分隔标签。
8. 同一回复中最多 2 个 @image@ 标签；多张图时使用不同 prompt 表达不同角度或时刻。
9. 标签必须真实存在；禁止编造不存在于 Danbooru 词表中的标签。
10. 在每个 @image@ 标签前后保留空白行，确保解析器正确识别。

示例：
@image@
character:原神-甘雨, 1girl, long blue hair, blue horns, qipao, bare legs, sitting on balcony, looking at moon, night, soft moonlight, chinese architecture in background, full body, high quality, masterpiece
@imageEnd@
</auto_image_gen>`,
  key: [],          // empty keys = constant (always triggers when enabled)
  constant: true,
  position: 'at_depth',
  depth: 4,
  order: 100,
  enabled: false,   // user opts in via imageGen toggle
  scope: 'global',
  systemSeed: true,
})

export const BUILTIN_WORLD_INFO = [自动生图]
export const BUILTIN_WORLD_INFO_NAMES = new Set(BUILTIN_WORLD_INFO.map(e => e.comment))
export const AUTO_IMAGE_GEN_WI_NAME = '自动生图'

export { isBuiltinWorldInfoName }
