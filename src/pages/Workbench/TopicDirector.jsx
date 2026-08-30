import { getApiKey } from '../../utils/apiKey'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { callAI, classifyAIError } from '../../utils/aiClient'
import { trackModuleClick } from '../../utils/tracker'
import PricingModal from '../../components/PricingModal'
import {
  Target,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowRight,
  Lightbulb,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  Zap,
  RefreshCw,
} from 'lucide-react'

// ===== JSON 修复兜底（同 VideoDirector / OptimizationDirector） =====
function sanitizeJSONForParsing(str) {
  if (!str) return str
  let s = str.trim()
  if (s.startsWith('```')) s = s.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  const firstBrace = s.indexOf('{')
  const lastBrace = s.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) s = s.substring(firstBrace, lastBrace + 1)
  s = s.replace(/,(\s*[}\]])/g, '$1')
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  let inString = false, quote = '', out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i], prev = s[i - 1]
    if (!inString && (c === '"' || c === "'")) { inString = true; quote = c; out += '"'; continue }
    if (inString && c === quote && prev !== '\\') { inString = false; out += '"'; continue }
    if (inString && c === '\n' && prev !== '\\') { out += '\\n'; continue }
    if (inString && c === '\r' && prev !== '\\') continue
    out += c
  }
  return out
}

function parseTopicResult(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const raw = jsonMatch ? jsonMatch[0] : text.trim()
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (_e) {
      const sanitized = sanitizeJSONForParsing(text)
      parsed = JSON.parse(sanitized)
    }
    if (!parsed.opportunities || !Array.isArray(parsed.opportunities) || parsed.opportunities.length === 0) {
      throw new Error('AI 返回数据不完整：缺少 opportunities')
    }
    return parsed
  } catch (e) {
    throw new Error('AI 返回格式错误：' + (e.message || '解析失败'))
  }
}

// ===== AI Prompt =====
function buildTopicPrompt(project, currentDNA, recentTopics, recentContents, performanceRecords, accountMemory) {
  const accountInfo = project
    ? `账号名称：${project.name}\n平台：${project.platform || '小红书'}\n领域：${project.category || '未指定'}\n目标用户：${project.targetAudience || '未指定'}`
    : '账号信息未配置'

  const styleInfo = currentDNA
    ? `内容风格：${currentDNA.toneDescription || currentDNA.contentPersona || '未分析'}\n常用表达：${(currentDNA.signaturePhrases || currentDNA.frequentExpressions || []).join('、') || '无'}\n内容人格：${currentDNA.contentPersona || '未分析'}\n用户画像：${currentDNA.audience || '未指定'}`
    : '风格未分析'

  // 最近选题/内容参考（避免重复）
  const recentTopicsText = recentTopics?.length > 0
    ? recentTopics.slice(-5).map(t => `- ${t.title || t.topic || '无标题'}`).join('\n')
    : '暂无历史选题'

  const recentContentsText = recentContents?.length > 0
    ? recentContents.slice(-5).map(c => `- ${c.title || c.topic || '无标题'}`).join('\n')
    : '暂无历史内容'

  // 内容表现数据分析
  let performanceText = ''
  if (performanceRecords && performanceRecords.length > 0) {
    const sorted = [...performanceRecords].sort((a, b) => {
      const aEng = (a.derivedMetrics?.engagementRate) || 0
      const bEng = (b.derivedMetrics?.engagementRate) || 0
      return bEng - aEng
    })
    const top3 = sorted.slice(0, 3)
    const bottom3 = sorted.slice(-3).reverse()
    const highPerformText = top3.map(r => {
      const m = r.metrics || {}
      return `- 「${r.title || '无标题'}」播放${m.views || 0} 点赞${m.likes || 0} 收藏${m.saves || 0} 互动率${((r.derivedMetrics?.engagementRate) || 0).toFixed(1)}%`
    }).join('\n')
    const lowPerformText = bottom3.map(r => {
      const m = r.metrics || {}
      return `- 「${r.title || '无标题'}」播放${m.views || 0} 互动率${((r.derivedMetrics?.engagementRate) || 0).toFixed(1)}%`
    }).join('\n')
    // 高频主题提取
    const allTitles = performanceRecords.map(r => r.title || '').filter(Boolean)
    performanceText = `\n## 内容表现数据\n### 高表现内容（复制方向）\n${highPerformText}\n\n### 低表现内容（避免方向）\n${lowPerformText}\n\n### 已验证有效方向\n${allTitles.slice(0, 5).map(t => `- ${t}`).join('\n') || '暂无'}`
  } else {
    performanceText = '\n## 内容表现数据\n这是新账号，暂无表现数据。请基于账号定位和行业规律推荐选题。'
  }

  // 账号记忆（AI 复盘沉淀的规律）
  let memoryText = ''
  if (accountMemory) {
    const parts = []
    if (accountMemory.winningPatterns?.topics?.length > 0) {
      parts.push(`### 已验证有效的选题方向\n${accountMemory.winningPatterns.topics.map(t => `- ${t}`).join('\n')}`)
    }
    if (accountMemory.winningPatterns?.hooks?.length > 0) {
      parts.push(`### 已验证有效的 Hook\n${accountMemory.winningPatterns.hooks.map(h => `- "${h}"`).join('\n')}`)
    }
    if (accountMemory.failedPatterns?.topics?.length > 0) {
      parts.push(`### 已验证失败的选题（必须避免）\n${accountMemory.failedPatterns.topics.map(t => `- ${t}`).join('\n')}`)
    }
    if (accountMemory.winningPatterns?.structures?.length > 0) {
      parts.push(`### 已验证有效的视频结构\n${accountMemory.winningPatterns.structures.map(s => `- ${s}`).join('\n')}`)
    }
    if (accountMemory.winningPatterns?.expressions?.length > 0) {
      parts.push(`### 已验证有效的表达方式\n${accountMemory.winningPatterns.expressions.map(e => `- ${e}`).join('\n')}`)
    }
    if (accountMemory.failedPatterns?.reasons?.length > 0) {
      parts.push(`### 已验证的失败原因\n${accountMemory.failedPatterns.reasons.map(r => `- ${r}`).join('\n')}`)
    }
    memoryText = parts.length > 0 ? `\n## 账号复盘记忆（AI 复盘沉淀的规律）\n${parts.join('\n\n')}` : ''
  }

  return `你是短视频内容策略顾问。你的任务是：根据账号定位、StyleDNA、历史内容、内容表现数据和账号复盘记忆，发现适合该账号今天创作的内容机会。

【严格禁止】
- 不要生成泛泛选题（如"健康饮食""运动健身"这类大方向，没有具体切入点）
- 不要重复用户已做过的选题
- 不要生成与账号定位无关的选题
- 每个选题必须解释：为什么现在值得做？为什么适合这个账号？

【必须结合】
- 用户痛点（具体的、可感知的痛点场景）
- 内容趋势（当前短视频平台什么样的内容正在起量）
- 账号定位（领域、平台、目标用户）
- StyleDNA（内容风格、常用表达、用户画像）
- 历史内容表现数据（高表现方向复制、低表现方向避免）
- 可传播角度（有争议性、有反差感、有共鸣点）

## 账号信息
${accountInfo}

## 风格信息
${styleInfo}
${performanceText}
${memoryText}

## 最近已做选题（避免重复）
${recentTopicsText}

## 最近已发布内容（避免重复）
${recentContentsText}

## 输出要求
直接输出严格 JSON，不要任何解释、markdown 或代码块标记。生成 5 个内容机会。每个机会必须包含完整分析和评分。JSON 结构如下：

{
  "opportunities": [
    {
      "title": "选题标题（10-20字，有吸引力）",
      "opportunity": "内容机会描述（1-2句话说明这是什么机会）",
      "audience": "目标受众（具体到人群+场景，如'25-35岁职场女性，加班后深夜刷手机时'）",
      "painPoint": "用户痛点（具体场景，如'每天睡8小时还是困，以为自己生病了'）",
      "emotionalTrigger": "情绪触发点（如'焦虑+好奇'、'共鸣+释然'）",
      "whyNow": "为什么现在适合做（趋势/季节/热点/平台算法）",
      "accountFit": "这个账号为什么适合做（与定位/风格/受众的匹配点）",
      "hook": "推荐开头Hook（3秒内抓住注意力的具体话术，不能是描述）",
      "structure": "推荐视频结构（如'Hook→痛点场景→反常识揭秘→解决方案→互动'）",
      "avoidPoints": "这个选题容易踩的坑（如'避免变成纯科普'、'避免过度承诺效果'）",
      "score": {
        "overall": 0-100,
        "painPoint": 0-100,
        "accountFit": 0-100,
        "trend": 0-100,
        "difficulty": 0-100
      }
    }
  ],
  "contentDirection": "今日整体内容方向建议（1-2句话）",
  "avoidTopics": ["建议避免的选题1", "建议避免的选题2"]
}

强制：
- opportunities 必须有 5 条
- 每条必须包含所有字段，score 必须有全部 5 个子字段
- hook 必须是具体可用的开头话术，不能是"用反常识开头"这种描述
- score.difficulty 越高表示越难执行（100=最难）
- 避免与"最近已做选题"和"最近已发布内容"重复
- 如果有表现数据，优先推荐与高表现内容同方向但有差异化的选题
- 如果有复盘记忆，必须避免「已验证失败的选题」，优先推荐与「已验证有效的选题方向」同类的机会
`
}

export default function TopicDirector() {
  const navigate = useNavigate()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const projects = useStore((s) => s.projects)
  const allStyleDNA = useStore((s) => s.styleDNA)
  const topics = useStore((s) => s.topics)
  const contents = useStore((s) => s.contents)
  const performanceRecords = useStore((s) => s.performanceRecords)
  const getAccountMemory = useStore((s) => s.getAccountMemory)
  const hasCredit = useStore((s) => s.hasCredit)
  const consumeCredit = useStore((s) => s.consumeCredit)
  const credits = useStore((s) => s.credits)

  const project = useMemo(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  )
  const currentDNA = useMemo(
    () => allStyleDNA.find((d) => d.projectId === currentProjectId && d.status === 'active'),
    [allStyleDNA, currentProjectId]
  )
  const recentTopics = useMemo(
    () => topics.filter((t) => t.projectId === currentProjectId),
    [topics, currentProjectId]
  )
  const recentContents = useMemo(
    () => contents.filter((c) => c.projectId === currentProjectId),
    [contents, currentProjectId]
  )
  const projectPerformanceRecords = useMemo(
    () => performanceRecords.filter((r) => r.projectId === currentProjectId),
    [performanceRecords, currentProjectId]
  )
  const accountMemory = useMemo(
    () => currentProjectId ? getAccountMemory(currentProjectId) : null,
    [currentProjectId, getAccountMemory]
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [showPricing, setShowPricing] = useState(false)

  const handleDiscover = async () => {
    // ① 额度前置校验：复用 aiGenerate 额度（免费 5 次，Pro 无限）
    if (!hasCredit('aiGenerate')) {
      setShowPricing(true)
      return
    }
    // ② API Key 前置校验（禁止静默 return，让用户感知问题）
    const apiKey = getApiKey()
    if (!apiKey) {
      setError('请先在设置页面配置 DeepSeek API Key')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const prompt = buildTopicPrompt(project, currentDNA, recentTopics, recentContents, projectPerformanceRecords, accountMemory)
      const text = await callAI(apiKey, prompt, { temperature: 0.8, max_tokens: 2000 })
      const parsed = parseTopicResult(text)
      // ③ 成功解析后才扣额度（与 CompetitorAnalyzer 策略一致）
      if (parsed) {
        consumeCredit('aiGenerate')
        setResult(parsed)
      } else {
        setError('AI 返回格式异常，请重试，或检查 API Key 是否有效')
      }
    } catch (err) {
      const classified = classifyAIError(err)
      setError(classified.message || '分析失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleUseTopic = (opp) => {
    navigate('/workbench/video-director', {
      state: {
        source: 'topic-director',
        topicBrief: {
          title: opp.title || '',
          audience: opp.audience || '',
          painPoint: opp.painPoint || '',
          emotionalTrigger: opp.emotionalTrigger || '',
          hook: opp.hook || '',
          structure: opp.structure || '',
          accountFit: opp.accountFit || '',
          avoidPoints: opp.avoidPoints || '',
          score: opp.score || {},
        },
      },
    })
  }

  const scoreColor = (s) => {
    if (s >= 80) return 'text-emerald-600'
    if (s >= 60) return 'text-amber-600'
    return 'text-red-500'
  }

  const difficultyColor = (d) => {
    if (d === '低') return 'bg-emerald-100 text-emerald-700'
    if (d === '中') return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 */}
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 text-white flex items-center justify-center">
              <Target size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">爆款选题助手</h1>
              <p className="text-sm text-gray-500 mt-0.5">找到今天值得做的内容</p>
            </div>
          </div>
          {project && (
            <div className="text-right">
              <div className="text-xs text-gray-400">当前账号</div>
              <div className="text-sm font-medium text-gray-700">{project.name} · {project.platform}</div>
            </div>
          )}
        </div>
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-brand-900 rounded-2xl p-6 text-white relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[11px] mb-3">
                <Sparkles size={12} /> 爆款选题助手
              </div>
              <h2 className="text-2xl font-bold mb-2">今天做什么内容？</h2>
              <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                AI 根据你的账号定位、目标用户和内容方向，发现值得尝试的选题机会。
              </p>
            </div>
          </div>

          {/* 账号信息卡 */}
          {project && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                    <Users size={18} className="text-brand-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400 mb-0.5">账号 & 平台</div>
                    <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    <div className="text-xs text-gray-500">{project.platform}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Target size={18} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400 mb-0.5">领域</div>
                    <div className="text-sm font-medium text-gray-900">{project.category || '未指定'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <Users size={18} className="text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400 mb-0.5">目标用户</div>
                    <div className="text-sm font-medium text-gray-900">{project.targetAudience || '未指定'}</div>
                  </div>
                </div>
              </div>
              {currentDNA && (
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400">风格 DNA：</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{currentDNA.toneDescription || currentDNA.contentPersona || '已分析'}</span>
                  {(currentDNA.signaturePhrases || currentDNA.frequentExpressions || []).slice(0, 3).map((p, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{p}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 发现按钮 / Loading */}
          {!result && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 size={32} className="animate-spin text-brand-600" />
                  <div className="text-sm text-gray-500">AI 正在分析你的账号定位，发现选题机会...</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                    <Target size={28} className="text-white" />
                  </div>
                  <div>
                    <div className="text-base font-medium text-gray-900 mb-1">发现今日选题机会</div>
                    <div className="text-sm text-gray-500">AI 将根据你的账号定位、风格和历史内容，生成 5 个值得尝试的选题</div>
                  </div>
                  <button
                    onClick={handleDiscover}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <Sparkles size={16} />
                    发现今日选题机会
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* ===== 结果区 ===== */}
          {result && (
            <div className="space-y-4">
              {/* 整体方向 */}
              {result.contentDirection && (
                <div className="bg-gradient-to-r from-brand-50 to-purple-50 rounded-2xl border border-brand-100 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-brand-600" />
                    <span className="text-sm font-medium text-brand-700">今日内容方向</span>
                  </div>
                  <div className="text-sm text-gray-800 leading-relaxed">{result.contentDirection}</div>
                </div>
              )}

              {/* 5 张选题卡 */}
              {result.opportunities.map((opp, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  {/* 标题行 + 评分 */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 leading-snug">{opp.title}</h3>
                        {opp.opportunity && (
                          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{opp.opportunity}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {opp.emotionalTrigger && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{opp.emotionalTrigger}</span>
                          )}
                          {opp.audience && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{opp.audience}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* 爆款潜力评分 */}
                    {opp.score?.overall != null && (
                      <div className="text-center shrink-0">
                        <div className={`text-2xl font-bold ${scoreColor(opp.score.overall)}`}>{opp.score.overall}</div>
                        <div className="text-[10px] text-gray-400">爆款潜力</div>
                      </div>
                    )}
                  </div>

                  {/* 评分细分 */}
                  {opp.score && (
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[
                        { label: '痛点', value: opp.score.painPoint, color: 'text-red-500' },
                        { label: '匹配', value: opp.score.accountFit, color: 'text-emerald-600' },
                        { label: '趋势', value: opp.score.trend, color: 'text-brand-600' },
                        { label: '难度', value: opp.score.difficulty, color: opp.score.difficulty >= 70 ? 'text-red-500' : 'text-amber-600' },
                      ].map((s, si) => (
                        <div key={si} className="bg-gray-50 rounded-lg p-2 text-center">
                          <div className={`text-sm font-bold ${s.color}`}>{s.value ?? '-'}</div>
                          <div className="text-[10px] text-gray-400">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 信息网格 */}
                  <div className="space-y-3 mb-4">
                    {opp.painPoint && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-red-500 shrink-0 w-16">用户痛点</span>
                        <span className="text-sm text-gray-700 flex-1">{opp.painPoint}</span>
                      </div>
                    )}
                    {opp.whyNow && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-brand-600 shrink-0 w-16">为什么现在</span>
                        <span className="text-sm text-gray-700 flex-1">{opp.whyNow}</span>
                      </div>
                    )}
                    {opp.accountFit && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-emerald-600 shrink-0 w-16">推荐理由</span>
                        <span className="text-sm text-gray-700 flex-1">{opp.accountFit}</span>
                      </div>
                    )}
                    {opp.structure && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-purple-600 shrink-0 w-16">视频结构</span>
                        <span className="text-sm text-gray-700 flex-1">{opp.structure}</span>
                      </div>
                    )}
                    {opp.avoidPoints && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-amber-600 shrink-0 w-16">避免踩坑</span>
                        <span className="text-sm text-gray-600 flex-1">{opp.avoidPoints}</span>
                      </div>
                    )}
                  </div>

                  {/* Hook 卡片 */}
                  {opp.hook && (
                    <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-3 mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb size={14} className="text-amber-600" />
                        <span className="text-xs font-medium text-amber-700">推荐开头 Hook</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 leading-snug">"{opp.hook}"</div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => handleUseTopic(opp)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Zap size={14} />
                      生成视频方案
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {/* 建议避免的选题 */}
              {result.avoidTopics?.length > 0 && (
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">建议避免的选题</span>
                  </div>
                  <div className="space-y-1.5">
                    {result.avoidTopics.map((t, i) => (
                      <div key={i} className="text-sm text-gray-500 flex items-start gap-2">
                        <span className="text-gray-300 mt-0.5">·</span>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 重新发现 */}
              <div className="flex justify-center pt-2 pb-4">
                <button
                  onClick={handleDiscover}
                  disabled={loading}
                  className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} />
                  重新发现选题
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </div>
  )
}
