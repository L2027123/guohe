import { getApiKey } from '../../utils/apiKey'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { callAI, classifyAIError } from '../../utils/aiClient'
import { smartRecognize } from '../../utils/visionOCR'
import AIErrorBanner from '../../components/AIErrorBanner'
import UpgradePrompt from '../../components/UpgradePrompt'
import { usePageDwellTracking } from '../../utils/usePageDwellTracking'
import {
  TrendingUp,
  Loader2,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  RotateCcw,
  ArrowRight,
  Brain,
  Rocket,
  Camera,
} from 'lucide-react'

// 默认表单
const EMPTY_FORM = {
  title: '',
  hook: '',
  topic: '',
  views: '',
  likes: '',
  comments: '',
  saves: '',
  shares: '',
}

// 从 OCR 识别文本中提取数据指标
function extractMetricsFromText(text) {
  const result = { _count: 0 }
  if (!text) return result

  // 按行扫描，匹配"标签 + 数字"模式
  const lines = text.split(/\n|，|,|｜|\||\s{2,}/)

  // 关键词到字段的映射（覆盖小红书/抖音/视频号创作者后台常见表述）
  const fieldKeywords = {
    views: ['播放', '浏览', '阅读', '观看', '曝光', '展现'],
    likes: ['点赞', '赞', '喜欢'],
    comments: ['评论', '留言'],
    saves: ['收藏', '保存', '星标'],
    shares: ['转发', '分享', '转载'],
  }

  for (const line of lines) {
    // 提取行中所有数字（支持万、千、亿单位）
    const numMatch = line.match(/([\d,.]+)\s*[万千亿]?/)
    if (!numMatch) continue

    let numStr = numMatch[1].replace(/,/g, '')
    let num = parseFloat(numStr)
    if (isNaN(num)) continue

    // 处理中文单位
    if (line.includes('万') && num < 1000) num *= 10000
    else if (line.includes('千') && num < 100) num *= 1000
    else if (line.includes('亿') && num < 100) num *= 100000000

    num = Math.round(num)

    // 匹配关键词
    for (const [field, keywords] of Object.entries(fieldKeywords)) {
      if (result[field] !== undefined) continue // 已填
      if (keywords.some((kw) => line.includes(kw))) {
        result[field] = String(num)
        result._count++
        break
      }
    }
  }

  return result
}

export default function PerformanceReview() {
  usePageDwellTracking('PerformanceReview')
  const navigate = useNavigate()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const projects = useStore((s) => s.projects)
  const allAssets = useStore((s) => s.assets)
  const apiKey = useStore((s) => s.apiKey) || getApiKey() || ''
  const addPerformanceRecord = useStore((s) => s.addPerformanceRecord)
  const analyzePerformanceRecord = useStore((s) => s.analyzePerformanceRecord)
  const learnFromPerformance = useStore((s) => s.learnFromPerformance)
  const extractPattern = useStore((s) => s.extractPattern)
  const ensureAccountMemory = useStore((s) => s.ensureAccountMemory)
  const addContentHistory = useStore((s) => s.addContentHistory)
  const updateMemoryPatterns = useStore((s) => s.updateMemoryPatterns)
  const hasCredit = useStore((s) => s.hasCredit)
  const consumeCredit = useStore((s) => s.consumeCredit)
  const getRemainingCredits = useStore((s) => s.getRemainingCredits)
  const credits = useStore((s) => s.credits)

  const project = projects.find((p) => p.id === currentProjectId)
  const projectAssets = useMemo(
    () => allAssets.filter((a) => a.projectId === currentProjectId),
    [allAssets, currentProjectId]
  )

  const [form, setForm] = useState(EMPTY_FORM)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLearning, setIsLearning] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [savedRecordId, setSavedRecordId] = useState(null)
  const [learnedSummary, setLearnedSummary] = useState(null)
  const [isOCR, setIsOCR] = useState(false)
  const [ocrProgress, setOCRProgress] = useState('')
  const fileInputRef = useRef(null)

  // 确保账号记忆存在
  useEffect(() => {
    if (currentProjectId) ensureAccountMemory(currentProjectId)
  }, [currentProjectId, ensureAccountMemory])

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleSelectAsset = (assetId) => {
    const asset = projectAssets.find((a) => a.id === assetId)
    if (!asset) return
    setForm({
      ...EMPTY_FORM,
      title: asset.title || '',
      hook: asset.hook || '',
      topic: asset.topicId || '',
    })
    setAnalysis(null)
    setSavedRecordId(null)
    setLearnedSummary(null)
  }

  // 截图 OCR 识别数据并回填
  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // 允许重复选同一文件
    setError('')
    setIsOCR(true)
    setOCRProgress('正在识别截图...')
    try {
      const { text } = await smartRecognize(file, (phase, pct) => {
        if (phase === 'vision') {
          setOCRProgress(`AI 视觉识别中 ${pct}%`)
        } else if (phase === 'ocr') {
          setOCRProgress(`文字识别中 ${pct}%`)
        } else if (phase === 'init') {
          setOCRProgress('正在初始化识别引擎...')
        }
      })

      // 从识别文本中提取数字
      const extracted = extractMetricsFromText(text)
      if (extracted._count > 0) {
        setForm((f) => ({
          ...f,
          views: extracted.views ?? f.views,
          likes: extracted.likes ?? f.likes,
          comments: extracted.comments ?? f.comments,
          saves: extracted.saves ?? f.saves,
          shares: extracted.shares ?? f.shares,
        }))
        setOCRProgress(`已识别 ${extracted._count} 个数据项，请核对`)
        setTimeout(() => setOCRProgress(''), 3000)
      } else {
        setOCRProgress('未识别到数据，请手动填写')
        setTimeout(() => setOCRProgress(''), 3000)
      }
    } catch (err) {
      setError('截图识别失败：' + (err.message || '请重试或手动填写'))
      setOCRProgress('')
    } finally {
      setIsOCR(false)
    }
  }

  // 计算「互动率」辅助显示
  const engagementRate = useMemo(() => {
    const v = Number(form.views) || 0
    if (v === 0) return 0
    const l = Number(form.likes) || 0
    const c = Number(form.comments) || 0
    const s = Number(form.saves) || 0
    return +(((l + c + s) / v) * 100).toFixed(2)
  }, [form])

  // 第一步：AI 分析成功/失败原因
  const handleAnalyze = async () => {
    setError('')
    setAnalysis(null)
    setSavedRecordId(null)
    setLearnedSummary(null)

    if (!form.title.trim()) {
      setError('请先输入作品标题')
      return
    }
    if (!form.views || Number(form.views) === 0) {
      setError('请输入播放量，至少需要这个数据才能分析')
      return
    }
    if (!apiKey) {
      setError('请先在设置页面配置 DeepSeek API Key')
      return
    }

    // 额度校验：免费体验限制
    if (!hasCredit('performanceReview')) {
      setError('你的账号大脑已经建立，升级后可继续学习和生成。')
      return
    }

    setIsAnalyzing(true)
    try {
      const v = Number(form.views) || 0
      const l = Number(form.likes) || 0
      const c = Number(form.comments) || 0
      const s = Number(form.saves) || 0
      const sh = Number(form.shares) || 0
      const rate = v > 0 ? +(((l + c + s) / v) * 100).toFixed(2) : 0
      const level = rate >= 10 ? '高表现' : rate >= 5 ? '中表现' : '低表现'

      const prompt = `你是一位小红书内容运营专家，请根据以下作品的真实数据，分析它为什么表现${level}，并提炼可复用的经验。

【作品信息】
- 标题：${form.title}
- Hook：${form.hook || '未提供'}
- 选题：${form.topic || '未提供'}
- 平台：${project?.platform || '小红书'}
- 账号定位：${project?.positioning || project?.category || '未提供'}

【真实数据】
- 播放量：${v}
- 点赞：${l}（点赞率 ${(v > 0 ? (l / v * 100) : 0).toFixed(2)}%）
- 评论：${c}（评论率 ${(v > 0 ? (c / v * 100) : 0).toFixed(2)}%）
- 收藏：${s}（收藏率 ${(v > 0 ? (s / v * 100) : 0).toFixed(2)}%）
- 转发：${sh}
- 综合互动率：${rate}%（判断为${level}）

请输出严格 JSON（不要 markdown 包裹）：
{
  "verdict": "${level}",
  "whyWorked": ["成功原因1（必须具体到标题/Hook/选题某个元素）", "成功原因2"],
  "whyFailed": ["失败原因1（如果表现好，写'无明显失败'）", "失败原因2"],
  "winningPatterns": {
    "topics": ["可复用选题方向"],
    "hooks": ["可复用 Hook 风格"],
    "structures": ["可复用结构"],
    "expressions": ["可复用表达"]
  },
  "failedPatterns": {
    "topics": ["需规避的选题"],
    "hooks": ["需规避的 Hook"],
    "reasons": ["失败根本原因"]
  },
  "suggestions": ["下一步具体建议1", "下一步具体建议2", "下一步具体建议3"]
}

要求：
- 不要泛泛而谈"内容质量好/差"，必须具体到标题、Hook、选题、结构、CTA 某个元素
- winningPatterns / failedPatterns 必须给出可直接复用的元素，而不是"继续努力"这种空话
- 如果表现好，whyFailed 写"无明显失败"，但 failedPatterns 仍要提炼需要规避的潜在风险`

      const text = await callAI(apiKey, prompt, { temperature: 0.7, max_tokens: 2000 })

      // JSON 解析（两阶段）
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const cleaned = jsonMatch[0].replace(/,(\s*[}\]])/g, '$1')
          parsed = JSON.parse(cleaned)
        } else {
          throw new Error('AI 返回内容无法解析为 JSON')
        }
      }

      // 成功后再扣减额度
      consumeCredit('performanceReview')

      setAnalysis(parsed)

      // 保存到 performanceRecords
      const recordId = addPerformanceRecord(currentProjectId, {
        title: form.title,
        body: '',
        hook: form.hook,
        structure: '',
        cta: '',
        metrics: { views: v, likes: l, comments: c, saves: s, shares: sh },
      })
      analyzePerformanceRecord(recordId, parsed)
      setSavedRecordId(recordId)

      // 同步到 accountMemory.contentHistory
      addContentHistory(currentProjectId, {
        topic: form.topic,
        hook: form.hook,
        style: '',
        script: '',
        publishDate: Date.now(),
        performance: { views: v, likes: l, comments: c, saves: s, shares: sh },
        aiAnalysis: {
          whyWorked: parsed.whyWorked?.join('；') || '',
          whyFailed: parsed.whyFailed?.join('；') || '',
          lessons: parsed.suggestions || [],
        },
      })

      // 更新 winningPatterns / failedPatterns
      updateMemoryPatterns(currentProjectId, {
        winningPatterns: parsed.winningPatterns || {},
        failedPatterns: parsed.failedPatterns || {},
      })
    } catch (err) {
      setError(classifyAIError(err).message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 第二步：触发学习（更新 styleRules 效果分 + 提取爆款模式）
  const handleLearn = async () => {
    if (!savedRecordId) return
    setIsLearning(true)
    try {
      // 1. 更新规则效果分
      learnFromPerformance(currentProjectId)
      // 2. 从高表现内容提取爆款模式
      const newPatternIds = extractPattern(currentProjectId)

      setLearnedSummary({
        ruleUpdated: true,
        patternExtracted: Array.isArray(newPatternIds) ? newPatternIds.length : 0,
      })
    } catch (err) {
      setError('学习失败：' + (err.message || '未知错误'))
    } finally {
      setIsLearning(false)
    }
  }

  const handleReset = () => {
    setForm(EMPTY_FORM)
    setAnalysis(null)
    setSavedRecordId(null)
    setLearnedSummary(null)
    setError('')
  }

  if (!currentProjectId) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="text-gray-700">请先选择一个账号</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto min-h-full overflow-y-auto">
      {/* 页头 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">数据复盘</h1>
        <p className="text-sm text-gray-500">
          录入作品真实数据，AI 分析成功/失败原因，自动学习沉淀到账号记忆
        </p>
      </div>

      {/* 选择已有内容 */}
      {projectAssets.length > 0 && (
        <div className="mb-4 bg-white rounded-xl p-4 border border-gray-100">
          <div className="text-xs text-gray-500 mb-2">从内容资产快速填充</div>
          <div className="flex flex-wrap gap-2">
            {projectAssets.slice(0, 6).map((a) => (
              <button
                key={a.id}
                onClick={() => handleSelectAsset(a.id)}
                className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-brand-50 hover:text-brand-700 rounded-lg border border-gray-200 transition-colors"
              >
                {a.title?.substring(0, 20) || '未命名'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入表单 */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600 mb-1.5">作品标题 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="例如：30岁前必须知道的5个赚钱真相"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1.5">Hook（开头第一句）</label>
            <input
              type="text"
              value={form.hook}
              onChange={(e) => handleChange('hook', e.target.value)}
              placeholder="开头第一句话"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1.5">选题方向</label>
            <input
              type="text"
              value={form.topic}
              onChange={(e) => handleChange('topic', e.target.value)}
              placeholder="例如：赚钱、成长"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-600">真实数据 *</div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isOCR}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-100 transition-colors disabled:opacity-50"
            >
              {isOCR ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
              {isOCR ? (ocrProgress || '识别中...') : '截图识别数据'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScreenshotUpload}
              className="hidden"
            />
          </div>
          {ocrProgress && !isOCR && (
            <div className="mb-2 text-xs text-brand-600 bg-brand-50/50 px-2 py-1 rounded">{ocrProgress}</div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { key: 'views', label: '播放量', placeholder: '5000' },
              { key: 'likes', label: '点赞', placeholder: '120' },
              { key: 'comments', label: '评论', placeholder: '30' },
              { key: 'saves', label: '收藏', placeholder: '50' },
              { key: 'shares', label: '转发', placeholder: '8' },
            ].map((f) => (
              <div key={f.key}>
                <input
                  type="number"
                  value={form[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400"
                />
                <div className="text-[10px] text-gray-400 mt-1 text-center">{f.label}</div>
              </div>
            ))}
          </div>
          {engagementRate > 0 && (
            <div className="mt-2 text-xs text-center">
              <span className="text-gray-500">综合互动率：</span>
              <span className={`font-semibold ${engagementRate >= 10 ? 'text-green-600' : engagementRate >= 5 ? 'text-amber-600' : 'text-red-500'}`}>
                {engagementRate}%
              </span>
              <span className="ml-2 text-gray-400">
                {engagementRate >= 10 ? '（高表现）' : engagementRate >= 5 ? '（中表现）' : '（低表现）'}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4">
          {/* 免费体验额度提示 */}
          <div className="text-[11px] text-gray-400 mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              免费体验剩余：{getRemainingCredits('performanceReview')}/{(credits.freeExperience?.performanceReview ?? 1)}
            </span>
            <span>用完后升级 Pro 可无限复盘学习</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isAnalyzing ? 'AI 分析中...' : 'AI 分析'}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <RotateCcw size={14} />
              重置
            </button>
          </div>
        </div>

        {error && <AIErrorBanner message={error} onClose={() => setError('')} />}
      </div>

      {/* AI 分析结果 */}
      {analysis && (
        <div className="space-y-4 mb-4">
          {/* Verdict */}
          <div className={`rounded-xl p-4 border ${
            analysis.verdict === '高表现'
              ? 'bg-green-50 border-green-200'
              : analysis.verdict === '中表现'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className={
                analysis.verdict === '高表现' ? 'text-green-600' :
                analysis.verdict === '中表现' ? 'text-amber-600' : 'text-red-500'
              } />
              <span className="text-sm font-semibold text-gray-900">AI 诊断：{analysis.verdict}</span>
            </div>
          </div>

          {/* 成功原因 */}
          {analysis.whyWorked?.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="text-xs text-green-600 font-medium mb-2 flex items-center gap-1">
                <CheckCircle2 size={12} />
                为什么有效
              </div>
              <ul className="space-y-1.5">
                {analysis.whyWorked.map((w, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 失败原因 */}
          {analysis.whyFailed?.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="text-xs text-amber-600 font-medium mb-2 flex items-center gap-1">
                <AlertTriangle size={12} />
                为什么失败 / 风险点
              </div>
              <ul className="space-y-1.5">
                {analysis.whyFailed.map((w, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">!</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 下一步建议 */}
          {analysis.suggestions?.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="text-xs text-brand-600 font-medium mb-2 flex items-center gap-1">
                <Lightbulb size={12} />
                下一步建议
              </div>
              <ul className="space-y-1.5">
                {analysis.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-brand-500 mt-0.5">{i + 1}.</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 发现新规律提示卡 */}
          {savedRecordId && !learnedSummary && analysis && (() => {
            const wp = analysis.winningPatterns || {}
            const fp = analysis.failedPatterns || {}
            const winCount =
              (wp.topics?.length || 0) +
              (wp.hooks?.length || 0) +
              (wp.structures?.length || 0) +
              (wp.expressions?.length || 0)
            const failCount =
              (fp.topics?.length || 0) + (fp.hooks?.length || 0) + (fp.reasons?.length || 0)
            return (
              <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-purple-50 p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center shrink-0 shadow-lg shadow-brand-600/20">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-gray-900 mb-1">
                      🎯 发现新的账号规律
                    </div>
                    <p className="text-xs text-gray-600">
                      AI 基于本次作品数据，提炼出专属你的创作规律。<br />
                      加入账号大脑后，下次生成自动复用。
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/80 rounded-xl p-3 border border-white">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">成功模式</span>
                      <span className="text-lg font-bold text-green-700">{winCount}</span>
                    </div>
                    <div className="text-[11px] text-gray-500">可复用的选题/Hook/结构/表达</div>
                  </div>
                  <div className="bg-white/80 rounded-xl p-3 border border-white">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">失败模式</span>
                      <span className="text-lg font-bold text-red-600">{failCount}</span>
                    </div>
                    <div className="text-[11px] text-gray-500">需规避的坑点与无效手法</div>
                  </div>
                </div>
                <button
                  onClick={handleLearn}
                  disabled={isLearning}
                  className="w-full px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-600/20 transition-all hover:-translate-y-0.5"
                >
                  {isLearning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  {isLearning ? '加入学习库中...' : '加入学习库'}
                  {!isLearning && <ArrowRight size={14} />}
                </button>
              </div>
            )
          })()}

          {/* 学习完成 */}
          {learnedSummary && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={18} className="text-green-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-green-700">学习完成</div>
                  <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                    <div>✓ 风格规则效果分已更新（基于历史表现数据）</div>
                    <div>✓ 从高表现内容提取了 {learnedSummary.patternExtracted} 个新爆款模式</div>
                    <div>✓ 账号记忆已更新（winningPatterns / failedPatterns / contentHistory）</div>
                  </div>
                  <div className="mt-3 p-2 bg-white rounded-lg border border-green-100">
                    <div className="text-xs text-gray-500 mb-1">下次生成内容时：</div>
                    <div className="text-xs text-gray-700">
                      Pipeline 和爆款实验室会自动读取账号记忆，复用成功模式、规避失败模式、不重复近期内容。
                    </div>
                  </div>
                  {/* 下一步引导 */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate('/workbench/account-brain')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-brand-200 text-brand-700 text-xs font-medium rounded-lg hover:bg-brand-50 transition-colors"
                    >
                      <Brain size={14} />
                      去账号大脑查看
                      <ArrowRight size={12} />
                    </button>
                    <button
                      onClick={() => navigate('/workbench/video-director')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors"
                    >
                      <Rocket size={14} />
                      用学到的规律生成下一篇
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 软墙：学习完成后提示额度 + 升级 */}
          {learnedSummary && <UpgradePrompt scenario="review" />}
        </div>
      )}
    </div>
  )
}
