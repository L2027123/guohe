import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { callAI, classifyAIError } from '../../utils/aiClient'
import AIErrorBanner from '../../components/AIErrorBanner'
import { trackFirstContentGeneration, trackEvent } from '../../utils/tracker'
import {
  Clapperboard,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Link2,
  Type,
  FileText,
  Lightbulb,
  Users,
  Video,
  Edit3,
  Target,
  Share2,
  RefreshCw,
  Save,
  Brain,
  MessageCircle,
  Eye,
  Zap,
  TrendingDown,
  Gauge,
  Camera,
  Clock,
  MapPin,
} from 'lucide-react'

// ===== 合规检查规则 =====
const COMPLIANCE_RULES = [
  { type: 'absolute', label: '绝对化表达', patterns: ['最', '第一', '唯一', '最佳', '最好', '最强', '100%', '彻底', '完美', '绝对', '没有任何', '零风险', '顶级', '极品', '万能', '史无前例', '空前', '绝无仅有', '无人能及', '永远', '永久', '终身'], suggestion: '替换为「较优」「领先」「优秀」等相对表达' },
  { type: 'exaggeration', label: '夸大承诺', patterns: ['保证', '一定能', '轻松月入', '日赚', '月入百万', '稳赚', '必赚', '包过', '包治', '立刻见效', '三天见效', '一周瘦', '月入过万', '躺赚', '秒变', '逆袭', '一夜暴富', '零成本', '零门槛', '无脑', '闭眼入'], suggestion: '避免承诺具体收益，改为「有望」「可能」等表述' },
  { type: 'medical', label: '医疗风险表达', patterns: ['治疗', '治愈', '疗效', '药效', '处方', '根治', '减肥药', '临床试验证明', '医学认证', '降血压', '降血糖', '抗癌', '防癌', '消炎', '杀菌', '医院专用', '医生推荐', '药用级', '医疗器械'], suggestion: '避免医疗效果承诺，改为「有助于」「可能改善」等表述' },
  { type: 'financial', label: '金融风险表达', patterns: ['投资回报', '收益率', '保本', '暴富', '稳赚不赔', '零风险投资', '年化', '理财必看', '翻倍', '涨停', '内部消息', '必涨', '抄底', '梭哈', '杠杆', '期货稳赢'], suggestion: '避免金融收益承诺，添加风险提示' },
  { type: 'sensitive', label: '敏感词', patterns: ['国家领导', '政府', '文革', '六四', '法轮功', '台独', '藏独', '疆独', '港独', '反华', '辱华', '政治', '维稳', '上访'], suggestion: '删除敏感政治表述，避免内容被平台审核拦截' },
  { type: 'vulgar', label: '低俗表达', patterns: ['卧槽', '牛逼', '撕逼', '绿茶婊', '屌丝', '装逼', '傻逼', '草', '妈的', '操', '贱', '骚', '约炮', '一夜情'], suggestion: '替换为文明用语，避免被平台限流或下架' },
]

const PLATFORM_RULES = {
  '小红书': [
    { type: 'planting', label: '种草广告感', patterns: ['加微信', '加我V', '私聊购买', '代购', '一手货源', '厂家直销', '全网最低价', '限时抢购', '仅限今天', '错过再等一年', '赶紧下单', '点击购买', '购物链接', '优惠券', '满减'], suggestion: '减少商业推销感，用真实体验代替直接卖货' },
    { type: 'exaggerated_ad', label: '夸大宣传', patterns: ['用了就白', '一周变白', '三天祛痘', '永久脱毛', '零毛孔', '返老还童', '逆龄', '冻龄', '童颜', '换脸级', '堪比医美', '替代手术'], suggestion: '避免夸大效果，用「有改善」「感觉更」等真实表述' },
  ],
  'TikTok': [
    { type: 'spam', label: 'Spam 垃圾表达', patterns: ['follow4follow', 'f4f', 'like4like', 'l4l', 'follow me', 'follow for follow', 'link in bio', 'click link', 'check my bio', 'dm me', 'comment below', 'tag 3 friends', 'share to win'], suggestion: '避免互动诱骗，用内容质量自然吸引关注' },
    { type: 'false_promise', label: '虚假承诺', patterns: ['guaranteed', '100% works', 'easy money', 'passive income', 'get rich', 'make $1000', 'no experience needed', 'work from home', 'free money', 'crypto tips', 'bitcoin guarantee'], suggestion: '删除虚假承诺，TikTok 对虚假收益表达审核严格' },
    { type: 'clickbait', label: '诱导点击', patterns: ['you wont believe', 'shocking', 'must watch', 'wait for it', 'part 2', 'nobody expected', 'this changed my life', 'stop scrolling', 'watch till end', 'secret revealed'], suggestion: '减少标题党表达，用真实价值留住观众' },
  ],
}

function runComplianceCheck(text, platform) {
  const issues = []
  for (const rule of COMPLIANCE_RULES) {
    const hits = rule.patterns.filter((p) => text.toLowerCase().includes(p.toLowerCase()))
    if (hits.length > 0) issues.push({ type: rule.type, label: rule.label, words: hits, suggestion: rule.suggestion, scope: '通用' })
  }
  const platformRules = PLATFORM_RULES[platform] || []
  for (const rule of platformRules) {
    const hits = rule.patterns.filter((p) => text.toLowerCase().includes(p.toLowerCase()))
    if (hits.length > 0) issues.push({ type: rule.type, label: rule.label, words: hits, suggestion: rule.suggestion, scope: platform })
  }
  let riskLevel = '低'
  if (issues.length >= 3) riskLevel = '高'
  else if (issues.length >= 1) riskLevel = '中'
  return { riskLevel, issues }
}

// ===== AI 内容导演 Prompt V3 =====
function buildDirectorPrompt(material, currentDNA, project, accountMemory, recentReviews, topicBrief) {
  const dnaText = currentDNA
    ? `
【我的风格模型】
- 内容人格：${currentDNA.contentPersona || ''}
- 内容结构：${currentDNA.writingStructure || ''}
- 视觉风格：${currentDNA.visualStyle || ''}
- 用户画像：${currentDNA.audience || ''}
- 标题套路：${currentDNA.titleFormula || ''}
- 常用表达：${(currentDNA.frequentExpressions || []).join('、') || '（暂无，将使用亲切口语化风格）'}
${currentDNA.topicPreference?.preferredTopics?.length > 0 ? `- 偏好选题：${currentDNA.topicPreference.preferredTopics.join('、')}` : ''}
${currentDNA.topicPreference?.avoidTopics?.length > 0 ? `- 避免选题：${currentDNA.topicPreference.avoidTopics.join('、')}` : ''}
${currentDNA.hookPreference?.bestHooks?.length > 0 ? `- 最佳Hook类型：${currentDNA.hookPreference.bestHooks.join('、')}` : ''}
${currentDNA.contentStructurePreference?.bestStructures?.length > 0 ? `- 最佳内容结构：${currentDNA.contentStructurePreference.bestStructures.join('、')}` : ''}`
    : '暂无风格模型数据，将使用亲切口语化风格生成'

  // 构建历史经验文本
  const memoryText = (() => {
    if (!accountMemory) return ''
    const parts = []
    
    // 历史爆款
    if (accountMemory.winningPatterns?.topics?.length > 0) {
      parts.push(`\n【账号已验证有效的内容规律】\n- 爆款选题：${accountMemory.winningPatterns.topics.slice(-5).join('、')}`)
    }
    if (accountMemory.winningPatterns?.hooks?.length > 0) {
      parts.push(`- 爆款Hook：${accountMemory.winningPatterns.hooks.slice(-3).join('、')}`)
    }
    
    // 失败模式
    if (accountMemory.failedPatterns?.topics?.length > 0) {
      parts.push(`\n【账号需要避免的失败模式】\n- 失败选题：${accountMemory.failedPatterns.topics.slice(-5).join('、')}`)
    }
    if (accountMemory.failedPatterns?.hooks?.length > 0) {
      parts.push(`- 失败Hook：${accountMemory.failedPatterns.hooks.slice(-3).join('、')}`)
    }
    if (accountMemory.failedPatterns?.reasons?.length > 0) {
      parts.push(`- 失败原因：${accountMemory.failedPatterns.reasons.slice(-3).join('、')}`)
    }
    
    // 最近复盘
    if (recentReviews?.recentHistory?.length > 0) {
      parts.push(`\n【最近复盘结论】`)
      recentReviews.recentHistory.slice(0, 3).forEach((h, i) => {
        const lessons = h.aiAnalysis?.lessons?.join('、') || ''
        if (lessons) {
          parts.push(`${i + 1}. 选题「${h.topic}」的经验教训：${lessons}`)
        }
      })
    }
    
    return parts.join('')
  })()

  return `你是一名短视频内容导演。你的工作不是写文章，而是帮助真人出镜的知识类博主，设计一个更容易被观看、互动、传播的视频内容。

你要分析的不是"这个话题好不好"，而是"用户为什么会在刷到这条视频时停下来，并且看完"。

【我的账号】
- 账号名称：${project?.name || ''}
- 平台：${project?.platform || ''}
- 领域：${project?.category || ''}
- 目标受众：${project?.targetAudience || ''}
${dnaText}
${memoryText}

【用户输入】
- 类型：${material.type}
- 内容：${material.content}
${topicBrief ? `
【选题 Brief（来自爆款选题助手，经过分析的内容机会）】
- 选题标题：${topicBrief.title || ''}
- 目标用户：${topicBrief.audience || ''}
- 核心痛点：${topicBrief.painPoint || ''}
- 情绪触发点：${topicBrief.emotionalTrigger || ''}
- 推荐Hook：${topicBrief.hook || ''}
- 推荐结构：${topicBrief.structure || ''}
- 账号匹配度：${topicBrief.accountFit || ''}
- 避免踩坑：${topicBrief.avoidPoints || ''}
- 选题评分：${topicBrief.score ? `总分${topicBrief.score.overall || '-'}/痛点${topicBrief.score.painPoint || '-'}/匹配${topicBrief.score.accountFit || '-'}/趋势${topicBrief.score.trend || '-'}` : ''}

【重要】这是经过选题分析后的内容。请基于选题 Brief 中的痛点、Hook 和结构建议生成方案，不要偏离选题方向。Brief 中的 avoidPoints 必须遵守。
` : ''}
【重要】你不是第一次帮助这个账号。根据账号过去内容表现：
- 优先复制已经验证有效的内容规律（选题、Hook、结构）
- 避免重复失败模式
- 如果没有历史数据，则基于通用短视频最佳实践生成

请输出严格 JSON 格式（不要 markdown 包裹），结构如下：

{
  "opportunity": {
    "userPainPoint": "用户具体痛点，一句话",
    "whyCare": "用户为什么会关注这个话题",
    "coreConflict": "核心冲突（常识vs真相/期望vs现实/认知vs事实），必须存在",
    "spreadAngle": "传播角度（实用/争议/共鸣/反常识/对比）",
    "searchIntent": "用户搜索这个话题时真正想解决的问题",
    "contentOpportunity": {
      "audienceMoment": "用户在哪个具体场景下会刷到并产生共鸣（如：早上闹钟响了起不来的时候）",
      "hiddenDesire": "用户真正想获得的心理满足（如：想确认自己不是生病了，只是习惯问题）",
      "avoidAngle": "这个话题最容易做成什么低价值内容，需要避免（如：避免做成泛泛的睡眠科普）"
    }
  },
  "structure": {
    "hook": {
      "text": "3秒Hook的口播原文",
      "type": "Hook类型（反常识/提问/场景/数据/故事）",
      "whyItWorks": "为什么这个Hook能让人停下来",
      "hookAnalysis": {
        "attentionTrigger": "触发停留的心理机制（如：恐惧缺失/好奇缺口/身份认同）",
        "curiosityGap": "用户不知道什么（开环信息）",
        "first3SecondsGoal": "前三秒必须完成什么（如：让用户确认这是自己的问题）"
      }
    },
    "contentFlow": [
      {
        "order": 1,
        "segment": "段落名称",
        "viewerQuestion": "这一段用户脑子里在想什么问题",
        "purpose": "这个段落要达成的目的",
        "emotion": "用户此时的情绪状态",
        "script": "这个段落的口播原文"
      }
    ],
    "emotionCurve": "情绪变化描述（如：好奇→共鸣→震惊→释然→行动）",
    "retentionDesign": {
      "openLoop": "开头留下什么未解决的问题，让用户想看答案",
      "midVideoReveal": "中间什么时候揭晓答案（如：第3段揭晓核心原因）",
      "dropRisk": [
        {"moment": "用户可能在哪一步划走", "reason": "为什么"}
      ],
      "fixStrategy": ["如何避免划走，具体策略"]
    },
    "interactionDesign": {
      "type": "互动类型（提问/争议/挑战/征集/站队）",
      "text": "引导互动的具体话术",
      "commentReason": "用户为什么愿意评论",
      "identityTrigger": "评论后用户获得什么身份认同（如：自律的人/懂行的人）",
      "discussionPotential": "是否容易形成用户之间讨论（高/中/低）"
    }
  },
  "adaptation": {
    "fitScore": 85,
    "fitReason": "适合度原因",
    "styleMatch": {
      "personaMatch": "内容人格匹配度分析",
      "languageMatch": "语言风格匹配度分析",
      "audienceMatch": "受众匹配度分析"
    },
    "personalOpinion": {
      "required": true,
      "suggestions": [
        {
          "position": "在哪里需要加入",
          "what": "需要补充什么内容",
          "suggestedLength": "建议补充多长（如：10-15秒，2-3句话）"
        }
      ]
    },
    "styleAdjustments": ["具体的用词替换建议，基于你的常用表达"]
  },
  "production": {
    "fullScript": "完整口播稿全文，可直接用于提词器，包含Hook+正文+互动",
    "scriptWordCount": 250,
    "estimatedDuration": "约60秒",
    "realCases": [
      {
        "position": "在正文第X段处",
        "suggestion": "建议补充你的真实经历或案例",
        "whyNeeded": "个人经历是内容差异化的核心，AI无法替代",
        "suggestedLength": "建议补充时长（如：10-15秒）"
      }
    ],
    "availableMaterial": [
      {"item": "需要准备的素材", "source": "用户需要自行准备/用户已有素材", "whenToShow": "在哪个段落展示"}
    ],
    "basicSetup": {
      "camera": "手机距离和景别（如：半身中近景，距离1-1.5米）",
      "environment": "场景选择理由（如：卧室拍摄，因为话题是睡眠）",
      "materialPreparation": "拍摄前需要准备的物品"
    },
    "shootingNotes": ["拍摄场景建议，不含表演指导"]
  },
  "publish": {
    "title": "包含冲突和好奇点的视频标题",
    "titleAlternatives": ["备选标题1", "备选标题2"],
    "coverDirection": {
      "style": "封面风格建议",
      "textSuggestion": "封面文字建议",
      "emotion": "封面传达的情绪"
    },
    "tags": ["话题标签1", "话题标签2"],
    "commentGuides": ["具体的评论引导问题1", "具体的评论引导问题2"],
    "bestPostTime": "建议发布时间"
  },
  "contentScore": {
    "attentionScore": 0,
    "retentionScore": 0,
    "interactionScore": 0,
    "overallScore": 0,
    "mainWeakness": "当前内容最大风险，一句话",
    "improvementSuggestion": "下一版怎么提升，一句话"
  },
  "historicalReference": {
    "usedPreviousSuccess": false,
    "references": [
      {
        "content": "引用的历史爆款内容或规律",
        "reason": "为什么这次适合引用"
      }
    ],
    "avoidedPatterns": ["这次避免了哪些历史失败模式"]
  }
}

【强制约束 - 必须遵守】
1. 语言风格：禁止使用AI腔表达（值得注意的是、综上所述、不难发现、关键不是...而是...、问题不在...在于...、不是...而是...），所有口播必须像真人在说话，用口语化表达
2. Hook禁令：禁止生成"今天分享...""大家好...""今天聊聊...""很多人不知道..."等普通开场。Hook必须满足：用户刷到时不知道后面答案、有明确冲突、不是标题式口号
3. 结构设计：不要固定使用"Hook→痛点→价值→互动"四段式，根据内容自然分段，必须有情绪起伏
4. 真实性约束：禁止编造医学数据、禁止编造用户经历、禁止编造专家观点、禁止编造用户测试结果。所有需要真实性的位置必须输出 needsPersonalInput:true 和 placeholder
5. 风格注入：如果有常用表达列表，自然融入；如果没有，用亲切口语化风格，不要编造用户口头禅
6. contentFlow.viewerQuestion：每一段必须回答用户脑子里正在想的问题，不是作者想说什么
7. 留存设计：必须分析用户在哪一步可能划走，并给出防划走策略
8. 互动设计：不能是"评论区告诉我"。必须让用户站队或分享具体信息，让评论后获得身份认同
9. shootingNotes：只提供场景级建议，不要指导表演动作（不要写"3秒抬头""眼神坚定""手势动作"）
10. availableMaterial：不要输出"温度计""天气截图"等AI幻想素材，只输出用户真实可能准备的素材
11. fullScript：禁止编造数据、编造引用、编造用户经历，需要用户补充的地方用[需要补充你的真实经历]标注
12. contentScore：必须给出0-100的评分，mainWeakness必须指出真实风险
13. 历史经验：如果提供了账号历史内容数据，必须在historicalReference中标注使用了哪些历史经验。如果没有历史数据，usedPreviousSuccess必须为false
14. 失败规避：如果提供了失败模式，必须在avoidedPatterns中列出这次规避了哪些失败模式

直接输出 JSON，不要其他解释。`
}

// ===== 修复 JSON 常见语法错误（AI 输出不规范时兜底） =====
function sanitizeJSONForParsing(str) {
  if (!str) return str
  // 去掉 markdown 代码块包裹
  let s = str.trim()
  if (s.startsWith('```')) s = s.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  // 去掉前后非 JSON 字符（取最外层 {} 或 []）
  const firstBrace = s.indexOf('{')
  const lastBrace = s.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) s = s.substring(firstBrace, lastBrace + 1)
  // 去掉数组/对象末尾多余逗号: ", ]" 和 ", }"（AI 常犯）
  s = s.replace(/,(\s*[}\]])/g, '$1')
  // 去掉控制字符（除了常见换行制表）
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  // 未转义的字符串内裸换行替换为 \n（AI 有时会在长字符串里硬换行）
  let inString = false
  let quote = ''
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    const prev = s[i - 1]
    if (!inString && (c === '"' || c === "'")) {
      inString = true
      quote = c
      out += '"'
      continue
    }
    if (inString && c === quote && prev !== '\\') {
      inString = false
      out += '"'
      continue
    }
    if (inString && c === '\n' && prev !== '\\') {
      out += '\\n'
      continue
    }
    if (inString && c === '\r' && prev !== '\\') {
      continue
    }
    // 字符串内单引号保留
    out += c
  }
  return out
}

// ===== 解析 AI 返回的 JSON =====
function parseDirectorResult(text) {
  try {
    // 先尝试标准路径：正则提取 JSON → 直接解析
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const raw = jsonMatch ? jsonMatch[0] : text
    try {
      return JSON.parse(raw)
    } catch (_firstError) {
      // 标准路径失败：用 JSON 修复后再解析
      const sanitized = sanitizeJSONForParsing(text)
      return JSON.parse(sanitized)
    }
  } catch (e) {
    throw new Error('AI 返回格式错误，请重试')
  }
}

// ===== 主组件 =====
export default function VideoDirector() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const projects = useStore((s) => s.projects)
  const allStyleDNA = useStore((s) => s.styleDNA)
  const allStyleRules = useStore((s) => s.styleRules)
  const addContent = useStore((s) => s.addContent)
  const moveContentToAsset = useStore((s) => s.moveContentToAsset)
  const getAccountMemory = useStore((s) => s.getAccountMemory)
  const ensureAccountMemory = useStore((s) => s.ensureAccountMemory)
  const getRecentReviews = useStore((s) => s.getRecentReviews)

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  )
  const currentDNA = useMemo(
    () => allStyleDNA.find((d) => d.projectId === currentProjectId && d.status === 'active'),
    [allStyleDNA, currentProjectId]
  )
  const confirmedRules = useMemo(
    () => allStyleRules.filter((r) => r.projectId === currentProjectId && r.confirmed),
    [allStyleRules, currentProjectId]
  )

  // ===== 历史记忆 =====
  // useEffect 初始化 memory（避免 render 期间触发 set）
  useEffect(() => {
    if (currentProjectId) {
      ensureAccountMemory(currentProjectId)
    }
  }, [currentProjectId, ensureAccountMemory])

  // ===== 处理来自爆款拆解实验室的跳转 =====
  useEffect(() => {
    if (location.state?.source === 'competitor-analysis' && location.state.analysisResult) {
      const analysis = location.state.analysisResult
      const originalInput = location.state.originalInput

      // 预填充创作内容
      if (originalInput?.title) {
        setTextIdea(`${originalInput.title}\n\n【爆款拆解参考】\nHook类型：${analysis.hookAnalysis?.hookType || ''}\n结构：${analysis.contentStructure?.fullStructure?.map(s => s.section).join(' → ') || ''}\n公式：${analysis.copyableFormula?.formula || ''}`)
        setInputType('text')
      } else if (originalInput?.content) {
        setArticleText(`${originalInput.content}\n\n【爆款拆解参考】\nHook类型：${analysis.hookAnalysis?.hookType || ''}\n可复制公式：${analysis.copyableFormula?.formula || ''}`)
        setInputType('article')
      }
    }

    // ===== 处理来自爆款选题助手的跳转 =====
    if (location.state?.source === 'topic-director' && location.state.topicBrief) {
      const tb = location.state.topicBrief
      setTopicBrief(tb)
      // 同时填入 textIdea 作为基础输入（兼容现有生成逻辑）
      const parts = [
        tb.title || '',
        tb.painPoint ? `【用户痛点】${tb.painPoint}` : '',
        tb.hook ? `【推荐Hook】${tb.hook}` : '',
        tb.structure ? `【推荐结构】${tb.structure}` : '',
        tb.audience ? `【目标用户】${tb.audience}` : '',
      ].filter(Boolean)
      setTextIdea(parts.join('\n'))
      setInputType('text')
    }
  }, [location.state])

  const accountMemory = useMemo(() => {
    if (!currentProjectId) return null
    return getAccountMemory(currentProjectId)
  }, [currentProjectId, getAccountMemory])

  const recentReviews = useMemo(() => {
    if (!currentProjectId) return { winningPatterns: null, failedPatterns: null, recentHistory: [] }
    return getRecentReviews(currentProjectId, 5)
  }, [currentProjectId, getRecentReviews])

  // ===== 状态 =====
  const [material, setMaterial] = useState(null)
  const [directorResult, setDirectorResult] = useState(null)
  const [complianceResult, setComplianceResult] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [saved, setSaved] = useState(false)

  // 输入状态
  const [inputType, setInputType] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [textIdea, setTextIdea] = useState('')
  const [articleText, setArticleText] = useState('')
  // 选题 Brief（来自爆款选题助手）
  const [topicBrief, setTopicBrief] = useState(null)

  const getApiKey = () => {
    const key = localStorage.getItem('contentos_api_key')
    if (!key) {
      setError('请先在设置页面配置 DeepSeek API Key')
      return null
    }
    return key
  }

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(''), 2000)
    } catch {}
  }

  const runComplianceOnFullScript = (result) => {
    const script = result?.production?.fullScript || ''
    const title = result?.publish?.title || ''
    const text = `${title} ${script}`
    const result2 = runComplianceCheck(text, currentProject?.platform)
    setComplianceResult(result2)
  }

  const handleGenerate = async () => {
    let m = null
    if (inputType === 'video') {
      if (!videoUrl.trim()) return
      m = { type: '爆款视频链接', content: videoUrl.trim() }
    } else if (inputType === 'text') {
      if (!textIdea.trim()) return
      m = { type: '文字想法', content: textIdea.trim() }
    } else if (inputType === 'article') {
      if (!articleText.trim()) return
      m = { type: '已有文章', content: articleText.trim() }
    }
    if (!m) return
    setMaterial(m)
    setDirectorResult(null)
    setComplianceResult(null)
    setError('')
    setSaved(false)

    const apiKey = getApiKey()
    if (!apiKey) return
    setIsAnalyzing(true)

    try {
      const prompt = buildDirectorPrompt(m, currentDNA, currentProject, accountMemory, recentReviews, topicBrief)
      const text = await callAI(apiKey, prompt, { temperature: 0.7, max_tokens: 4000 })
      const result = parseDirectorResult(text)
      setDirectorResult(result)
      runComplianceOnFullScript(result)
      trackFirstContentGeneration()
      trackEvent('content_generate')
    } catch (err) {
      const classified = classifyAIError(err)
      setError(classified.message)
    }
    setIsAnalyzing(false)
  }

  const handleRegenerate = () => {
    if (material) {
      setError('')
      setDirectorResult(null)
      setComplianceResult(null)
      setIsAnalyzing(true)
      const apiKey = getApiKey()
      if (!apiKey) { setIsAnalyzing(false); return }
      callAI(apiKey, buildDirectorPrompt(material, currentDNA, currentProject, accountMemory, recentReviews, topicBrief), { temperature: 0.8, max_tokens: 4000 })
        .then((text) => {
          const result = parseDirectorResult(text)
          setDirectorResult(result)
          runComplianceOnFullScript(result)
          trackFirstContentGeneration()
          trackEvent('content_generate')
        })
        .catch((err) => {
          const classified = classifyAIError(err)
          setError(classified.message)
        })
        .finally(() => setIsAnalyzing(false))
    }
  }

  const handleSaveToAssets = () => {
    if (!directorResult) return
    const r = directorResult
    const script = r.production?.fullScript || ''
    const title = r.publish?.title || '未命名视频'
    const hook = r.structure?.hook?.text || ''
    const body = JSON.stringify(r, null, 2)
    const contentId = addContent(currentProjectId, {
      title,
      body,
      hook,
      structure: r.opportunity ? JSON.stringify(r.opportunity) : '',
      cta: r.publish?.commentGuides?.[0] || '',
      styleDNAId: currentDNA?.id || null,
      styleRuleIds: confirmedRules.map((r) => r.id),
      generationSource: { type: 'ai', model: 'deepseek-chat', humanEdited: false },
      promptVersion: 'v5-content-director-retention',
    })
    moveContentToAsset(contentId)
    setSaved(true)
  }

  const handleReset = () => {
    setMaterial(null)
    setDirectorResult(null)
    setComplianceResult(null)
    setError('')
    setSaved(false)
    setInputType(null)
    setVideoUrl('')
    setTextIdea('')
    setArticleText('')
  }

  // ===== 3 个入口卡片 =====
  const entryCards = [
    { type: 'text', icon: Lightbulb, title: '一个想法', desc: '一句话、一个主题、一个灵感', color: 'bg-amber-50 text-amber-600', placeholder: '例如：为什么睡够8小时还是累？' },
    { type: 'video', icon: Link2, title: '爆款视频链接', desc: '粘贴爆款视频链接，AI 分析规律', color: 'bg-blue-50 text-blue-600', placeholder: '粘贴抖音/小红书/TikTok 视频链接' },
    { type: 'article', icon: FileText, title: '一篇文章', desc: '文章改视频，一键转换', color: 'bg-emerald-50 text-emerald-600', placeholder: '粘贴文章全文...' },
  ]

  const r = directorResult

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 */}
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 text-white flex items-center justify-center">
              <Clapperboard size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">创作导演</h1>
              <p className="text-sm text-gray-500 mt-0.5">从0生成爆款视频制作方案</p>
            </div>
          </div>
          {currentProject && (
            <div className="text-right">
              <div className="text-xs text-gray-400">当前账号</div>
              <div className="text-sm font-medium text-gray-700">{currentProject.name} · {currentProject.platform}</div>
            </div>
          )}
        </div>
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">

          {/* ===== 输入区 ===== */}
          {!directorResult && (
            <div className="space-y-5">
              {/* 选题 Brief 来源展示 */}
              {location.state?.source === 'topic-director' && topicBrief && (
                <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Target size={16} className="text-brand-600 shrink-0" />
                    <span className="text-sm font-medium text-brand-700">来自爆款选题助手</span>
                    {topicBrief.score?.overall != null && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-white text-brand-600 font-medium">爆款潜力 {topicBrief.score.overall}分</span>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {topicBrief.title && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 shrink-0 w-16">选题</span>
                        <span className="text-sm font-medium text-gray-900">{topicBrief.title}</span>
                      </div>
                    )}
                    {topicBrief.audience && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 shrink-0 w-16">目标用户</span>
                        <span className="text-sm text-gray-700">{topicBrief.audience}</span>
                      </div>
                    )}
                    {topicBrief.painPoint && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 shrink-0 w-16">核心痛点</span>
                        <span className="text-sm text-gray-700">{topicBrief.painPoint}</span>
                      </div>
                    )}
                    {topicBrief.structure && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 shrink-0 w-16">视频结构</span>
                        <span className="text-sm text-gray-700">{topicBrief.structure}</span>
                      </div>
                    )}
                    {topicBrief.hook && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 shrink-0 w-16">推荐Hook</span>
                        <span className="text-sm text-gray-900 font-medium">"{topicBrief.hook}"</span>
                      </div>
                    )}
                    {topicBrief.avoidPoints && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-amber-600 shrink-0 w-16">避免踩坑</span>
                        <span className="text-sm text-amber-700">{topicBrief.avoidPoints}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hero */}
              <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-brand-900 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[11px] mb-3">
                    <Sparkles size={12} /> 创作导演
                  </div>
                  <h2 className="text-2xl font-bold mb-2">你想做什么内容？</h2>
                  <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                    输入一个想法、一个爆款视频或一篇文章，AI 会帮你分析机会、设计结构、适配账号、生成完整拍摄方案。
                  </p>
                </div>
              </div>

              {/* 3 个入口 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {entryCards.map((card) => {
                  const Icon = card.icon
                  const isActive = inputType === card.type
                  return (
                    <div
                      key={card.type}
                      onClick={() => setInputType(card.type)}
                      className={`rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                        isActive ? 'border-brand-400 bg-brand-50/30 ring-2 ring-brand-200' : 'border-gray-100 bg-white'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mb-3 ${card.color}`}>
                        <Icon size={22} />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{card.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
                      {isActive && <CheckCircle2 size={18} className="text-brand-600 mt-2" />}
                    </div>
                  )
                })}
              </div>

              {/* 输入区 */}
              {inputType && (
                <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                  {inputType === 'video' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">爆款视频链接</label>
                      <input
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder={entryCards[1].placeholder}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:border-brand-400 focus:outline-none"
                      />
                    </div>
                  )}
                  {inputType === 'text' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">你的想法</label>
                      <textarea
                        value={textIdea}
                        onChange={(e) => setTextIdea(e.target.value)}
                        placeholder={entryCards[0].placeholder}
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:border-brand-400 focus:outline-none resize-none"
                      />
                    </div>
                  )}
                  {inputType === 'article' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">文章内容</label>
                      <textarea
                        value={articleText}
                        onChange={(e) => setArticleText(e.target.value)}
                        placeholder={entryCards[2].placeholder}
                        rows={6}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:border-brand-400 focus:outline-none resize-none"
                      />
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={handleGenerate}
                      disabled={
                        (inputType === 'video' && !videoUrl.trim()) ||
                        (inputType === 'text' && !textIdea.trim()) ||
                        (inputType === 'article' && !articleText.trim()) ||
                        isAnalyzing
                      }
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-brand-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      <Sparkles size={16} />
                      {isAnalyzing ? 'AI 正在导演...' : '生成视频方案'}
                      {!isAnalyzing && <ArrowRight size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* 风格模型提示 */}
              <div className={`rounded-xl border p-4 ${currentDNA ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-center gap-2">
                  <Brain size={18} className={currentDNA ? 'text-emerald-600' : 'text-amber-600'} />
                  <span className="text-sm font-medium text-gray-900">
                    {currentDNA ? `风格模型已就绪（v${currentDNA.version}）` : '尚未生成风格模型'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  {currentDNA
                    ? `AI 会自动匹配你的账号风格${currentDNA.frequentExpressions?.length ? `，融入 ${currentDNA.frequentExpressions.length} 个你的常用表达` : ''}`
                    : '建议先生成风格模型，AI 会用亲切口语化风格生成'}
                </p>
                {!currentDNA && (
                  <button
                    onClick={() => navigate('/workbench/account-brain')}
                    className="ml-7 mt-2 text-xs text-brand-600 font-medium hover:text-brand-700"
                  >
                    去生成风格模型 →
                  </button>
                )}
              </div>

              {/* 账号历史记忆 */}
              {accountMemory && (accountMemory.winningPatterns?.topics?.length > 0 || accountMemory.failedPatterns?.topics?.length > 0) && (
                <div className="rounded-xl border p-4 bg-gradient-to-r from-brand-50 to-purple-50 border-brand-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain size={16} className="text-brand-600" />
                    <span className="text-sm font-medium text-gray-900">账号历史记忆</span>
                    <span className="text-xs text-gray-400">已学习 {accountMemory.contentHistory?.length || 0} 条历史内容</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {accountMemory.winningPatterns?.topics?.length > 0 && (
                      <div className="bg-white/70 rounded-lg p-2.5">
                        <div className="text-[10px] text-emerald-600 font-medium mb-1">✅ 爆款选题</div>
                        <div className="flex flex-wrap gap-0.5">
                          {accountMemory.winningPatterns.topics.slice(-3).map((t, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {accountMemory.failedPatterns?.topics?.length > 0 && (
                      <div className="bg-white/70 rounded-lg p-2.5">
                        <div className="text-[10px] text-red-600 font-medium mb-1">⚠️ 避免选题</div>
                        <div className="flex flex-wrap gap-0.5">
                          {accountMemory.failedPatterns.topics.slice(-3).map((t, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">AI 会自动参考这些历史经验生成内容方案</p>
                </div>
              )}

              {/* 加载中 */}
              {isAnalyzing && (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                  <Loader2 size={32} className="text-brand-600 animate-spin mx-auto mb-4" />
                  <p className="text-sm text-gray-700 font-medium">AI 正在为你导演视频内容...</p>
                  <p className="text-xs text-gray-400 mt-2">分析机会、设计结构、适配账号、生成方案</p>
                </div>
              )}

              {error && !directorResult && <AIErrorBanner error={error} onRetry={handleGenerate} />}
            </div>
          )}

          {/* ===== 结果展示区 ===== */}
          {directorResult && r && (
            <div className="space-y-5">

              {/* 顶部操作栏 */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  输入：{material?.type} · {material?.content.slice(0, 40)}{material?.content.length > 40 ? '...' : ''}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleRegenerate} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <RefreshCw size={14} /> 重新生成
                  </button>
                  <button onClick={handleReset} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-brand-600 hover:text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors">
                    <Lightbulb size={14} /> 新的想法
                  </button>
                </div>
              </div>

              {/* 加载中遮罩（重新生成时） */}
              {isAnalyzing && (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                  <Loader2 size={32} className="text-brand-600 animate-spin mx-auto mb-4" />
                  <p className="text-sm text-gray-700 font-medium">AI 正在重新导演...</p>
                </div>
              )}

              {!isAnalyzing && error && <AIErrorBanner error={error} onRetry={handleRegenerate} />}

              {!isAnalyzing && !error && (
                <>
                  {/* ===== 第一卡：为什么值得做 ===== */}
                  {r.opportunity && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Users size={18} className="text-brand-600" />
                        <h3 className="font-semibold text-gray-900">为什么值得做</h3>
                        <span className="text-xs text-gray-400">内容机会分析</span>
                      </div>

                      <div className="rounded-xl bg-red-50 border border-red-100 p-4 mb-4">
                        <div className="text-xs font-medium text-red-600 mb-1">⚡ 核心冲突</div>
                        <div className="text-base font-semibold text-gray-900 leading-relaxed">{r.opportunity.coreConflict}</div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <div className="text-[11px] text-gray-400 mb-1">用户痛点</div>
                          <div className="text-sm text-gray-700 leading-relaxed">{r.opportunity.userPainPoint}</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <div className="text-[11px] text-gray-400 mb-1">为什么关注</div>
                          <div className="text-sm text-gray-700 leading-relaxed">{r.opportunity.whyCare}</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <div className="text-[11px] text-gray-400 mb-1">传播角度</div>
                          <div className="inline-block text-sm font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded">{r.opportunity.spreadAngle}</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <div className="text-[11px] text-gray-400 mb-1">搜索意图</div>
                          <div className="text-sm text-gray-700 leading-relaxed">{r.opportunity.searchIntent}</div>
                        </div>
                      </div>

                      {/* contentOpportunity */}
                      {r.opportunity.contentOpportunity && (
                        <div className="rounded-xl bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 p-4 space-y-3">
                          <div className="text-xs font-medium text-brand-700">观看场景深度分析</div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-white/70 rounded-lg p-3">
                              <div className="text-[11px] text-gray-400 mb-1 flex items-center gap-1"><Clock size={10} /> 观看瞬间</div>
                              <div className="text-xs text-gray-700 leading-relaxed">{r.opportunity.contentOpportunity.audienceMoment}</div>
                            </div>
                            <div className="bg-white/70 rounded-lg p-3">
                              <div className="text-[11px] text-gray-400 mb-1 flex items-center gap-1"><Zap size={10} /> 隐藏渴望</div>
                              <div className="text-xs text-gray-700 leading-relaxed">{r.opportunity.contentOpportunity.hiddenDesire}</div>
                            </div>
                            <div className="bg-white/70 rounded-lg p-3 border border-red-100">
                              <div className="text-[11px] text-red-400 mb-1 flex items-center gap-1"><AlertTriangle size={10} /> 避免方向</div>
                              <div className="text-xs text-gray-700 leading-relaxed">{r.opportunity.contentOpportunity.avoidAngle}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== 第二卡：怎么吸引用户 ===== */}
                  {r.structure && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Eye size={18} className="text-purple-600" />
                        <h3 className="font-semibold text-gray-900">怎么吸引用户</h3>
                        <span className="text-xs text-gray-400">停留 · 留存 · 互动</span>
                      </div>

                      {/* Hook */}
                      {r.structure.hook && (
                        <div className="rounded-xl bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-100 p-4 mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className="text-brand-600" />
                            <span className="text-xs font-medium text-brand-600">3秒 Hook</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-600">{r.structure.hook.type}</span>
                          </div>
                          <div className="text-lg font-semibold text-gray-900 mb-2 leading-snug">"{r.structure.hook.text}"</div>
                          <div className="text-xs text-gray-500 bg-white/60 rounded px-3 py-2 mb-3">💡 {r.structure.hook.whyItWorks}</div>

                          {/* hookAnalysis */}
                          {r.structure.hook.hookAnalysis && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                              <div className="bg-white/70 rounded-lg p-2.5">
                                <div className="text-[10px] text-gray-400 mb-1">注意力触发</div>
                                <div className="text-xs text-gray-700">{r.structure.hook.hookAnalysis.attentionTrigger}</div>
                              </div>
                              <div className="bg-white/70 rounded-lg p-2.5">
                                <div className="text-[10px] text-gray-400 mb-1">好奇缺口</div>
                                <div className="text-xs text-gray-700">{r.structure.hook.hookAnalysis.curiosityGap}</div>
                              </div>
                              <div className="bg-white/70 rounded-lg p-2.5">
                                <div className="text-[10px] text-gray-400 mb-1">前3秒目标</div>
                                <div className="text-xs text-gray-700">{r.structure.hook.hookAnalysis.first3SecondsGoal}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content Flow */}
                      {r.structure.contentFlow && r.structure.contentFlow.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs font-medium text-gray-500 mb-2">内容结构（每段回答用户脑中的问题）</div>
                          <div className="space-y-2">
                            {r.structure.contentFlow.map((segment, i) => (
                              <div key={i} className="rounded-lg bg-gray-50 p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 text-[10px] font-bold flex items-center justify-center">{segment.order}</span>
                                  <span className="text-sm font-medium text-gray-900">{segment.segment}</span>
                                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{segment.emotion}</span>
                                </div>
                                {segment.viewerQuestion && (
                                  <div className="text-[11px] text-purple-600 bg-purple-50 rounded px-2 py-1 mb-1.5 flex items-center gap-1">
                                    <MessageCircle size={10} />
                                    用户在想：{segment.viewerQuestion}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 mb-1">目的：{segment.purpose}</div>
                                <div className="text-sm text-gray-700 leading-relaxed">{segment.script}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Emotion Curve */}
                      {r.structure.emotionCurve && (
                        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 mb-3">
                          <div className="text-[11px] text-amber-600 font-medium mb-1">情绪变化曲线</div>
                          <div className="text-sm text-gray-700">{r.structure.emotionCurve}</div>
                        </div>
                      )}

                      {/* Retention Design */}
                      {r.structure.retentionDesign && (
                        <div className="rounded-xl bg-red-50 border border-red-200 p-4 mb-3">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingDown size={14} className="text-red-600" />
                            <span className="text-xs font-medium text-red-600">留存设计（防止划走）</span>
                          </div>
                          <div className="space-y-2.5">
                            <div className="bg-white/60 rounded-lg p-2.5">
                              <div className="text-[10px] text-gray-400 mb-0.5">开环（未解决问题）</div>
                              <div className="text-xs text-gray-700">{r.structure.retentionDesign.openLoop}</div>
                            </div>
                            <div className="bg-white/60 rounded-lg p-2.5">
                              <div className="text-[10px] text-gray-400 mb-0.5">中间揭晓</div>
                              <div className="text-xs text-gray-700">{r.structure.retentionDesign.midVideoReveal}</div>
                            </div>
                            {r.structure.retentionDesign.dropRisk?.length > 0 && (
                              <div>
                                <div className="text-[10px] text-red-500 mb-1">划走风险点</div>
                                {r.structure.retentionDesign.dropRisk.map((d, i) => (
                                  <div key={i} className="bg-white/60 rounded p-2 mb-1 text-xs">
                                    <span className="text-gray-900 font-medium">{d.moment}</span>
                                    <span className="text-gray-500 ml-1">— {d.reason}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {r.structure.retentionDesign.fixStrategy?.length > 0 && (
                              <div>
                                <div className="text-[10px] text-emerald-600 mb-1">防划走策略</div>
                                <ul className="space-y-0.5">
                                  {r.structure.retentionDesign.fixStrategy.map((s, i) => (
                                    <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                                      <span className="text-emerald-500 mt-0.5">→</span>
                                      <span>{s}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Interaction Design */}
                      {r.structure.interactionDesign && (
                        <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageCircle size={14} className="text-blue-600" />
                            <span className="text-xs font-medium text-blue-600">互动设计</span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">{r.structure.interactionDesign.type}</span>
                            {r.structure.interactionDesign.discussionPotential && (
                              <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                                r.structure.interactionDesign.discussionPotential === '高' ? 'bg-emerald-100 text-emerald-600' :
                                r.structure.interactionDesign.discussionPotential === '中' ? 'bg-amber-100 text-amber-600' :
                                'bg-gray-100 text-gray-500'
                              }`}>讨论潜力：{r.structure.interactionDesign.discussionPotential}</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-900 mb-2 font-medium">"{r.structure.interactionDesign.text}"</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="bg-white/60 rounded p-2">
                              <div className="text-[10px] text-gray-400 mb-0.5">用户为什么愿意评论</div>
                              <div className="text-xs text-gray-700">{r.structure.interactionDesign.commentReason}</div>
                            </div>
                            <div className="bg-white/60 rounded p-2">
                              <div className="text-[10px] text-gray-400 mb-0.5">评论后获得身份认同</div>
                              <div className="text-xs text-gray-700">{r.structure.interactionDesign.identityTrigger}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== 第三卡：你的账号怎么讲 ===== */}
                  {r.adaptation && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Target size={18} className="text-emerald-600" />
                        <h3 className="font-semibold text-gray-900">你的账号怎么讲</h3>
                        <span className="text-xs text-gray-400">账号适配</span>
                      </div>

                      {/* Fit Score */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${
                          r.adaptation.fitScore >= 80 ? 'bg-emerald-50 text-emerald-600' :
                          r.adaptation.fitScore >= 60 ? 'bg-amber-50 text-amber-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {r.adaptation.fitScore}
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">适合度评分</div>
                          <div className="text-sm text-gray-700">{r.adaptation.fitReason}</div>
                        </div>
                      </div>

                      {/* Style Match */}
                      {r.adaptation.styleMatch && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                          <div className="rounded-lg bg-gray-50 p-3">
                            <div className="text-[11px] text-gray-400 mb-1">内容人格</div>
                            <div className="text-xs text-gray-700 leading-relaxed">{r.adaptation.styleMatch.personaMatch}</div>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-3">
                            <div className="text-[11px] text-gray-400 mb-1">语言风格</div>
                            <div className="text-xs text-gray-700 leading-relaxed">{r.adaptation.styleMatch.languageMatch}</div>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-3">
                            <div className="text-[11px] text-gray-400 mb-1">受众匹配</div>
                            <div className="text-xs text-gray-700 leading-relaxed">{r.adaptation.styleMatch.audienceMatch}</div>
                          </div>
                        </div>
                      )}

                      {/* Personal Opinion */}
                      {r.adaptation.personalOpinion && r.adaptation.personalOpinion.suggestions?.length > 0 && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-3">
                          <div className="text-xs font-medium text-amber-700 mb-2">
                            ⚠️ 需要你加入的个人观点
                          </div>
                          <div className="space-y-2">
                            {r.adaptation.personalOpinion.suggestions.map((s, i) => {
                              const sug = typeof s === 'string' ? { what: s } : s
                              return (
                                <div key={i} className="bg-white/60 rounded-lg p-3">
                                  <div className="text-sm text-gray-700 leading-relaxed">{sug.what || sug.suggestion}</div>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    {sug.position && <span className="text-[11px] text-gray-500">📍 {sug.position}</span>}
                                    {sug.suggestedLength && <span className="text-[11px] text-brand-600">⏱ {sug.suggestedLength}</span>}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Style Adjustments */}
                      {r.adaptation.styleAdjustments?.length > 0 && (
                        <div className="rounded-lg bg-gray-50 p-3">
                          <div className="text-[11px] text-gray-400 mb-2">用词建议（基于你的语言习惯）</div>
                          <ul className="space-y-1">
                            {r.adaptation.styleAdjustments.map((s, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                                <span className="text-brand-400">→</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== 第四卡：完整口播稿 ===== */}
                  {r.production && r.production.fullScript && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Edit3 size={18} className="text-brand-600" />
                          <h3 className="font-semibold text-gray-900">完整口播稿</h3>
                          <span className="text-xs text-gray-400">
                            {r.production.scriptWordCount}字 · {r.production.estimatedDuration}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopy(r.production.fullScript, 'script')}
                          className="text-xs text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 px-3 py-1 rounded border border-brand-200 hover:bg-brand-50 transition-colors"
                        >
                          {copied === 'script' ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制全部</>}
                        </button>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-5">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{r.production.fullScript}</pre>
                      </div>

                      {/* 需要补充的个人经历标记 */}
                      {r.production.fullScript.includes('[需要补充') && (
                        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 p-3">
                          <div className="text-xs text-amber-700">
                            💡 口播稿中标记了 [需要补充你的真实经历] 的位置，请替换成你自己的故事
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== 第五卡：拍摄准备 ===== */}
                  {r.production && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Video size={18} className="text-purple-600" />
                        <h3 className="font-semibold text-gray-900">拍摄准备</h3>
                        <span className="text-xs text-gray-400">真人拍摄指南</span>
                      </div>

                      {/* 真实案例提醒 */}
                      {r.production.realCases?.length > 0 && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-4">
                          <div className="text-xs font-medium text-amber-700 mb-2">📝 请准备你的真实案例</div>
                          <div className="space-y-2">
                            {r.production.realCases.map((c, i) => (
                              <div key={i} className="text-sm bg-white/60 rounded-lg p-3">
                                <div className="text-gray-900 font-medium mb-0.5">{c.position}</div>
                                <div className="text-gray-600">{c.suggestion}</div>
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="text-[11px] text-gray-400">💡 {c.whyNeeded}</div>
                                  {c.suggestedLength && <span className="text-[11px] text-brand-600">⏱ {c.suggestedLength}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 基础拍摄设置 */}
                      {r.production.basicSetup && (
                        <div className="rounded-xl bg-purple-50 border border-purple-100 p-4 mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Camera size={14} className="text-purple-600" />
                            <span className="text-xs font-medium text-purple-600">基础拍摄设置</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="bg-white/70 rounded-lg p-3">
                              <div className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><Camera size={10} /> 镜头</div>
                              <div className="text-xs text-gray-700">{r.production.basicSetup.camera}</div>
                            </div>
                            <div className="bg-white/70 rounded-lg p-3">
                              <div className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><MapPin size={10} /> 场景</div>
                              <div className="text-xs text-gray-700">{r.production.basicSetup.environment}</div>
                            </div>
                            <div className="bg-white/70 rounded-lg p-3">
                              <div className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><FileText size={10} /> 准备物品</div>
                              <div className="text-xs text-gray-700">{r.production.basicSetup.materialPreparation}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 可用素材 */}
                      {r.production.availableMaterial?.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs font-medium text-gray-500 mb-2">素材准备</div>
                          <div className="space-y-2">
                            {r.production.availableMaterial.map((m, i) => (
                              <div key={i} className="flex items-start gap-2 rounded-lg bg-gray-50 p-3">
                                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                                  <FileText size={14} />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm text-gray-700">{m.item}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    {m.source && <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{m.source}</span>}
                                    {m.whenToShow && <span className="text-[11px] text-gray-500">展示时机：{m.whenToShow}</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 拍摄注意 */}
                      {r.production.shootingNotes?.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs font-medium text-gray-500 mb-2">拍摄注意</div>
                          <ul className="space-y-1.5">
                            {r.production.shootingNotes.map((n, i) => (
                              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="text-purple-400 mt-0.5">•</span>
                                <span>{n}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 合规检查 */}
                      {complianceResult && (
                        <div className={`mt-2 rounded-xl border p-3 ${
                          complianceResult.riskLevel === '低' ? 'bg-emerald-50 border-emerald-200' :
                          complianceResult.riskLevel === '中' ? 'bg-amber-50 border-amber-200' :
                          'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            {complianceResult.riskLevel === '低' ? <ShieldCheck size={16} className="text-emerald-600" /> :
                             complianceResult.riskLevel === '中' ? <AlertTriangle size={16} className="text-amber-600" /> :
                             <ShieldAlert size={16} className="text-red-600" />}
                            <span className="text-sm font-medium text-gray-900">
                              合规检查：{complianceResult.riskLevel}风险
                            </span>
                            {complianceResult.issues.length === 0 ? (
                              <span className="text-xs text-emerald-600">未检测到违规表达</span>
                            ) : (
                              <span className="text-xs text-amber-600">{complianceResult.issues.length}个风险点</span>
                            )}
                          </div>
                          {complianceResult.issues.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {complianceResult.issues.map((issue, i) => (
                                <div key={i} className="text-xs bg-white/60 rounded p-2">
                                  <span className="text-red-500 font-medium">{issue.label}</span>
                                  <span className="text-gray-700 ml-1">命中：{issue.words.join('、')}</span>
                                  <div className="text-gray-500 mt-0.5">建议：{issue.suggestion}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== 第六卡：发布优化 ===== */}
                  {r.publish && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Share2 size={18} className="text-blue-600" />
                        <h3 className="font-semibold text-gray-900">发布优化</h3>
                        <span className="text-xs text-gray-400">标题 · 封面 · 标签 · 发布</span>
                      </div>

                      {/* 标题 */}
                      <div className="mb-4">
                        <div className="text-xs font-medium text-gray-500 mb-2">推荐标题</div>
                        <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 mb-2">
                          <div className="flex items-center justify-between">
                            <div className="text-base font-semibold text-gray-900 leading-snug">{r.publish.title}</div>
                            <button onClick={() => handleCopy(r.publish.title, 'title')} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 shrink-0 ml-2">
                              {copied === 'title' ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                        {r.publish.titleAlternatives?.length > 0 && (
                          <div className="space-y-1.5">
                            {r.publish.titleAlternatives.map((t, i) => (
                              <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5">
                                <div className="text-sm text-gray-600">{t}</div>
                                <button onClick={() => handleCopy(t, `alt-title-${i}`)} className="text-xs text-gray-400 hover:text-brand-600 flex items-center gap-1">
                                  {copied === `alt-title-${i}` ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 封面方向 */}
                      {r.publish.coverDirection && (
                        <div className="rounded-lg bg-gray-50 p-3 mb-4">
                          <div className="text-xs font-medium text-gray-500 mb-1">封面建议</div>
                          <div className="text-sm text-gray-700">{r.publish.coverDirection.style}</div>
                          <div className="text-xs text-gray-600 mt-1">文字：{r.publish.coverDirection.textSuggestion}</div>
                          <div className="text-xs text-gray-500 mt-0.5">情绪：{r.publish.coverDirection.emotion}</div>
                        </div>
                      )}

                      {/* 标签 */}
                      {r.publish.tags?.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs font-medium text-gray-500 mb-2">话题标签</div>
                          <div className="flex flex-wrap gap-1.5">
                            {r.publish.tags.map((tag, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 评论引导 */}
                      {r.publish.commentGuides?.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs font-medium text-gray-500 mb-2">评论区引导</div>
                          <div className="space-y-1.5">
                            {r.publish.commentGuides.map((g, i) => (
                              <div key={i} className="flex items-center justify-between rounded-lg bg-blue-50 p-2.5">
                                <div className="text-sm text-gray-700">{g}</div>
                                <button onClick={() => handleCopy(g, `guide-${i}`)} className="text-xs text-gray-400 hover:text-brand-600 shrink-0 ml-2">
                                  {copied === `guide-${i}` ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 发布时间 */}
                      {r.publish.bestPostTime && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                          <div className="text-xs font-medium text-emerald-700 mb-1">最佳发布时间</div>
                          <div className="text-sm text-gray-700">{r.publish.bestPostTime}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== 第七卡：内容评分 ===== */}
                  {r.contentScore && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Gauge size={18} className="text-brand-600" />
                        <h3 className="font-semibold text-gray-900">内容评分</h3>
                        <span className="text-xs text-gray-400">AI 自评 · 供参考</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        {[
                          { label: '注意力', value: r.contentScore.attentionScore, icon: Eye, color: 'brand' },
                          { label: '留存率', value: r.contentScore.retentionScore, icon: TrendingDown, color: 'red' },
                          { label: '互动率', value: r.contentScore.interactionScore, icon: MessageCircle, color: 'blue' },
                          { label: '综合', value: r.contentScore.overallScore, icon: Gauge, color: 'purple' },
                        ].map((item, i) => {
                          const Icon = item.icon
                          const colorMap = {
                            brand: 'text-brand-600 bg-brand-50',
                            red: 'text-red-600 bg-red-50',
                            blue: 'text-blue-600 bg-blue-50',
                            purple: 'text-purple-600 bg-purple-50',
                          }
                          const valColor = item.value >= 80 ? 'text-emerald-600' : item.value >= 60 ? 'text-amber-600' : 'text-red-600'
                          return (
                            <div key={i} className="rounded-xl bg-gray-50 p-3 text-center">
                              <div className={`w-9 h-9 rounded-full mx-auto mb-2 flex items-center justify-center ${colorMap[item.color]}`}>
                                <Icon size={16} />
                              </div>
                              <div className={`text-2xl font-bold ${valColor}`}>{item.value}</div>
                              <div className="text-[11px] text-gray-400">{item.label}</div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                          <div className="text-[11px] text-red-600 font-medium mb-1">⚠️ 最大风险</div>
                          <div className="text-sm text-gray-700">{r.contentScore.mainWeakness}</div>
                        </div>
                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                          <div className="text-[11px] text-emerald-600 font-medium mb-1">💡 提升建议</div>
                          <div className="text-sm text-gray-700">{r.contentScore.improvementSuggestion}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===== historicalReference：历史经验引用 ===== */}
                  {r.historicalReference && (r.historicalReference.usedPreviousSuccess || r.historicalReference.avoidedPatterns?.length > 0) && (
                    <div className="bg-gradient-to-r from-emerald-50 to-brand-50 rounded-2xl border border-emerald-100 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain size={18} className="text-emerald-600" />
                        <h3 className="font-semibold text-gray-900">历史经验引用</h3>
                        {r.historicalReference.usedPreviousSuccess && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-medium">
                            已引用历史爆款
                          </span>
                        )}
                      </div>

                      {/* 引用的历史经验 */}
                      {r.historicalReference.references?.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-emerald-700 mb-2">✅ 本次引用的成功经验</div>
                          <div className="space-y-2">
                            {r.historicalReference.references.map((ref, i) => (
                              <div key={i} className="bg-white/70 rounded-lg p-3">
                                <div className="text-sm text-gray-800 font-medium">{ref.content}</div>
                                <div className="text-xs text-gray-500 mt-1">原因：{ref.reason}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 规避的失败模式 */}
                      {r.historicalReference.avoidedPatterns?.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-amber-700 mb-2">⚠️ 本次规避的失败模式</div>
                          <div className="flex flex-wrap gap-1.5">
                            {r.historicalReference.avoidedPatterns.map((p, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-lg">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 text-[11px] text-gray-500 bg-white/50 rounded p-2">
                        💡 这些历史经验来自账号之前的复盘数据，形成内容生产闭环
                      </div>
                    </div>
                  )}

                  {/* ===== 保存到资产库 + 复盘入口 ===== */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-400">
                      方案生成完成 · 共 {r.production?.fullScript?.length || 0} 字口播稿
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end gap-y-2">
                      <button
                        onClick={() => {
                          const statePayload = {
                            source: 'video-director-script',
                            hook: r.structure?.hook || null,
                            script: r.production?.fullScript || '',
                            structure: r.structure || null,
                            title: r.publish?.title || '',
                            cover: r.publish?.coverDirection || null,
                            shootingPlan: {
                              duration: r.production?.estimatedDuration || '',
                              basicSetup: r.production?.basicSetup || null,
                              availableMaterial: r.production?.availableMaterial || [],
                              shootingNotes: r.production?.shootingNotes || [],
                            },
                            projectId: currentProjectId,
                          }
                          navigate('/workbench/optimization-director', { state: statePayload })
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-colors shadow-sm"
                      >
                        <Lightbulb size={14} />
                        让 AI 复盘这个方案
                      </button>
                      {!saved ? (
                        <button
                          onClick={handleSaveToAssets}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                          <Save size={14} />
                          保存到资产库
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                          <CheckCircle2 size={14} />
                          已保存
                        </span>
                      )}
                      <button
                        onClick={() => navigate('/workbench/assets-center')}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        去资产中心
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
