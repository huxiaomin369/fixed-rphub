// rphub-desktop/src/services/imageGen.js
// 纯函数：文生图 fetch + 风格/尺寸映射
// STYLE_ARTISTS 来自网页版 assets/js/app.js:9443-9458（原文在 9461-9473 的条件分支中引用）
// SIZE_DIMS 来自网页版 IMAGE_GEN_SIZE_MAP（同一文件）

export const IMAGE_STYLES = [
  { value: 'vertical',    label: '韩漫小清新风' },
  { value: 'comicDoujin', label: '动漫同人风' },
  { value: 'r18',         label: '2.5D唯美风' },
  { value: 'lolita25d',   label: '2.5D唯美风（萝）' },
  { value: 'anime',       label: '本子里番风' },
  { value: 'galgame',     label: 'GalGame风' },
  { value: 'custom',      label: '自定义' }
]

export const IMAGE_SIZES = [
  { value: '竖图',   label: '竖图(736x1312)' },
  { value: '横图',   label: '横图(1312x736)' },
  { value: '方图',   label: '方图(1152x864)' },
  { value: '2K竖图', label: '2K竖图(1472x2624)' },
  { value: '2K横图', label: '2K横图(2624x1472)' },
  { value: '2K方图', label: '2K方图(2304x1728)' },
  { value: '4K竖图', label: '4K竖图(2208x3936)' },
  { value: '4K横图', label: '4K横图(3648x2048)' },
  { value: '4K方图', label: '4K方图(3456x2592)' }
]

const SIZE_DIMS = {
  '竖图':   '736x1312',
  '横图':   '1312x736',
  '方图':   '1152x864',
  '2K竖图': '1472x2624',
  '2K横图': '2624x1472',
  '2K方图': '2304x1728',
  '4K竖图': '2208x3936',
  '4K横图': '3648x2048',
  '4K方图': '3456x2592'
}

export function sizeToDims(sizeValue) {
  return SIZE_DIMS[sizeValue] || '736x1312'
}

/**
 * 风格 → 艺术家标签字符串。
 * 下面 5 个值从网页版 assets/js/app.js:9443-9458 整段复制。
 * 来源：const comicDoujinArtists / r18Artists / lolita25dArtists / animeArtists / galgameArtists
 * 如果 style === 'custom'，返回 customArtists。
 */
const STYLE_ARTISTS = {
  // 来源 app.js:9443 (const comicDoujinArtists)
  comicDoujin: 'masterpiece, best quality, very aesthetic, modern Japanese anime, official anime art, anime key visual, anime screencap, soft cel shading, soft anime coloring, smooth color transitions, natural skin tones, restrained color palette, slightly desaturated, muted colors, soft ambient lighting, gentle contrast, subtle gradients, subtle bloom, detailed anime background',

  // 来源 app.js:9444-9445 (const r18Artists 模板字面量，含换行)
  r18: `0.9::misaka_12003-gou ::, dino_(dinoartforame), wanke, liduke, year 2025, realistic, 4k, -2::green ::, textless version, The image is highly intricate finished drawn. Only the character's face is in anime style, but their body is in realistic style. 1.35::A highly finished photo-style artwork that has lively color, graphic texture, realistic skin surface, and lifelike flesh with little obliques::. 1.63::photorealistic::, 1.63::photo(medium)::,
20::best quality, absurdres, very aesthetic, detailed, masterpiece::,, very aesthetic, masterpiece, no text,`,

  // 来源 app.js:9446-9456 (const lolita25dArtists 模板字面量，含多行换行)
  lolita25d: `20::best quality, absurdres, very aesthetic, detailed, masterpiece::, 20::highly finished::, 10::ultra detailed::, 5::masterpiece::, 5::best quality::,

2.4::kidmo::, 1.2::omone hokoma agm::, 1.1::dino, wanke, liduke::, 0.8::rurudo, mignon, artist:pottsness, artist:toosaka asagi::, 0.7::misaka_12003-gou::, 0.6::artist:chocoan, artist:ciloranko, artist:rhasta, artist:sho_sho_lwlw::, dino_(dinoartforame), agoto, akakura, 0.9::rurudo(Only body shape), mignon(Only body shape) ::

year 2025, textless version, {{petite,loli}}, Petite figure, no text, The image is highly intricate finished drawn. Only the character's face is in anime style, but their body is in realistic style. 1.35::A highly finished photo-style artwork that has graphic texture, realistic skin surface, and lifelike flesh with little obliques::, smooth line, glossy skin, realistic, 4k,

1.63::photorealistic::, 1.63::photo(medium)::, 3::simple background::, 2::depth of field::,

1.5::vivid color, lively color::, desaturated, muted tones, cinematic desaturation, pale aesthetic, silver-toned,

-2::green::, -1.5::vibrant, colorful, saturated::`,

  // 来源 app.js:9457 (const animeArtists)
  anime: '1.4::asanagi::,{{{{{artist:asanagi}}}}},1.2::xiaoluo_xl::,1.3::Artist: misaka_12003-gou::,1.2::Artist:shexyo::,0.7::Artist:b.sa_(bbbs)::,1::Artist:qiandaiyiyu::,1.05::artist:natedecock::,1.05::artist:kunaboto::,0.75::artist:kandata_nijou::,1.05::artist:zer0.zer0 ::,1.05::artist:jasony::,0.75::misaka_12003-gou ::, dino_(dinoartforame), wanke, liduke, year 2025, realistic, 4k, -2::green ::, {textless version, The image is highly intricate finished drawn,write realistically,true to life}, 1.35::A highly finished photo-style artwork that has lively color, graphic texture, realistic skin surface, and lifelike flesh with little obliques::, 1.63::photorealistic::,3::age slider::,1.63::photo(medium)::, 2::best quality, absurdres, very aesthetic, detailed, masterpiece::,-4::Muscle definition, abs::',

  // 来源 app.js:9458 (const galgameArtists)
  galgame: 'artist:ningen_mame,, noyu_(noyu23386566),, toosaka asagi,, location,\\n20::best quality, absurdres, very aesthetic, detailed, masterpiece::,:,, very aesthetic, masterpiece, no text,'
}

export function styleToArtists(style, customArtists) {
  if (style === 'custom') return String(customArtists || '').trim()
  return STYLE_ARTISTS[style] || ''
}

import { normalizeProviderUrl } from './apiProviders.js'

/**
 * POST {baseURL}/images/generations
 * 解析 { data: [{ b64_json }] } → dataURL
 */
export async function generateImages({ baseURL, apiKey, model, prompt, size, n = 1, signal }) {
  const url = `${normalizeProviderUrl(baseURL)}/images/generations`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      n,
      response_format: 'b64_json'
    }),
    signal
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`ImageGen ${res.status}: ${err}`)
  }
  const data = await res.json()
  const list = Array.isArray(data?.data) ? data.data : []
  return list.map(item => ({
    url: `data:image/png;base64,${item.b64_json || ''}`,
    prompt
  }))
}
