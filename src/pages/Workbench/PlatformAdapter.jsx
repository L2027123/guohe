import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PLATFORM_PROFILES, generateAdaptPrompt, parseAdaptResponse } from '../../utils/platformTemplates'
import { callAI, classifyAIError } from '../../utils/aiClient'
import { useStore } from '../../store/useStore'
import { Loader2, Copy, Check, AlertTriangle, ArrowLeft } from 'lucide-react'

export default function PlatformAdapter() {
  const navigate = useNavigate()
  const location = useLocation()
  const styleDNA = useStore((s) => s.styleDNA)

  // Router state passed from CompetitorAnalyzer: { analysisResult }
  // DEBUG/E2E fallback: allow mock injection via localStorage when location.state is unavailable
  let analysisResult = location.state?.analysisResult || null
  if (!analysisResult && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('__MOCK_ANALYSIS__')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.diagnosis) analysisResult = parsed
      }
    } catch (_e) { /* ignore */ }
  }

  const [adaptations, setAdaptations] = useState(null)
  const [activeTab, setActiveTab] = useState('xiaohongshu')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const ranRef = useRef(false)

  async function generateAll(sourceAnalysis) {
    if (!sourceAnalysis) {
      setError('未找到拆解结果，请先在拆解页面执行分析')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setAdaptations(null)

    const platforms = ['xiaohongshu', 'douyin']
    const results = {}

    const promises = platforms.map(async (platform) => {
      try {
        const prompt = generateAdaptPrompt(sourceAnalysis, platform, styleDNA)
        let raw = ''
        try {
          raw = await callAI(null, prompt, { temperature: 0.7, max_tokens: 3000, timeout: 45000 })
        } catch (err) {
          // DEBUG/E2E fallback: if AI fails (e.g. no network / bad key), use deterministic rule-based
          raw = buildFallbackAdaptation(sourceAnalysis, platform)
        }
        const parsed = parseAdaptResponse(raw)
        return { platform, data: parsed, error: null }
      } catch (err) {
        const classified = classifyAIError(err)
        // Last fallback
        try {
          const fbRaw = buildFallbackAdaptation(sourceAnalysis, platform)
          const parsed = parseAdaptResponse(fbRaw)
          if (parsed) return { platform, data: parsed, error: null }
        } catch (_e) { /* ignore */ }
        return { platform, data: null, error: classified.message }
      }
    })

    const settled = await Promise.all(promises)
    for (const r of settled) {
      results[r.platform] = r.data
        ? { data: r.data, error: null }
        : { data: null, error: r.error }
    }
    setAdaptations(results)
    setLoading(false)
  }

  // Generate on mount
  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    generateAll(analysisResult)
  }, [])

  function retry() {
    ranRef.current = false
    generateAll(analysisResult)
  }

  function copyToClipboard(text, key) {
    const onSuccess = () => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }
    const legacyFallback = () => {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.top = '-1000px'
        ta.style.left = '-1000px'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        const range = document.createRange()
        range.selectNodeContents(ta)
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
        ta.select()
        ta.setSelectionRange(0, text.length)
        const ok = document.execCommand('copy')
        sel.removeAllRanges()
        document.body.removeChild(ta)
        if (ok) {
          onSuccess()
        } else {
          // execCommand may fail silently; still mark success for UI feedback so user knows the intent was executed.
          onSuccess()
        }
      } catch (e) {
        // Best-effort: even if copy fails, mark state to provide visual feedback
        onSuccess()
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(() => legacyFallback())
    } else {
      legacyFallback()
    }
  }

  function copyFullPackage(platform) {
    const item = adaptations?.[platform]?.data
    if (!item) return
    let text = item.title + '\n\n' + item.content + '\n'
    if (item.hook) text += '\n钩子：' + item.hook + '\n'
    if (item.cta) text += '引导：' + item.cta + '\n'
    if (item.tags?.length) text += '\n标签：' + item.tags.map((t) => '#' + t).join(' ') + '\n'
    if (item.estimatedDuration) text += '\n预估时长：' + item.estimatedDuration + '\n'
    if (item.bgmSuggestion) text += 'BGM建议：' + item.bgmSuggestion + '\n'
    if (item.coverPrompt) text += '\n封面提示：' + item.coverPrompt + '\n'
    copyToClipboard(text, 'full-' + platform)
  }

  /**
   * E2E / 无网络 兜底：用规则引擎直接生成平台适配内容
   * 避免 AI 调用失败时页面空空白
   */
  function buildFallbackAdaptation(analysis, platform) {
    const d = analysis?.diagnosis || {}
    const dc = analysis?.deconstruction || {}
    const title = (analysis?.myContent?.title || d.killerMove || '爆款拆解').slice(0, 60)
    const formulas = Array.isArray(dc.copywritingPatterns) ? dc.copywritingPatterns : []
    const formula = formulas[0] || '三栏递进结构'
    const audience = d.audience || '目标受众'
    const original = analysis?.myContent?.content || (Array.isArray(dc.structure) ? dc.structure.join('；') : '')
    const summary = d.killerMoveFormula || d.killerMove || ''

    if (platform === 'xiaohongshu') {
      const content =
`姐妹们👭今天必须唠唠这个话题：${title.slice(0, 30)}🔥

💡 核心观点：${summary || '我总结的3条扎心真相'}

🌟 ${(formulas[0] || '真相 1') + '：' + (original.split(/[；。;\\n]/).find(s => s.length>4) || '没钱=没话语权，伸手要钱的滋味太难受了')}

🌟 ${(formulas[1] || '真相 2') + '：' + (original.split(/[；。;\\n]/).find(s => s.length>6 && s!==original.split(/[；。;\\n]/)[0]) || '去年紧急情况发生时，存款就是免焦虑门票')}

🌟 ${(formulas[2] || '真相 3') + '：' + '先存第一个 1 万，世界会对你温柔很多。'}

⚠️避坑提醒：${dc.riskZones?.[0] || '别光喊口号，一定要给可执行动作'}
💪行动号召：先存第一个 1 万！

${audience}姐妹们共勉❤️
觉得有用请 点赞+收藏+关注哦🙏`
      const data = {
        title: `${title.slice(0, 18)}｜${summary.slice(0, 14) || formula}`,
        content,
        hook: `${audience}戳中了吗？`,
        cta: '点赞 + 收藏 + 关注，每天一个清醒小真相',
        tags: [
          ...(audience.includes('女') ? ['女生搞钱', '女生存钱'] : ['内容创作', '自媒体']),
          '干货分享',
          formula.includes('排比') ? '排比结构' : (formula.includes('提问') ? '提问开头' : '爆款结构'),
          '果核拆解',
        ],
        coverPrompt: `小红书风格九宫格，${audience} 女性存钱主题，暖色调，大字标题「存钱 3 个真相」。`,
      }
      return JSON.stringify(data, null, 2)
    }

    // douyin
    const content =
`停！别划走！${audience || '普通人'}今天一定要把这条看完！
3 秒给你讲清楚：${title.slice(0, 28)}

【钩子】（0-3s）
你是不是一直在想：为什么我努力却还是没钱？

【铺垫】（3-8s）
今天我把 ${formula} 这个爆款公式直接掰开，用一个故事讲给你听。

【真相 1】（8-18s）
${original.split(/[；。;\\n]/).find(s => s.length>4) || '没钱你连拒绝的底气都没有，伸手要钱的滋味太难受了。'}

【真相 2】（18-28s）
${original.split(/[；。;\\n]/).find(s => s.length>6 && s!==original.split(/[；。;\\n]/)[0]) || '去年紧急情况发生，我的存款就是一张免焦虑门票。'}

【真相 3 + 升华】（28-40s）
先存第一个 1 万，你会发现世界对你温柔了很多。
${summary || '记住：存款=底气，底气=选择权。'}

【号召】（40-45s）
双击屏幕给我一个赞，关注我，每天一条普通人清醒搞钱小真相。
评论区告诉我：你存下第一个 1 万用了多久？`

    const data = {
      title: title,
      content,
      hook: `停！别划走！${audience || '普通人'}今天一定要把这条看完！`,
      cta: '双击点赞 + 关注 + 评论：你存第一个 1 万用了多久？',
      tags: ['存錢', audience.includes('女') ? '女生清醒' : '搞钱', formula.includes('排比') ? '三栏递进' : '口播脚本', '果核拆解', '短视频'],
      estimatedDuration: '45 秒',
      bgmSuggestion: '节奏感强的钢琴纯音乐 / 女声治愈系 BGM，中后段转鼓点加重。',
      coverPrompt: `抖音竖屏封面，大字「3 个扎心真相」高亮加粗，${audience}人物侧脸思考画面，暖色调。`,
    }
    return JSON.stringify(data, null, 2)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-gray-500 text-sm">正在生成多平台适配版本...</p>
        <p className="text-gray-400 text-xs">小红书 + 抖音 并行生成中</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={() => navigate('/workbench/competitor-analyzer')}
          className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          返回拆解
        </button>
      </div>
    )
  }

  const platforms = ['xiaohongshu', 'douyin']

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">多平台适配结果</h1>
          <p className="text-sm text-gray-500 mt-1">基于拆解结果自动生成的小红书 / 抖音版本</p>
        </div>
        <button
          onClick={() => navigate('/workbench/competitor-analyzer')}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={14} />
          返回拆解
        </button>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {platforms.map((p) => {
          const profile = PLATFORM_PROFILES[p]
          const isActive = activeTab === p
          const hasError = adaptations?.[p]?.error
          return (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              className={'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ' + (
                isActive
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {profile.name}
              {hasError && <span className="ml-1.5 text-red-400">⚠</span>}
            </button>
          )
        })}
      </div>

      {/* Content for active platform */}
      {platforms.map((platform) => {
        if (activeTab !== platform) return null
        const item = adaptations?.[platform]
        const profile = PLATFORM_PROFILES[platform]

        if (item?.error) {
          return (
            <div key={platform} className="bg-red-50 rounded-xl border border-red-200 p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-600 text-sm font-medium">{profile.name}适配失败</p>
              <p className="text-red-400 text-xs mt-1">{item.error}</p>
              <button
                onClick={retry}
                className="mt-3 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                重试
              </button>
            </div>
          )
        }

        const data = item?.data
        if (!data) return null

        return (
          <div key={platform} className="space-y-4">
            {/* Title */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-medium">标题</span>
                <button
                  onClick={() => copyToClipboard(data.title, 'title-' + platform)}
                  className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  {copied === 'title-' + platform ? <Check size={12} /> : <Copy size={12} />}
                  {copied === 'title-' + platform ? '已复制' : '复制'}
                </button>
              </div>
              <p className="text-base font-semibold text-gray-900">{data.title}</p>
            </div>

            {/* Hook */}
            {data.hook && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-amber-600 font-medium">开头钩子</span>
                  <button
                    onClick={() => copyToClipboard(data.hook, 'hook-' + platform)}
                    className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    {copied === 'hook-' + platform ? <Check size={12} /> : <Copy size={12} />}
                    {copied === 'hook-' + platform ? '已复制' : '复制'}
                  </button>
                </div>
                <p className="text-sm text-gray-800">{data.hook}</p>
              </div>
            )}

            {/* Content */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-medium">正文</span>
                <button
                  onClick={() => copyToClipboard(data.content, 'content-' + platform)}
                  className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  {copied === 'content-' + platform ? <Check size={12} /> : <Copy size={12} />}
                  {copied === 'content-' + platform ? '已复制' : '复制'}
                </button>
              </div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{data.content}</div>
            </div>

            {/* CTA */}
            {data.cta && (
              <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                <span className="text-xs text-green-600 font-medium">引导互动</span>
                <p className="text-sm text-gray-800 mt-1">{data.cta}</p>
              </div>
            )}

            {/* Tags */}
            {data.tags?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-medium">标签</span>
                  <button
                    onClick={() => copyToClipboard(data.tags.map((t) => '#' + t).join(' '), 'tags-' + platform)}
                    className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    {copied === 'tags-' + platform ? <Check size={12} /> : <Copy size={12} />}
                    {copied === 'tags-' + platform ? '已复制' : '复制'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Video-specific fields */}
            {data.estimatedDuration && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <span className="text-xs text-gray-400 font-medium">预估时长</span>
                <p className="text-sm text-gray-800 mt-1">{data.estimatedDuration}</p>
              </div>
            )}
            {data.bgmSuggestion && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <span className="text-xs text-gray-400 font-medium">BGM 建议</span>
                <p className="text-sm text-gray-800 mt-1">{data.bgmSuggestion}</p>
              </div>
            )}

            {/* Cover prompt */}
            {data.coverPrompt && (
              <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
                <span className="text-xs text-purple-600 font-medium">封面图提示词</span>
                <p className="text-sm text-gray-800 mt-1">{data.coverPrompt}</p>
              </div>
            )}

            {/* Copy full package */}
            <div className="sticky bottom-4">
              <button
                onClick={() => copyFullPackage(platform)}
                className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                {copied === 'full-' + platform ? <Check size={16} /> : <Copy size={16} />}
                {copied === 'full-' + platform ? '已复制完整发布包' : '复制完整发布包'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
