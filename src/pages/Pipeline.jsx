import { getApiKey } from '../utils/apiKey'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { trackFirstContentGeneration, trackEvent } from '../utils/tracker'
import { usePageDwellTracking } from '../utils/usePageDwellTracking'
import {
  Settings,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  FileText,
  Wand2,
  Save,
  ArrowRight,
  FolderOpen,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Target,
  MessageCircle,
  TrendingUp,
  ShoppingBag,
  Tag,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { callAI, classifyAIError } from '../utils/aiClient'
import AIErrorBanner from '../components/AIErrorBanner'
import UpgradePrompt from '../components/UpgradePrompt'

const STEPS = [
  { id: 1, title: '选择选题', desc: '从已采纳选题中选择', icon: FileText },
  { id: 2, title: '风格匹配', desc: '匹配你的内容风格', icon: Wand2 },
  { id: 3, title: '策略设计', desc: '选择内容设计策略', icon: Target },
  { id: 4, title: 'AI 生成', desc: '基于策略生成内容草稿', icon: Sparkles },
  { id: 5, title: '合规检查', desc: '检测风险表达并优化', icon: ShieldCheck },
  { id: 6, title: '审核发布', desc: '确认并归档到资产库', icon: CheckCircle2 },
]

const CONTENT_GOALS = [
  { id: 'comments', label: '爆评论区', desc: '设计互动埋点，激发用户讨论', icon: '💬' },
  { id: 'growth', label: '涨粉', desc: '设计关注动机，让用户想看更多', icon: '📈' },
  { id: 'conversion', label: '种草转化', desc: '设计信任链路，推动购买决策', icon: '🛒' },
  { id: 'branding', label: '品牌建设', desc: '设计记忆点，强化账号辨识度', icon: '🏷️' },
]

// 通用合规检查规则
const COMPLIANCE_RULES = [
  {
    type: 'absolute',
    label: '绝对化表达',
    patterns: ['最', '第一', '唯一', '最佳', '最好', '最强', '100%', '彻底', '完美', '绝对', '没有任何', '零风险', '顶级', '极品', '万能', '史无前例', '空前', '绝无仅有', '无人能及', '永远', '永久', '终身', '100%有效'],
    suggestion: '替换为「较优」「领先」「优秀」等相对表达',
  },
  {
    type: 'exaggeration',
    label: '夸大承诺',
    patterns: ['保证', '一定能', '轻松月入', '日赚', '月入百万', '稳赚', '必赚', '包过', '包治', '立刻见效', '三天见效', '一周瘦', '月入过万', '躺赚', '秒变', '逆袭', '一夜暴富', '零成本', '零门槛', '无脑', '闭眼入'],
    suggestion: '避免承诺具体收益，改为「有望」「可能」等表述',
  },
  {
    type: 'medical',
    label: '医疗风险表达',
    patterns: ['治疗', '治愈', '疗效', '药效', '处方', '根治', '减肥药', '临床试验证明', '医学认证', '降血压', '降血糖', '抗癌', '防癌', '消炎', '杀菌', '医院专用', '医生推荐', '药用级', '医疗器械'],
    suggestion: '避免医疗效果承诺，改为「有助于」「可能改善」等表述',
  },
  {
    type: 'financial',
    label: '金融风险表达',
    patterns: ['投资回报', '收益率', '保本', '暴富', '稳赚不赔', '零风险投资', '年化', '理财必看', '翻倍', '涨停', '内部消息', '必涨', '抄底', '梭哈', '杠杆', '期货稳赢'],
    suggestion: '避免金融收益承诺，添加风险提示',
  },
  {
    type: 'sensitive',
    label: '敏感词',
    patterns: ['国家领导', '政府', '文革', '六四', '法轮功', '台独', '藏独', '疆独', '港独', '反华', '辱华', '政治', '维稳', '上访'],
    suggestion: '删除敏感政治表述，避免内容被平台审核拦截',
  },
  {
    type: 'vulgar',
    label: '低俗表达',
    patterns: ['卧槽', '牛逼', '撕逼', '绿茶婊', '屌丝', '装逼', '傻逼', '草', '妈的', '操', '贱', '骚', '约炮', '一夜情'],
    suggestion: '替换为文明用语，避免被平台限流或下架',
  },
]

// 平台特有合规规则
const PLATFORM_RULES = {
  '小红书': [
    {
      type: 'planting',
      label: '种草广告感',
      patterns: ['加微信', '加我V', '私聊购买', '代购', '一手货源', '厂家直销', '全网最低价', '限时抢购', '仅限今天', '错过再等一年', '赶紧下单', '点击购买', '购物链接', '优惠券', '满减'],
      suggestion: '减少商业推销感，用真实体验代替直接卖货',
    },
    {
      type: 'exaggerated_ad',
      label: '夸大宣传',
      patterns: ['用了就白', '一周变白', '三天祛痘', '永久脱毛', '零毛孔', '返老还童', '逆龄', '冻龄', '童颜', '换脸级', '堪比医美', '替代手术'],
      suggestion: '避免夸大效果，用「有改善」「感觉更」等真实表述',
    },
  ],
  'TikTok': [
    {
      type: 'spam',
      label: 'Spam 垃圾表达',
      patterns: ['follow4follow', 'f4f', 'like4like', 'l4l', 'follow me', 'follow for follow', 'link in bio', 'click link', 'check my bio', 'dm me', 'comment below', 'tag 3 friends', 'share to win'],
      suggestion: '避免互动诱骗，用内容质量自然吸引关注',
    },
    {
      type: 'false_promise',
      label: '虚假承诺',
      patterns: ['guaranteed', '100% works', 'easy money', 'passive income', 'get rich', 'make $1000', 'no experience needed', 'work from home', 'free money', 'crypto tips', 'bitcoin guarantee'],
      suggestion: '删除虚假承诺，TikTok 对虚假收益表达审核严格',
    },
    {
      type: 'clickbait',
      label: '诱导点击',
      patterns: ['you wont believe', 'shocking', 'must watch', 'wait for it', 'part 2', 'nobody expected', 'this changed my life', 'stop scrolling', 'watch till end', 'secret revealed'],
      suggestion: '减少标题党表达，用真实价值留住观众',
    },
  ],
}

function runComplianceCheck(content, platform) {
  const text = `${content.title || ''} ${content.body || ''} ${content.hook || ''} ${content.cta || ''}`
  const issues = []

  // 通用规则
  for (const rule of COMPLIANCE_RULES) {
    const hits = rule.patterns.filter((p) => text.toLowerCase().includes(p.toLowerCase()))
    if (hits.length > 0) {
      issues.push({
        type: rule.type,
        label: rule.label,
        words: hits,
        suggestion: rule.suggestion,
        scope: '通用',
      })
    }
  }

  // 平台特有规则
  const platformRules = PLATFORM_RULES[platform] || []
  for (const rule of platformRules) {
    const hits = rule.patterns.filter((p) => text.toLowerCase().includes(p.toLowerCase()))
    if (hits.length > 0) {
      issues.push({
        type: rule.type,
        label: rule.label,
        words: hits,
        suggestion: rule.suggestion,
        scope: platform,
      })
    }
  }

  let riskLevel = '低'
  if (issues.length >= 3) riskLevel = '高'
  else if (issues.length >= 1) riskLevel = '中'

  return { riskLevel, issues }
}

function buildStyleRulesText(confirmedRules) {
  if (!confirmedRules || confirmedRules.length === 0) return null
  // v9：按 effectivenessScore 降序，只取 Top 3 高价值规则
  const topRules = [...confirmedRules]
    .sort((a, b) => (b.effectivenessScore || 0) - (a.effectivenessScore || 0))
    .slice(0, 3)
  const lines = topRules.map((r, i) =>
    `${i + 1}. ${r.category}：\n${r.rule}\n效果评分：${r.effectivenessScore || 0}`
  )
  return `【经过数据验证的高效规则】\n\n${lines.join('\n\n')}`
}

// 策略生成：根据选题+目标+账号风格，生成 2-3 种内容设计策略
// analyzerContext 是 CompetitorAnalyzer → Pipeline 断链修复：注入爆款拆解的 killerMove 等上下文
export async function generateStrategiesViaAI(topicTitle, topicDesc, goalId, apiKey, currentDNA, confirmedRules, accountMemory, analyzerContext = null, platform = '通用') {
  const goalLabels = {
    comments: '爆评论区（激发用户讨论和互动）',
    growth: '涨粉（让用户觉得值得关注）',
    conversion: '种草转化（推动购买或行动决策）',
    branding: '品牌建设（强化账号辨识度和专业形象）',
  }
  const goalText = goalLabels[goalId] || goalLabels.comments

  const dnaSection = currentDNA ? `
【账号风格】
- 人格：${currentDNA.contentPersona || ''}
- 标题套路：${currentDNA.titleFormula || ''}
- 常用表达：${currentDNA.frequentExpressions?.join('、') || ''}
` : ''

  const rulesSection = confirmedRules?.length > 0
    ? `\n【已验证规则】\n${confirmedRules.slice(0, 3).map(r => `- ${r.category}：${r.rule}`).join('\n')}`
    : ''

  const memorySection = accountMemory
    ? `\n【历史经验】\n成功模式：${(accountMemory.winningPatterns?.hooks || []).slice(-3).join('、') || '暂无'}\n失败模式：${(accountMemory.failedPatterns?.reasons || []).slice(-3).join('、') || '暂无'}`
    : ''

  // 爆款拆解上下文注入（CompetitorAnalyzer → Pipeline 断链修复）
  const analyzerSection = analyzerContext && (analyzerContext.killerMove || analyzerContext.formula)
    ? `
【爆款拆解参考 · 必须优先融合】
（以下是从一个爆款内容逆向拆解出的核心决策逻辑，请把它的结构和决策思想迁移到本次选题上，不要照搬内容素材）
${analyzerContext.killerMove ? `- 核心杀手锏(KillerMove)：${analyzerContext.killerMove}` : ''}
${analyzerContext.formula ? `- 操作公式：${analyzerContext.formula}` : ''}
${analyzerContext.deconstruction?.hookStyle ? `- 参考 Hook 风格：${analyzerContext.deconstruction.hookStyle}` : ''}
${analyzerContext.deconstruction?.structurePattern ? `- 参考内容结构：${analyzerContext.deconstruction.structurePattern}` : ''}
${analyzerContext.decisionPrinciples?.length ? `- 可迁移原则：\n${analyzerContext.decisionPrinciples.slice(0, 3).map(p => `  • ${p.principle}（适用：${p.applyCondition}）`).join('\n')}` : ''}

重要要求：把以上爆款的决策逻辑迁移到「${topicTitle}」这个选题上，
保留结构思路和 KillerMove 的精神内核，但素材、案例、具体说法必须换成${topicDesc || '当前领域'}领域的内容。
`
    : ''

  const platformAlgorithmRules = {
    '小红书': '- 核心指标：收藏率（权重最高）> 点击率 > 互动率；策略要围绕"让用户愿意收藏"设计结构：清单体/教程体/分步骤表达，标题要有确定性（数字+结论）\n- 阈值参考：收藏率>5% → 推精品池；点击率>10% → 首波推荐\n- 禁止写抖音风格的口播脚本，小红书是图文平台',
    '抖音': '- 核心指标：前3秒完播率 > 5秒完播率 > 整体完播率；策略必须设计3秒强力Hook，节奏快，前10秒要爆点\n- 阈值参考：前3秒完播率>60% → 首波推；5秒完播率>45% → 二级池\n- 内容要有镜头感和台词感，适合口播/分镜，不能是长篇图文',
    '视频号': '- 核心指标：社交转发率 > 点赞率 > 完播率；策略要设计"转发给亲友"的心理钩子\n- 内容中年向、家庭向、正能量向，语言要朴实有温度',
    '公众号': '- 核心指标：打开率 > 读完率 > 分享率；结构要有小标题分节，深度分析，字数800+',
    'B站': '- 核心指标：3分钟留存 > 三连率（投币+收藏+点赞）> 弹幕密度；内容要有信息密度和梗，不能太水',
    '通用': '- 通用内容，优先设计可跨平台复用的决策逻辑',
  }[platform] || '- 通用内容'

  const prompt = `你是一位内容策略设计专家。请为「${platform}」平台设计 2-3 种不同的内容策略。

【发布平台】${platform}
【平台算法规则】
${platformAlgorithmRules}
—— 以上平台规则必须严格遵守，小红书不能生成抖音口播风格，抖音不能生成图文长文。

【选题】${topicTitle}
【选题描述】${topicDesc || '无'}
【内容目标】${goalText}
${dnaSection}${rulesSection}${memorySection}${analyzerSection}

请返回 JSON 数组（只输出 JSON，不要其他文字），每种策略包含：
[
  {
    "name": "策略名称（4-8字）",
    "hook": "Hook 设计思路（开头怎么抓眼球，具体到用什么句式或悬念）",
    "structure": "内容结构安排（分几部分，每部分讲什么）",
    "interaction": "互动埋点设计（在什么位置设置什么互动触发点）",
    "reason": "为什么这个策略适合「${goalText}」这个目标（1-2句话）"
  }
]

要求：
1. 每种策略的思路必须不同，不能只是换说法
2. 互动埋点要具体可执行（如"第3条故意留一个常见误区，引导用户纠正"）
3. 策略要结合账号风格，不能脱离已有人设
4. 生成 2-3 种，不要超过 3 种
${analyzerContext?.killerMove ? '5. 特别注意：请确保至少有一种策略直接融合了上面【爆款拆解参考】里的 KillerMove 决策逻辑' : ''}`

  const result = await callAI(apiKey, prompt, { temperature: 0.9, max_tokens: 1500 })

  // 两阶段 JSON 解析：先直接解析，再清理后重试
  let strategies = null

  // 阶段1：直接提取 JSON 数组
  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      strategies = JSON.parse(jsonMatch[0])
    }
  } catch {
    // 阶段2：清理常见 AI 输出问题后重试
    try {
      const cleaned = result
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/[\u0000-\u001F]/g, '') // 控制字符
        .replace(/,\s*}/g, '}') // 尾部逗号
        .replace(/,\s*]/g, ']')
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        strategies = JSON.parse(jsonMatch[0])
      }
    } catch {
      // 仍然失败，尝试提取单个对象
      try {
        const objMatch = result.match(/\{[\s\S]*\}/)
        if (objMatch) {
          const obj = JSON.parse(objMatch[0])
          if (obj.name || obj.hook) strategies = [obj]
        }
      } catch {
        // 彻底失败
      }
    }
  }

  if (Array.isArray(strategies) && strategies.length > 0) {
    // 确保每个策略有必需字段
    return strategies.slice(0, 3).map(s => ({
      name: s.name || '未命名策略',
      hook: s.hook || s.hookDesign || '',
      structure: s.structure || s.contentStructure || '',
      interaction: s.interaction || s.interactionDesign || '',
      reason: s.reason || s.why || '',
    }))
  }

  // 降级：返回默认策略
  return [
    {
      name: '默认策略',
      hook: '用反问或数字开头，制造信息差',
      structure: '痛点引入 → 核心方案 → 效果展示 → 行动建议',
      interaction: '结尾设置开放性问题，引导用户评论',
      reason: '通用策略，适合大多数内容和目标',
    }
  ]
}

export function generateContentViaAI(topicTitle, topicDesc, apiKey, confirmedRules, currentDNA, contentPatterns, accountMemory, selectedStrategy) {
  const styleRulesText = buildStyleRulesText(confirmedRules)

  // v3.1：风格模型四维度注入
  const dnaSection = currentDNA ? `
【账号人格】${currentDNA.contentPersona || ''}
【内容结构】${currentDNA.writingStructure || ''}
【视觉风格】${currentDNA.visualStyle || ''}
【用户画像】${currentDNA.audience || ''}
【标题套路】${currentDNA.titleFormula || ''}
【常用表达】${currentDNA.frequentExpressions?.join('、') || ''}
` : ''

  const styleSection = styleRulesText
    ? `\n${styleRulesText}\n\n这些规则经过历史内容数据验证，请优先遵守高评分规则。\n`
    : `\n风格要求：\n- 口语化，像和闺蜜聊天\n- 适当使用 emoji\n- 标题套路：数字+痛点+解决方案\n- 钩子要抓眼球，制造信息差\n`

  // v9：爆款模式注入（Top 3 by confidence）+ V2 决策原则注入
  const patternsSection = contentPatterns && contentPatterns.length > 0
    ? `\n【参考爆款模式】（以下是经过拆解的优秀内容规律，请参考其决策逻辑，不要复制原文）\n${contentPatterns.map((p, i) => {
        const d = p.deconstruction || {}
        const principles = (p.decisionPrinciples || []).map(pr => `     - ${pr.principle}（适用：${pr.applyCondition}，代价：${pr.tradeoff}）`).join('\n')
        const notTransferable = (p.notTransferable || []).join('、')
        return `${i + 1}. ${p.pattern}\n   标题规律：${d.titleFormula || '-'}\n   Hook：${d.hookStyle || '-'}\n   结构：${d.structurePattern || '-'}\n   情绪：${d.emotionalTrigger || '-'}\n   CTA：${d.ctaStyle || '-'}${principles ? `\n   决策原则：\n${principles}` : ''}${notTransferable ? `\n   不可复制：${notTransferable}` : ''}`
      }).join('\n')}\n`
    : ''

  // v11：账号记忆注入（winningPatterns / failedPatterns / contentHistory）
  // 让 AI 知道：你之前什么有效、什么失败、发过什么，从而避免重复、复用成功模式
  let memorySection = ''
  if (accountMemory) {
    const parts = []
    const w = accountMemory.winningPatterns || {}
    const f = accountMemory.failedPatterns || {}
    const h = accountMemory.contentHistory || []

    // 成功模式（必须复用）
    const winningLines = []
    if (w.topics?.length) winningLines.push(`选题方向：${w.topics.slice(-5).join('、')}`)
    if (w.hooks?.length) winningLines.push(`Hook 风格：${w.hooks.slice(-5).join('、')}`)
    if (w.structures?.length) winningLines.push(`结构：${w.structures.slice(-5).join('、')}`)
    if (w.expressions?.length) winningLines.push(`高频表达：${w.expressions.slice(-5).join('、')}`)
    if (winningLines.length) parts.push(`【历史成功模式】（请优先复用这些已被验证有效的元素）\n${winningLines.join('\n')}`)

    // 失败模式（必须规避）
    const failedLines = []
    if (f.topics?.length) failedLines.push(`失败选题：${f.topics.slice(-5).join('、')}`)
    if (f.hooks?.length) failedLines.push(`失败 Hook：${f.hooks.slice(-5).join('、')}`)
    if (f.reasons?.length) failedLines.push(`失败原因：${f.reasons.slice(-5).join('、')}`)
    if (failedLines.length) parts.push(`【历史失败模式】（请规避这些已被验证无效的元素）\n${failedLines.join('\n')}`)

    // 最近内容历史（避免重复）
    if (h.length > 0) {
      const recent = h.slice(0, 3).map((item, i) => `${i + 1}. 选题「${item.topic || '未命名'}」· Hook「${(item.hook || '').substring(0, 30)}」· 互动率 ${((item.performance?.likes || 0) + (item.performance?.comments || 0)) / Math.max(1, item.performance?.views || 1) * 100}%`)
      parts.push(`【最近发布内容】（不要重复以下选题和 Hook）\n${recent.join('\n')}`)
    }

    if (parts.length) {
      memorySection = `\n${parts.join('\n\n')}\n\n请基于以上账号记忆生成：复用成功模式、规避失败模式、不重复最近内容。\n`
    }
  }

  // 策略注入：如果用户选了策略，在 prompt 中明确设计要求
  const strategySection = selectedStrategy ? `
【本次内容设计策略】
策略名称：${selectedStrategy.name}
Hook 设计：${selectedStrategy.hook}
内容结构：${selectedStrategy.structure}
互动埋点：${selectedStrategy.interaction}
设计理由：${selectedStrategy.reason}

请严格按照以上策略生成内容，特别是 Hook 设计和互动埋点必须体现在正文中。
` : ''

  const prompt = `你是一位擅长写${topicDesc || '生活方式'}类小红书笔记的内容创作者。

请围绕选题「${topicTitle}」生成一篇小红书风格的笔记，包含：
1. 标题（带 emoji，有吸引力，不超过 20 字）
2. 正文结构（痛点引入 → 方案展示 → 效果对比 → 总结建议，每部分 1-2 句话）
3. 钩子（开头第一句话，制造悬念或引发共鸣）
4. CTA（结尾行动号召）
${strategySection}${dnaSection}${styleSection}${patternsSection}${memorySection}
直接输出结果，不要其他解释。`

  return callAI(apiKey, prompt, { temperature: 0.8, max_tokens: 1000 })
}

export function parseAIResponse(text) {
  const lines = text.split('\n').filter((l) => l.trim())
  let title = ''
  let hook = ''
  let structure = ''
  let cta = ''
  let body = text

  const titleMatch = text.match(/标题[：:]\s*(.+)/) || text.match(/^#+\s*(.+)/m)
  if (titleMatch) title = titleMatch[1].trim()

  const hookMatch = text.match(/钩子[：:]\s*(.+)/) || text.match(/^[\*\-\d]\s*(.+)/m)
  if (hookMatch) hook = hookMatch[1].trim()

  const ctaMatch = text.match(/CTA[：:]\s*(.+)/) || text.match(/(关注|点赞|收藏|评论|冲)/)
  if (ctaMatch) cta = ctaMatch[1].trim()

  return { title: title || '未命名笔记', body, hook, structure, cta }
}

export default function Pipeline() {
  const navigate = useNavigate()
  const location = useLocation()
  usePageDwellTracking('Pipeline')
  const currentProjectId = useStore((s) => s.currentProjectId)
  const allTopics = useStore((s) => s.topics)
  const projects = useStore((s) => s.projects)
  const allStyleRules = useStore((s) => s.styleRules)
  const allStyleDNA = useStore((s) => s.styleDNA)
  const addContent = useStore((s) => s.addContent)
  const moveContentToAsset = useStore((s) => s.moveContentToAsset)
  const allContentPatterns = useStore((s) => s.contentPatterns)
  const allAccountMemory = useStore((s) => s.accountMemory)
  const hasCredit = useStore((s) => s.hasCredit)
  const consumeCredit = useStore((s) => s.consumeCredit)
  const getRemainingCredits = useStore((s) => s.getRemainingCredits)
  const credits = useStore((s) => s.credits)

  const topics = useMemo(
    () => allTopics.filter((t) => t.projectId === currentProjectId),
    [allTopics, currentProjectId]
  )
  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  )
  const adoptedTopics = useMemo(
    () => topics.filter((t) => t.status === 'adopted'),
    [topics]
  )

  const initialTopicId = location.state?.topicId || adoptedTopics[0]?.id || null

  // ===== 来自爆款拆解实验室的上下文（CompetitorAnalyzer → Pipeline 断链修复）=====
  const fromAnalyzer = location.state?.fromAnalyzer || false
  const analyzerKillerMove = location.state?.killerMove || ''
  const analyzerFormula = location.state?.formula || ''
  const analyzerSacrifice = location.state?.sacrifice || ''
  const analyzerTitle = location.state?.title || location.state?.sourceTitle || ''
  const analyzerDeconstruction = location.state?.deconstruction || {}
  const analyzerDecisionPrinciples = location.state?.decisionPrinciples || []

  // 当前项目已确认的风格规则（v3.1：按 effectivenessScore 降序）
  const confirmedStyleRules = useMemo(
    () => allStyleRules
      .filter((r) => r.projectId === currentProjectId && r.confirmed)
      .sort((a, b) => (b.effectivenessScore || 0) - (a.effectivenessScore || 0)),
    [allStyleRules, currentProjectId]
  )

  // v3.1：当前项目的 active StyleDNA
  const currentDNA = useMemo(
    () => allStyleDNA.find((d) => d.projectId === currentProjectId && d.status === 'active'),
    [allStyleDNA, currentProjectId]
  )

  // v9：当前项目的爆款模式（Top 3 by confidence）
  const topPatterns = useMemo(
    () => allContentPatterns
      .filter((p) => p.projectId === currentProjectId)
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 3),
    [allContentPatterns, currentProjectId]
  )

  // v11：当前项目的账号记忆（winningPatterns/failedPatterns/contentHistory）
  const currentMemory = useMemo(
    () => allAccountMemory.find((m) => m.projectId === currentProjectId),
    [allAccountMemory, currentProjectId]
  )

  const [currentStep, setCurrentStep] = useState(1)
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopicId)
  const [generatedContent, setGeneratedContent] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  // 策略设计状态
  const [selectedGoal, setSelectedGoal] = useState('')
  const [strategies, setStrategies] = useState([])
  const [selectedStrategy, setSelectedStrategy] = useState(null)
  const [isGeneratingStrategies, setIsGeneratingStrategies] = useState(false)
  const [strategyError, setStrategyError] = useState('')

  // 合规检查结果（自动计算）
  const complianceResult = useMemo(() => {
    if (!generatedContent) return null
    return runComplianceCheck(generatedContent, currentProject?.platform)
  }, [generatedContent, currentProject?.platform])

  useEffect(() => {
    if (location.state?.topicId) {
      setSelectedTopicId(location.state.topicId)
      setCurrentStep(2)
    }
  }, [location.state?.topicId])

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId),
    [topics, selectedTopicId]
  )

  const goNext = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1)
  }

  const goPrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  // 生成策略
  const handleGenerateStrategies = async () => {
    if (!selectedTopic || !selectedGoal) return
    setIsGeneratingStrategies(true)
    setStrategyError('')
    setStrategies([])
    setSelectedStrategy(null)

    const apiKey = getApiKey()
    if (!apiKey) {
      setStrategyError('请先在设置页面配置 DeepSeek API Key')
      setIsGeneratingStrategies(false)
      return
    }

    try {
      // CompetitorAnalyzer → Pipeline 断链修复：如果来自爆款拆解，注入上下文
      const analyzerContext = fromAnalyzer
        ? {
            killerMove: analyzerKillerMove,
            formula: analyzerFormula,
            deconstruction: analyzerDeconstruction,
            decisionPrinciples: analyzerDecisionPrinciples,
          }
        : null
      const result = await generateStrategiesViaAI(
        selectedTopic.title,
        selectedTopic.description,
        selectedGoal,
        apiKey,
        currentDNA,
        confirmedStyleRules,
        currentMemory,
        analyzerContext,
        currentProject?.platform || '通用'
      )
      setStrategies(result)
    } catch (err) {
      const classified = classifyAIError(err)
      setStrategyError(classified.message)
    }
    setIsGeneratingStrategies(false)
  }

  const handleGenerate = async () => {
    if (!selectedTopic) return
    setIsGenerating(true)
    setError('')
    setSaved(false)
    setGeneratedContent(null)

    const apiKey = getApiKey()

    if (!apiKey) {
      setError('请先在设置页面配置 DeepSeek API Key')
      setIsGenerating(false)
      return
    }

    // 额度校验：免费体验限制
    if (!hasCredit('aiGenerate')) {
      setError('你的账号大脑已经建立，升级后可继续学习和生成。')
      setIsGenerating(false)
      return
    }

    try {
      const text = await generateContentViaAI(
        selectedTopic.title,
        selectedTopic.description,
        apiKey,
        confirmedStyleRules,
        currentDNA,
        topPatterns,
        currentMemory,
        selectedStrategy
      )
      const parsed = parseAIResponse(text)
      // 成功后再扣减额度
      consumeCredit('aiGenerate')
      setGeneratedContent({
        ...parsed,
        topicId: selectedTopic.id,
        projectId: currentProjectId,
        status: 'draft',
      })
      trackFirstContentGeneration()
      trackEvent('content_generate')
    } catch (err) {
      const classified = classifyAIError(err)
      setError(classified.message)
    }

    setIsGenerating(false)
  }

  const handleSaveToAssets = () => {
    if (!generatedContent) return
    const apiKey = getApiKey()
    const contentId = addContent(currentProjectId, {
      topicId: generatedContent.topicId,
      title: generatedContent.title,
      body: generatedContent.body,
      hook: generatedContent.hook,
      structure: generatedContent.structure,
      cta: generatedContent.cta,
      // v3.1 血缘字段
      styleDNAId: currentDNA?.id || null,
      styleRuleIds: confirmedStyleRules.map((r) => r.id),
      generationSource: {
        type: apiKey ? 'ai' : 'mock',
        model: 'deepseek-chat',
        humanEdited: false,
      },
      promptId: 'v2',
    })
    moveContentToAsset(contentId)
    setSaved(true)
  }

  const handleCopy = async () => {
    if (!generatedContent) return
    try {
      await navigator.clipboard.writeText(generatedContent.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">生成内容</h1>
        <p className="text-sm text-gray-500 mt-1">
          {currentProject ? `当前账号：${currentProject.name}` : '把选题变成可发布的内容'}
        </p>
      </header>

      {/* 步骤指示器 */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {STEPS.map((step, i) => {
            const StepIcon = step.icon
            const isActive = currentStep === step.id
            const isDone = currentStep > step.id
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isActive
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-200'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={20} /> : <StepIcon size={18} />}
                  </div>
                  <div className="mt-2 text-center">
                    <div
                      className={`text-xs font-medium ${
                        isActive ? 'text-brand-600' : isDone ? 'text-emerald-600' : 'text-gray-400'
                      }`}
                    >
                      {step.title}
                    </div>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 rounded bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        currentStep > step.id ? 'bg-emerald-500 w-full' : 'w-0'
                      }`}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Step 1: 选择选题 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* 来自爆款拆解实验室的参考 */}
              {fromAnalyzer && (
                <div className="rounded-2xl border-2 border-[#7C3AED]/40 bg-gradient-to-br from-[#7C3AED]/5 to-purple-50 p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#a78bfa] text-white flex items-center justify-center shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900">来自爆款拆解实验室</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7C3AED] text-white font-medium">
                          KillerMove 注入
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        基于拆解结果，以下洞察将作为策略设计的参考依据
                      </p>
                    </div>
                  </div>

                  {analyzerTitle && (
                    <div className="mb-3 p-3 bg-white rounded-lg border border-gray-100">
                      <div className="text-[10px] text-gray-400 mb-0.5">原爆款标题</div>
                      <div className="text-sm font-medium text-gray-800">{analyzerTitle}</div>
                    </div>
                  )}

                  {analyzerKillerMove && (
                    <div className="mb-3 p-3 bg-white rounded-lg border border-[#7C3AED]/20">
                      <div className="text-[10px] text-[#7C3AED] font-semibold mb-1">💎 杀手锏 (KillerMove)</div>
                      <div className="text-sm text-gray-800 leading-relaxed">{analyzerKillerMove}</div>
                    </div>
                  )}

                  {analyzerFormula && (
                    <div className="mb-3 p-3 bg-white rounded-lg border border-amber-200">
                      <div className="text-[10px] text-amber-600 font-semibold mb-1">📐 操作公式</div>
                      <div className="text-sm text-gray-800 font-medium">{analyzerFormula}</div>
                    </div>
                  )}

                  {analyzerDecisionPrinciples?.length > 0 && (
                    <div className="p-3 bg-white rounded-lg border border-gray-100">
                      <div className="text-[10px] text-green-600 font-semibold mb-2">✅ 可迁移原则 (Top 3)</div>
                      <ul className="space-y-1.5">
                        {analyzerDecisionPrinciples.slice(0, 3).map((p, i) => (
                          <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div>
                              <div className="font-medium">{p.principle}</div>
                              {p.applyCondition && (
                                <div className="text-gray-400 mt-0.5">适用：{p.applyCondition}</div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-1">选择要生产的选题</h3>
                <p className="text-sm text-gray-500">从已采纳选题中选择一个开始生产</p>
              </div>

              {adoptedTopics.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <FileText size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-gray-900 font-medium mb-1">暂无已采纳选题</h3>
                  <p className="text-sm text-gray-500 mb-4">先去选题建议页面采纳一个选题</p>
                  <button
                    onClick={() => navigate('/factory/topics')}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                  >
                    前往选题建议 <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {adoptedTopics.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => setSelectedTopicId(topic.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedTopicId === topic.id
                          ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-200'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg shrink-0">
                        {topic.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{topic.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{topic.description}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-gray-400">匹配度</div>
                        <div className="text-sm font-semibold text-brand-600 tabular">{topic.matchScore}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: 风格匹配 */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-1">选中选题</h3>
                <div className="mt-3 flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-lg">
                    {selectedTopic?.emoji}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{selectedTopic?.title}</div>
                    <div className="text-xs text-gray-500">{selectedTopic?.description}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">AI 学到的风格</h3>
                  {confirmedStyleRules.length > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium flex items-center gap-1">
                      <ShieldCheck size={10} />
                      {confirmedStyleRules.length} 条已确认规则
                    </span>
                  )}
                </div>

                {confirmedStyleRules.length > 0 ? (
                  <div className="space-y-3">
                    {/* 按分类分组展示已确认规则 */}
                    {Object.entries(
                      confirmedStyleRules.reduce((acc, r) => {
                        if (!acc[r.category]) acc[r.category] = []
                        acc[r.category].push(r.rule)
                        return acc
                      }, {})
                    ).map(([cat, rules]) => (
                      <div key={cat} className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-[11px] text-gray-500 mb-1.5">{cat}</div>
                        <ul className="space-y-1">
                          {rules.map((rule, i) => (
                            <li key={i} className="text-sm text-gray-900 leading-relaxed flex items-start gap-1.5">
                              <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                              {rule}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400 mb-2">暂无已确认的风格规则</p>
                    <p className="text-xs text-gray-400">
                      前往「风格学习」页面上传样本并确认规则，生成内容时将自动应用
                    </p>
                  </div>
                )}
              </div>

              {currentProject && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">账号定位</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-[11px] text-gray-500 mb-1">平台</div>
                      <div className="text-gray-900">{currentProject.platform}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-500 mb-1">类目</div>
                      <div className="text-gray-900">{currentProject.category}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[11px] text-gray-500 mb-1">定位</div>
                      <div className="text-gray-900">{currentProject.positioning || '尚未设置'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[11px] text-gray-500 mb-1">目标受众</div>
                      <div className="text-gray-900">{currentProject.audience || '尚未设置'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: 策略设计 */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* 来自爆款拆解实验室的策略参考注入 */}
              {fromAnalyzer && analyzerKillerMove && (
                <div className="rounded-2xl border-2 border-[#7C3AED]/40 bg-gradient-to-br from-[#7C3AED]/10 to-purple-50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#a78bfa] text-white flex items-center justify-center shrink-0">
                      <Target size={16} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">策略参考 · 来自爆款拆解</h4>
                      <p className="text-[11px] text-gray-500">AI 生成策略时会优先参考这些决策逻辑</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-3 bg-white rounded-lg border border-[#7C3AED]/20">
                      <div className="text-[10px] text-[#7C3AED] font-semibold mb-1">💎 KillerMove · 策略核心</div>
                      <p className="text-sm text-gray-800 leading-relaxed">{analyzerKillerMove}</p>
                    </div>
                    {analyzerFormula && (
                      <div className="p-3 bg-white rounded-lg border border-amber-200">
                        <div className="text-[10px] text-amber-600 font-semibold mb-1">📐 操作公式</div>
                        <p className="text-sm text-gray-800 font-medium">{analyzerFormula}</p>
                      </div>
                    )}
                    {analyzerDeconstruction?.hookStyle && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 bg-white rounded-lg border border-gray-100">
                          <div className="text-[10px] text-gray-400 mb-0.5">参考 Hook 风格</div>
                          <div className="text-xs text-gray-700">{analyzerDeconstruction.hookStyle}</div>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-gray-100">
                          <div className="text-[10px] text-gray-400 mb-0.5">参考结构</div>
                          <div className="text-xs text-gray-700">{analyzerDeconstruction.structurePattern || '-'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-1">设计你的内容策略</h3>
                <p className="text-sm text-gray-500">
                  告诉 AI 你想要什么效果，它会设计 2-3 种内容策略供你选择
                </p>
              </div>

              {/* 选题回顾 */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-lg">
                    {selectedTopic?.emoji}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{selectedTopic?.title}</div>
                    <div className="text-xs text-gray-500">{selectedTopic?.description}</div>
                  </div>
                </div>
              </div>

              {/* 目标选择 */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h4 className="text-sm font-medium text-gray-900 mb-3">这条内容你想要什么效果？</h4>
                <div className="grid grid-cols-2 gap-3">
                  {CONTENT_GOALS.map((goal) => {
                    const GoalIcon = goal.id === 'comments' ? MessageCircle
                      : goal.id === 'growth' ? TrendingUp
                      : goal.id === 'conversion' ? ShoppingBag
                      : Tag
                    return (
                      <button
                        key={goal.id}
                        onClick={() => {
                          setSelectedGoal(goal.id)
                          setStrategies([])
                          setSelectedStrategy(null)
                          setStrategyError('')
                        }}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          selectedGoal === goal.id
                            ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-200'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <GoalIcon size={16} className={selectedGoal === goal.id ? 'text-brand-600' : 'text-gray-400'} />
                          <span className={`text-sm font-medium ${selectedGoal === goal.id ? 'text-brand-600' : 'text-gray-900'}`}>
                            {goal.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{goal.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 生成策略按钮 */}
              {selectedGoal && !isGeneratingStrategies && strategies.length === 0 && !strategyError && (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
                    <Target size={24} className="text-brand-500" />
                  </div>
                  <h3 className="text-gray-900 font-medium mb-1">生成内容策略</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    AI 将根据你的选题、目标和账号风格，设计 {CONTENT_GOALS.find(g => g.id === selectedGoal)?.label} 策略
                  </p>
                  <button
                    onClick={handleGenerateStrategies}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                  >
                    <Target size={16} />
                    生成策略方案
                  </button>
                </div>
              )}

              {/* 加载中 */}
              {isGeneratingStrategies && (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
                  <Loader2 size={32} className="mx-auto text-brand-500 animate-spin mb-4" />
                  <h3 className="text-gray-900 font-medium mb-1">AI 正在设计策略...</h3>
                  <p className="text-sm text-gray-500">通常需要 3-8 秒</p>
                </div>
              )}

              {/* 错误提示 */}
              {strategyError && !isGeneratingStrategies && (
                <div className="bg-white rounded-xl border border-gray-100">
                  <AIErrorBanner error={strategyError} onRetry={handleGenerateStrategies} />
                </div>
              )}

              {/* 策略列表 */}
              {strategies.length > 0 && !isGeneratingStrategies && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-500 px-1">
                    AI 设计了 {strategies.length} 种策略，选择一个开始生成
                  </div>
                  {strategies.map((strategy, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedStrategy(strategy)}
                      className={`p-5 rounded-xl border cursor-pointer transition-all ${
                        selectedStrategy === strategy
                          ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-200'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                            selectedStrategy === strategy ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <h4 className={`font-medium ${selectedStrategy === strategy ? 'text-brand-600' : 'text-gray-900'}`}>
                            {strategy.name}
                          </h4>
                        </div>
                        {selectedStrategy === strategy && (
                          <CheckCircle2 size={18} className="text-brand-600" />
                        )}
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <span className="text-gray-400 font-medium">Hook 设计：</span>
                          <span className="text-gray-700">{strategy.hook}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-medium">内容结构：</span>
                          <span className="text-gray-700">{strategy.structure}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-medium">互动埋点：</span>
                          <span className="text-gray-700">{strategy.interaction}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-100">
                          <span className="text-gray-400 font-medium">为什么选它：</span>
                          <span className="text-gray-600">{strategy.reason}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 重新生成 */}
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setStrategies([])
                        setSelectedStrategy(null)
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      重新生成策略
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: AI 生成 */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {/* 策略回顾 */}
              {selectedStrategy && (
                <div className="bg-brand-50 rounded-xl border border-brand-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={14} className="text-brand-600" />
                    <span className="text-xs font-medium text-brand-700">本次使用策略</span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">{selectedStrategy.name}</div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <div>Hook：{selectedStrategy.hook}</div>
                    <div>互动埋点：{selectedStrategy.interaction}</div>
                  </div>
                </div>
              )}

              {!generatedContent && !isGenerating && (
                <>
                  {/* 本次生成依据 */}
                  <div className="bg-white rounded-xl border border-brand-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck size={16} className="text-brand-600" />
                      <h3 className="font-semibold text-gray-900">本次生成依据</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 font-medium">
                        果核 ≠ 普通 AI
                      </span>
                    </div>

                    {!currentDNA && confirmedStyleRules.length === 0 && topPatterns.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
                          <Sparkles size={22} className="text-brand-400" />
                        </div>
                        <p className="text-sm text-gray-500">
                          正在建立你的内容模型。
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          完成后再次生成会自动引用学习结果。
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* 我的风格 */}
                        <div className="mb-4">
                          <div className="text-xs font-medium text-gray-700 mb-2">我的风格</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {currentDNA ? (
                              <>
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />
                                  <span className="text-gray-600">账号人格：{currentDNA.contentPersona?.slice(0, 20) || '-'}</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />
                                  <span className="text-gray-600">标题套路：{currentDNA.titleFormula?.slice(0, 20) || '-'}</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />
                                  <span className="text-gray-600">内容结构：{currentDNA.writingStructure?.slice(0, 20) || '-'}</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />
                                  <span className="text-gray-600">常用表达：{currentDNA.frequentExpressions?.slice(0, 3).join('、') || '-'}</span>
                                </div>
                              </>
                            ) : (
                              <div className="text-gray-400 col-span-2">尚未建立风格模型，完成 Onboarding 后自动生成</div>
                            )}
                          </div>
                        </div>

                        {/* 学习规则 */}
                        <div className="mb-4">
                          <div className="text-xs font-medium text-gray-700 mb-2">
                            学习规则（Top {Math.min(3, confirmedStyleRules.length)} by 效果分）
                          </div>
                          {confirmedStyleRules.length > 0 ? (
                            <div className="space-y-1">
                              {confirmedStyleRules.slice(0, 3).map((r, i) => (
                                <div key={r.id} className="flex items-start gap-1.5 text-xs">
                                  <CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />
                                  <span className="text-gray-600">
                                    {r.category}：{r.rule}
                                    <span className="text-gray-400 ml-1">（效果分 {r.effectivenessScore || 0}）</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-xs">尚未学习规则，复盘内容数据后自动积累</div>
                          )}
                        </div>

                        {/* 参考爆款模式 */}
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-2">
                            参考爆款模式（{topPatterns.length} 条）
                          </div>
                          {topPatterns.length > 0 ? (
                            <div className="space-y-1">
                              {topPatterns.map((p, i) => (
                                <div key={p.id} className="flex items-start gap-1.5 text-xs">
                                  <CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />
                                  <span className="text-gray-600">
                                    {p.pattern}
                                    <span className="text-gray-400 ml-1">（置信度 {Math.round((p.confidence || 0) * 100)}%）</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-xs">尚未学习爆款模式，前往「灵感捕手」添加优秀内容</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
                      <Sparkles size={28} className="text-brand-500" />
                    </div>
                    <h3 className="text-gray-900 font-medium mb-1">开始 AI 内容生成</h3>
                    <p className="text-sm text-gray-500 mb-3">
                      选题：「{selectedTopic?.title}」
                    </p>
                    {/* 免费体验额度提示 */}
                    <div className="text-[11px] text-gray-400 mb-4 flex items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        免费体验剩余：{getRemainingCredits('aiGenerate')}/{(credits.freeExperience?.aiGenerate ?? 3)}
                      </span>
                      <span>用完后升级 Pro 可无限生成</span>
                    </div>
                    <button
                      onClick={handleGenerate}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                    >
                      <Wand2 size={16} />
                      一键生成内容
                    </button>
                    <p className="text-xs text-gray-400 mt-3">
                      {getApiKey()
                        ? '使用已配置的 API Key'
                        : '未配置 API Key，请先前往设置配置'}
                    </p>
                  </div>
                </>
              )}

              {isGenerating && (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
                  <Loader2 size={32} className="mx-auto text-brand-500 animate-spin mb-4" />
                  <h3 className="text-gray-900 font-medium mb-1">AI 正在生成内容...</h3>
                  <p className="text-sm text-gray-500">通常需要 3-8 秒</p>
                </div>
              )}

              {error && !isGenerating && !generatedContent && (
                <div className="bg-white rounded-xl border border-gray-100">
                  <AIErrorBanner error={error} onRetry={handleGenerate} />
                </div>
              )}

              {generatedContent && !isGenerating && (
                <div className="space-y-3">
                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Sparkles size={16} className="text-brand-500" />
                        生成结果
                      </h3>
                      <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs hover:bg-gray-200"
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? '已复制' : '复制全文'}
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-[11px] font-medium text-gray-500 uppercase mb-1">标题</div>
                        <div className="p-3 bg-brand-50 rounded-lg text-sm font-medium text-gray-900">
                          {generatedContent.title}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-medium text-gray-500 uppercase mb-1">钩子</div>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-800">
                          {generatedContent.hook}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-medium text-gray-500 uppercase mb-1">正文</div>
                        <pre className="p-3 bg-gray-50 rounded-lg text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                          {generatedContent.body}
                        </pre>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[11px] font-medium text-gray-500 uppercase mb-1">结构</div>
                          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                            {generatedContent.structure}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-medium text-gray-500 uppercase mb-1">CTA</div>
                          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                            {generatedContent.cta}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setGeneratedContent(null)
                        setCurrentStep(3)
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      重新选择策略
                    </button>
                    <button
                      onClick={goNext}
                      className="inline-flex items-center gap-1.5 px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                    >
                      进入审核 <ArrowRight size={16} />
                    </button>
                  </div>

                  {/* 软墙：生成成功后提示额度 + 升级 */}
                  <UpgradePrompt scenario="generate" />
                </div>
              )}
            </div>
          )}

          {/* Step 5: 合规检查 */}
          {currentStep === 5 && generatedContent && complianceResult && (
            <div className="space-y-4">
              {/* 平台适配说明 */}
              {currentProject?.platform && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      平台适配检查：{currentProject.platform}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    {currentProject.platform === '小红书' && (
                      <>
                        <p>• 种草表达：检测硬广感过强的推销用语</p>
                        <p>• 广告感：检测过于商业化的表达方式</p>
                        <p>• 夸大宣传：检测违反平台规范的夸大描述</p>
                      </>
                    )}
                    {currentProject.platform === 'TikTok' && (
                      <>
                        <p>• Spam 表达：检测垃圾信息诱导用语</p>
                        <p>• 虚假承诺：检测不切实际的效果承诺</p>
                        <p>• 诱导表达：检测诱导点击/关注的套路用语</p>
                      </>
                    )}
                    {(currentProject.platform !== '小红书' && currentProject.platform !== 'TikTok') && (
                      <>
                        <p>• 通用合规：检测绝对化表达、夸大承诺</p>
                        <p>• 风险词：检测医疗/金融敏感表达</p>
                        <p>• 平台规范：检测常见违规用语</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 风险等级总览 */}
              <div className={`rounded-xl border p-5 ${
                complianceResult.riskLevel === '高'
                  ? 'bg-red-50 border-red-200'
                  : complianceResult.riskLevel === '中'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center gap-3">
                  {complianceResult.riskLevel === '低' ? (
                    <ShieldCheck size={24} className="text-emerald-600" />
                  ) : (
                    <ShieldAlert size={24} className={complianceResult.riskLevel === '高' ? 'text-red-600' : 'text-amber-600'} />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">合规检查完成</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        complianceResult.riskLevel === '高'
                          ? 'bg-red-100 text-red-700'
                          : complianceResult.riskLevel === '中'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        风险等级：{complianceResult.riskLevel}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {complianceResult.issues.length === 0
                        ? '未检测到风险表达，可以安全发布'
                        : `检测到 ${complianceResult.issues.length} 处潜在风险，建议优化后再发布`}
                    </p>
                  </div>
                </div>
              </div>

              {/* 风险详情 */}
              {complianceResult.issues.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">风险详情与修改建议</h3>
                  <div className="space-y-3">
                    {complianceResult.issues.map((issue, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 mb-1.5">
                          <AlertTriangle size={14} className="text-amber-500" />
                          <span className="text-sm font-medium text-gray-900">{issue.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{issue.scope}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {issue.words.map((w, wi) => (
                            <span key={wi} className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-600 font-medium">
                              {w}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">
                          <span className="text-gray-400">建议：</span>{issue.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 低风险提示 */}
              {complianceResult.issues.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                    <div className="text-sm text-gray-600">
                      <p className="font-medium text-gray-900 mb-1">内容合规</p>
                      <p>本内容未检测到敏感词、绝对化表达、夸大承诺或医疗/金融风险表达。可以直接进入发布流程。</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 导航 */}
              <div className="flex justify-center gap-3">
                <button
                  onClick={goPrev}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft size={16} />
                  上一步
                </button>
                <button
                  onClick={goNext}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                >
                  进入审核发布 <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 6: 审核发布 */}
          {currentStep === 6 && generatedContent && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">内容预览</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-base font-medium text-gray-900 mb-3">
                    {generatedContent.title}
                  </div>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {generatedContent.body}
                  </pre>
                </div>
              </div>

              {error && !generatedContent && (
                <div className="bg-white rounded-xl border border-gray-100">
                  <AIErrorBanner error={error} onRetry={handleGenerate} />
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">确认操作</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    将保存到当前项目的内容资产库
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    可在「内容资产库」查看和管理
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    支持一键复制全文
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={goPrev}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft size={16} />
                  返回合规检查
                </button>
                <button
                  onClick={handleSaveToAssets}
                  disabled={saved}
                  className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    saved
                      ? 'bg-emerald-500 text-white cursor-default'
                      : 'bg-brand-600 text-white hover:bg-brand-700'
                  }`}
                >
                  {saved ? (
                    <>
                      <Check size={16} />
                      已归档到资产库
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      确认归档
                    </>
                  )}
                </button>
              </div>

              {saved && (
                <div className="text-center">
                  <button
                    onClick={() => navigate('/factory/assets')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    <FolderOpen size={16} />
                    查看资产库
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      {currentStep === 1 && (
        <footer className="px-6 py-4 bg-white border-t border-gray-100 shrink-0">
          <div className="max-w-3xl mx-auto flex justify-end">
            <button
              onClick={goNext}
              disabled={!selectedTopicId}
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTopicId
                  ? 'bg-brand-600 text-white hover:bg-brand-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              下一步 <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      )}

      {currentStep === 2 && (
        <footer className="px-6 py-4 bg-white border-t border-gray-100 shrink-0">
          <div className="max-w-3xl mx-auto flex justify-between">
            <button
              onClick={goPrev}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft size={16} />
              上一步
            </button>
            <button
              onClick={goNext}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
            >
              下一步 <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      )}

      {currentStep === 3 && (
        <footer className="px-6 py-4 bg-white border-t border-gray-100 shrink-0">
          <div className="max-w-3xl mx-auto flex justify-between">
            <button
              onClick={goPrev}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft size={16} />
              上一步
            </button>
            <button
              onClick={goNext}
              disabled={!selectedStrategy}
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedStrategy
                  ? 'bg-brand-600 text-white hover:bg-brand-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              开始生成 <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}