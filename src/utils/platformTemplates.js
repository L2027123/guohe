/**
 * Platform adaptation templates & prompt generator
 * Supports: xiaohongshu (小红书), douyin (抖音)
 * More platforms can be added by extending PLATFORM_PROFILES
 */

export const PLATFORM_PROFILES = {
  xiaohongshu: {
    name: '小红书',
    maxChars: 1000,
    style: 'emoji丰富、分段清晰、口语化、收藏导向',
    structure: '痛点引入 → 干货清单 → 金句收尾 → 引导收藏',
    ctaTypes: ['收藏备用', '评论区见', '码住'],
    tagCount: 5,
    coverRatio: '3:4',
  },
  douyin: {
    name: '抖音',
    maxChars: 500,
    style: '开头3秒强钩子、节奏快、情绪饱满、口语化',
    structure: '钩子(3s) → 痛点共鸣(10s) → 解决方案(30s) → 情绪高潮(15s) → 引导互动(2s)',
    ctaTypes: ['点赞关注', '评论区告诉我', '转发给需要的人'],
    tagCount: 3,
    bgmSuggestion: true,
  },
}

/**
 * Generate adaptation prompt for a given platform
 * @param {object} analysisResult - The parsed analysis result from CompetitorAnalyzer
 * @param {string} platform - Platform key in PLATFORM_PROFILES
 * @param {object|null} styleDNA - User's style DNA (optional)
 * @returns {string} prompt text for callAI
 */
export function generateAdaptPrompt(analysisResult, platform, styleDNA) {
  const profile = PLATFORM_PROFILES[platform]
  if (!profile) throw new Error('Unknown platform: ' + platform)

  const tagInstruction =
    profile.tagCount > 0
      ? `生成 ${profile.tagCount} 个精准标签`
      : '不需要标签'

  const videoFields =
    platform === 'douyin'
      ? `"estimatedDuration": "预估时长",\n  "bgmSuggestion": "推荐BGM风格",`
      : ''

  const coverField =
    platform === 'xiaohongshu'
      ? `"coverPrompt": "封面图生成提示词（描述画面内容和文字）",`
      : ''

  return `你是一位顶级${profile.name}内容策略师。
请将以下爆款拆解结果，改写为符合${profile.name}平台算法偏好的完整内容。

【原始拆解结果】
${JSON.stringify(analysisResult, null, 2)}

【用户风格 DNA】
${styleDNA ? JSON.stringify(styleDNA, null, 2) : '未设定，使用通用风格'}

【平台要求】
- 字数限制：${profile.maxChars}字以内
- 风格特征：${profile.style}
- 结构要求：${profile.structure}
- 结尾引导：从以下选择最合适的 1-2 个：${profile.ctaTypes.join(' / ')}
- ${tagInstruction}

【输出格式】
请严格返回以下 JSON 格式（不要加 markdown 代码块标记）：
{
  "title": "标题",
  "content": "正文内容（含emoji和分段标记）",
  "hook": "开头钩子话术",
  "cta": "引导互动话术",
  "tags": ["标签1", "标签2"],
  ${videoFields}
  ${coverField}
}`
}

/**
 * Parse AI adaptation response into JSON
 * Handles cases where AI wraps output in markdown code blocks
 * @param {string} raw - Raw AI response text
 * @returns {object} parsed adaptation result
 */
export function parseAdaptResponse(raw) {
  let cleaned = raw.trim()
  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/```$/, '')
  }
  return JSON.parse(cleaned)
}
