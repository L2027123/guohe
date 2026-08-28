import { getApiKey } from '../../utils/apiKey'
import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { callAI, classifyAIError } from '../../utils/aiClient'
import AIErrorBanner from '../../components/AIErrorBanner'
import {
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Users,
  PlayCircle,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowRight,
  Link2,
  Target,
  TrendingUp,
  Zap,
  Lightbulb,
  Brain,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'

// ===== AI 复盘分析 Prompt =====
function buildReviewPrompt(input, project) {
  return `你是一位短视频内容复盘专家。请根据以下内容的表现数据，进行深度复盘分析。

【账号信息】
- 账号：${project?.name || ''}
- 平台：${project?.platform || ''}
- 领域：${project?.category || ''}

【内容信息】
- 视频链接：${input.videoUrl || '未提供'}
- 选题：${input.topic || '未提供'}
- Hook：${input.hook || '未提供'}

【表现数据】
- 播放量：${input.views || 0}
- 点赞：${input.likes || 0}
- 评论：${input.comments || 0}
- 收藏：${input.saves || 0}
- 涨粉：${input.followers || 0}
- 完播率：${input.completionRate || 0}%

请从以下三个维度进行深度分析：

1. 表现诊断（performanceDiagnosis）
- 总体评价：一句话总结表现
- 评分：0-100分
- 优势：具体哪里做得好（Hook、内容、互动等）
- 劣势：具体哪里需要改进

2. 内容分析（contentAnalysis）
- Hook表现：基于完播率判断Hook是否有效
- 留存问题：如果完播率低，分析可能原因
- 互动表现：分析点赞/评论/收藏的数据意义

3. 下一步优化（nextOptimization）
- 下一个选题建议：基于这次表现，下一个视频应该做什么
- 下一个Hook建议：具体的Hook文案
- 需要避免的错误：这次暴露的问题，下次不要重蹈覆辙

请输出严格 JSON 格式（不要 markdown 包裹）：
{
  "performanceDiagnosis": {
    "overallEvaluation": "总体评价，一句话",
    "score": 75,
    "strengths": ["优势1", "优势2"],
    "weaknesses": ["劣势1", "劣势2"]
  },
  "contentAnalysis": {
    "hookPerformance": "Hook是否有效，分析原因",
    "retentionProblem": "留存问题分析，如果有的话",
    "interactionPerformance": "互动数据解读"
  },
  "nextOptimization": {
    "nextTopic": "下一个视频的选题方向",
    "nextHook": "下一个视频的Hook文案",
    "avoidMistakes": ["这次暴露的问题，下次避免"]
  }
}

【要求】
1. 简洁输出，每项不超过2条，每条不超过40字
2. 不要只评价数据，要回答：为什么这个视频表现这样？
3. 必须具体：指出Hook、结构、互动设计中的具体问题
4. 必须可执行：nextTopic和nextHook必须是具体可直接使用的
5. 如果数据太少无法判断，也要给出基于现有数据的最大努力分析

直接输出 JSON，不要其他解释。`
}

// ===== 解析 AI 返回的 JSON =====
function parseReviewResult(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return JSON.parse(text)
  } catch (e) {
    throw new Error('AI 返回格式错误，请重试')
  }
}

// ===== 主组件 =====
export default function ContentReview() {
  const navigate = useNavigate()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const projects = useStore((s) => s.projects)
  const getAccountMemory = useStore((s) => s.getAccountMemory)
  const ensureAccountMemory = useStore((s) => s.ensureAccountMemory)
  const addContentHistory = useStore((s) => s.addContentHistory)
  const updateMemoryPatterns = useStore((s) => s.updateMemoryPatterns)
  const getRecentReviews = useStore((s) => s.getRecentReviews)

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  )

  // ===== 历史记忆 =====
  // useEffect 初始化 memory（避免 render 期间触发 set）
  useEffect(() => {
    if (currentProjectId) {
      ensureAccountMemory(currentProjectId)
    }
  }, [currentProjectId, ensureAccountMemory])

  // ===== 输入状态 =====
  const [videoUrl, setVideoUrl] = useState('')
  const [topic, setTopic] = useState('')
  const [hook, setHook] = useState('')
  const [views, setViews] = useState('')
  const [likes, setLikes] = useState('')
  const [comments, setComments] = useState('')
  const [saves, setSaves] = useState('')
  const [followers, setFollowers] = useState('')
  const [completionRate, setCompletionRate] = useState('')

  // ===== 结果状态 =====
  const [reviewResult, setReviewResult] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // ===== 历史记忆 =====
  const memory = useMemo(() => {
    if (!currentProjectId) return null
    return getAccountMemory(currentProjectId)
  }, [currentProjectId, getAccountMemory])

  const recentReviews = useMemo(() => {
    if (!currentProjectId) return { winningPatterns: null, failedPatterns: null, recentHistory: [] }
    return getRecentReviews(currentProjectId, 3)
  }, [currentProjectId, getRecentReviews])

  const handleAnalyze = async () => {
    if (!topic.trim()) {
      setError('请至少输入视频选题')
      return
    }
    setError('')
    setReviewResult(null)
    setSaved(false)

    const input = {
      videoUrl: videoUrl.trim(),
      topic: topic.trim(),
      hook: hook.trim(),
      views: parseInt(views) || 0,
      likes: parseInt(likes) || 0,
      comments: parseInt(comments) || 0,
      saves: parseInt(saves) || 0,
      followers: parseInt(followers) || 0,
      completionRate: parseFloat(completionRate) || 0,
    }

    const apiKey = getApiKey()
    if (!apiKey) {
      setError('请先在设置页面配置 DeepSeek API Key')
      return
    }

    setIsAnalyzing(true)
    try {
      const prompt = buildReviewPrompt(input, currentProject)
      const text = await callAI(apiKey, prompt, { temperature: 0.6, max_tokens: 1200 })
      const result = parseReviewResult(text)
      setReviewResult(result)
    } catch (err) {
      const classified = classifyAIError(err)
      setError(classified.message)
    }
    setIsAnalyzing(false)
  }

  const handleSaveToMemory = () => {
    if (!reviewResult || !currentProjectId) return

    const input = {
      videoUrl: videoUrl.trim(),
      topic: topic.trim(),
      hook: hook.trim(),
      views: parseInt(views) || 0,
      likes: parseInt(likes) || 0,
      comments: parseInt(comments) || 0,
      saves: parseInt(saves) || 0,
      followers: parseInt(followers) || 0,
      completionRate: parseFloat(completionRate) || 0,
    }

    // 1. 存入内容历史
    addContentHistory(currentProjectId, {
      topic: input.topic,
      hook: input.hook,
      style: '',
      script: '',
      publishDate: Date.now(),
      performance: {
        views: input.views,
        likes: input.likes,
        comments: input.comments,
        saves: input.saves,
        shares: 0,
        followers: input.followers,
        completionRate: input.completionRate / 100,
      },
      aiAnalysis: {
        whyWorked: reviewResult.performanceDiagnosis?.strengths?.join('、') || '',
        whyFailed: reviewResult.performanceDiagnosis?.weaknesses?.join('、') || '',
        lessons: reviewResult.nextOptimization?.avoidMistakes || [],
      },
    })

    // 2. 更新记忆模式
    const score = reviewResult.performanceDiagnosis?.score || 50
    const winningPatterns = score >= 70
      ? {
          topics: input.topic ? [input.topic] : [],
          hooks: input.hook ? [input.hook] : [],
          structures: [],
          expressions: [],
        }
      : null

    const failedPatterns = score < 50
      ? {
          topics: input.topic ? [input.topic] : [],
          hooks: input.hook ? [input.hook] : [],
          reasons: reviewResult.nextOptimization?.avoidMistakes || [],
        }
      : null

    if (winningPatterns || failedPatterns) {
      updateMemoryPatterns(currentProjectId, { winningPatterns, failedPatterns })
    }

    setSaved(true)
  }

  const handleReset = () => {
    setVideoUrl('')
    setTopic('')
    setHook('')
    setViews('')
    setLikes('')
    setComments('')
    setSaves('')
    setFollowers('')
    setCompletionRate('')
    setReviewResult(null)
    setError('')
    setSaved(false)
  }

  const hasApiKey = Boolean(getApiKey())

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 */}
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 text-white flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">AI 内容复盘</h1>
              <p className="text-sm text-gray-500 mt-0.5">录入表现数据，AI 分析为什么这样，下一步怎么改</p>
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
        <div className="max-w-4xl mx-auto space-y-5">

          {/* ===== 历史记忆卡片 ===== */}
          {memory && (memory.winningPatterns?.topics?.length > 0 || memory.failedPatterns?.topics?.length > 0) && (
            <div className="bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={16} className="text-brand-600" />
                <span className="text-sm font-medium text-gray-900">账号内容记忆</span>
                <span className="text-xs text-gray-500">已学习 {memory.contentHistory?.length || 0} 条历史内容</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {memory.winningPatterns?.topics?.length > 0 && (
                  <div className="bg-white/70 rounded-lg p-3">
                    <div className="text-[11px] text-emerald-600 font-medium mb-1">✅ 验证有效的选题</div>
                    <div className="flex flex-wrap gap-1">
                      {memory.winningPatterns.topics.slice(-5).map((t, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {memory.failedPatterns?.topics?.length > 0 && (
                  <div className="bg-white/70 rounded-lg p-3">
                    <div className="text-[11px] text-red-600 font-medium mb-1">⚠️ 需要避免的选题</div>
                    <div className="flex flex-wrap gap-1">
                      {memory.failedPatterns.topics.slice(-5).map((t, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== 数据录入区 ===== */}
          {!reviewResult && (
            <div className="space-y-5">
              {/* Hero */}
              <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-brand-900 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[11px] mb-3">
                    <Sparkles size={12} /> AI 内容复盘
                  </div>
                  <h2 className="text-2xl font-bold mb-2">这条视频表现如何？</h2>
                  <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                    录入表现数据，AI 会帮你分析：为什么这个视频表现这样？下一条怎么改？
                  </p>
                </div>
              </div>

              {/* API Key 提示 */}
              {!hasApiKey && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-amber-900">未配置 DeepSeek API Key</div>
                    <div className="text-amber-700 mt-0.5">AI 复盘功能需要 API Key，请前往「设置」页面配置</div>
                    <button
                      onClick={() => navigate('/settings')}
                      className="mt-2 text-xs text-brand-600 font-medium hover:text-brand-700"
                    >
                      前往配置 →
                    </button>
                  </div>
                </div>
              )}

              {/* 内容信息 */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} className="text-brand-600" />
                  <span className="text-sm font-medium text-gray-900">内容信息</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">视频链接（可选）</label>
                    <div className="relative">
                      <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="粘贴视频链接"
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-brand-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">选题 *</label>
                    <input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="例如：为什么睡够8小时还是累？"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-brand-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Hook（第一句话）</label>
                  <input
                    value={hook}
                    onChange={(e) => setHook(e.target.value)}
                    placeholder="视频的开头3秒说了什么？"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-brand-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* 表现数据 */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={16} className="text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">表现数据</span>
                  <span className="text-xs text-gray-400">发布后从平台后台录入</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Eye size={11} /> 播放量</label>
                    <input
                      type="number"
                      value={views}
                      onChange={(e) => setViews(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Heart size={11} /> 点赞</label>
                    <input
                      type="number"
                      value={likes}
                      onChange={(e) => setLikes(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MessageCircle size={11} /> 评论</label>
                    <input
                      type="number"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Bookmark size={11} /> 收藏</label>
                    <input
                      type="number"
                      value={saves}
                      onChange={(e) => setSaves(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Users size={11} /> 涨粉</label>
                    <input
                      type="number"
                      value={followers}
                      onChange={(e) => setFollowers(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><PlayCircle size={11} /> 完播率(%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={completionRate}
                      onChange={(e) => setCompletionRate(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  清空
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!topic.trim() || isAnalyzing || !hasApiKey}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-brand-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <Sparkles size={16} />
                  {isAnalyzing ? 'AI 分析中...' : 'AI 复盘分析'}
                  {!isAnalyzing && <ArrowRight size={14} />}
                </button>
              </div>

              {/* 加载中 */}
              {isAnalyzing && (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                  <Loader2 size={32} className="text-brand-600 animate-spin mx-auto mb-4" />
                  <p className="text-sm text-gray-700 font-medium">AI 正在深度分析...</p>
                  <p className="text-xs text-gray-400 mt-2">诊断表现 · 分析内容 · 给出优化建议</p>
                </div>
              )}

              {error && !reviewResult && <AIErrorBanner error={error} onRetry={handleAnalyze} />}
            </div>
          )}

          {/* ===== 结果展示区 ===== */}
          {reviewResult && !isAnalyzing && (
            <div className="space-y-5">
              {/* 顶部操作栏 */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  选题：{topic?.slice(0, 40)}{topic?.length > 40 ? '...' : ''}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAnalyze}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw size={14} /> 重新分析
                  </button>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-brand-600 hover:text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
                  >
                    <Lightbulb size={14} /> 新的复盘
                  </button>
                </div>
              </div>

              {error && <AIErrorBanner error={error} onRetry={handleAnalyze} />}

              {/* ===== 第一卡：表现诊断 ===== */}
              {reviewResult.performanceDiagnosis && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target size={18} className="text-brand-600" />
                    <h3 className="font-semibold text-gray-900">表现诊断</h3>
                    <span className="text-xs text-gray-400">整体评价与评分</span>
                  </div>

                  {/* 评分 */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold ${
                      (reviewResult.performanceDiagnosis.score || 0) >= 80 ? 'bg-emerald-50 text-emerald-600' :
                      (reviewResult.performanceDiagnosis.score || 0) >= 60 ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {reviewResult.performanceDiagnosis.score}
                    </div>
                    <div className="flex-1">
                      <div className={`text-lg font-medium ${
                        (reviewResult.performanceDiagnosis.score || 0) >= 80 ? 'text-emerald-600' :
                        (reviewResult.performanceDiagnosis.score || 0) >= 60 ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {reviewResult.performanceDiagnosis.score >= 80 ? '优秀' :
                         reviewResult.performanceDiagnosis.score >= 60 ? '良好' :
                         reviewResult.performanceDiagnosis.score >= 40 ? '一般' : '需要改进'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">{reviewResult.performanceDiagnosis.overallEvaluation}</div>
                    </div>
                  </div>

                  {/* 优势与劣势 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reviewResult.performanceDiagnosis.strengths?.length > 0 && (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                        <div className="text-xs font-medium text-emerald-700 mb-2">✅ 做得好的地方</div>
                        <ul className="space-y-1.5">
                          {reviewResult.performanceDiagnosis.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-emerald-500 mt-0.5">→</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {reviewResult.performanceDiagnosis.weaknesses?.length > 0 && (
                      <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                        <div className="text-xs font-medium text-red-700 mb-2">⚠️ 需要改进的地方</div>
                        <ul className="space-y-1.5">
                          {reviewResult.performanceDiagnosis.weaknesses.map((w, i) => (
                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-red-500 mt-0.5">→</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== 第二卡：内容分析 ===== */}
              {reviewResult.contentAnalysis && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap size={18} className="text-purple-600" />
                    <h3 className="font-semibold text-gray-900">内容深度分析</h3>
                    <span className="text-xs text-gray-400">为什么表现这样</span>
                  </div>

                  <div className="space-y-3">
                    {reviewResult.contentAnalysis.hookPerformance && (
                      <div className="rounded-lg bg-gray-50 p-4">
                        <div className="text-xs font-medium text-purple-600 mb-1">🎯 Hook 表现分析</div>
                        <div className="text-sm text-gray-700 leading-relaxed">{reviewResult.contentAnalysis.hookPerformance}</div>
                      </div>
                    )}
                    {reviewResult.contentAnalysis.retentionProblem && (
                      <div className="rounded-lg bg-gray-50 p-4">
                        <div className="text-xs font-medium text-amber-600 mb-1">⏱ 留存问题分析</div>
                        <div className="text-sm text-gray-700 leading-relaxed">{reviewResult.contentAnalysis.retentionProblem}</div>
                      </div>
                    )}
                    {reviewResult.contentAnalysis.interactionPerformance && (
                      <div className="rounded-lg bg-gray-50 p-4">
                        <div className="text-xs font-medium text-blue-600 mb-1">💬 互动表现解读</div>
                        <div className="text-sm text-gray-700 leading-relaxed">{reviewResult.contentAnalysis.interactionPerformance}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== 第三卡：下一步优化 ===== */}
              {reviewResult.nextOptimization && (
                <div className="bg-gradient-to-br from-brand-50 to-purple-50 rounded-2xl border border-brand-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={18} className="text-brand-600" />
                    <h3 className="font-semibold text-gray-900">下一步优化</h3>
                    <span className="text-xs text-gray-500">下一条视频怎么改</span>
                  </div>

                  <div className="space-y-4">
                    {reviewResult.nextOptimization.nextTopic && (
                      <div className="bg-white rounded-xl p-4 border border-brand-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb size={14} className="text-brand-600" />
                          <span className="text-xs font-medium text-brand-700">推荐选题方向</span>
                        </div>
                        <div className="text-base font-medium text-gray-900 leading-relaxed">
                          {reviewResult.nextOptimization.nextTopic}
                        </div>
                      </div>
                    )}

                    {reviewResult.nextOptimization.nextHook && (
                      <div className="bg-white rounded-xl p-4 border border-brand-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles size={14} className="text-purple-600" />
                          <span className="text-xs font-medium text-purple-700">推荐 Hook</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900 leading-snug">
                          "{reviewResult.nextOptimization.nextHook}"
                        </div>
                      </div>
                    )}

                    {reviewResult.nextOptimization.avoidMistakes?.length > 0 && (
                      <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                        <div className="text-xs font-medium text-red-700 mb-2">⚠️ 需要避免的错误</div>
                        <ul className="space-y-1">
                          {reviewResult.nextOptimization.avoidMistakes.map((m, i) => (
                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-red-400 mt-0.5">✗</span>
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* 保存到记忆 */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-brand-200">
                    <div className="text-xs text-gray-500">
                      保存后，这些结论会用于下次 AI 内容导演时参考
                    </div>
                    <button
                      onClick={handleSaveToMemory}
                      disabled={saved}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        saved
                          ? 'bg-emerald-100 text-emerald-600 cursor-not-allowed'
                          : 'bg-white text-brand-600 border border-brand-300 hover:bg-brand-50'
                      }`}
                    >
                      {saved ? (
                        <><CheckCircle2 size={14} /> 已保存到记忆</>
                      ) : (
                        <><Brain size={14} /> 保存到账号记忆</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ===== 闭环提示 ===== */}
              {saved && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-emerald-900">复盘已保存到账号记忆</div>
                    <div className="text-emerald-700 text-sm mt-1">
                      下次使用 AI 内容导演时，会自动参考这次的复盘结论，生成更符合账号的内容方案。
                    </div>
                    <button
                      onClick={() => navigate('/workbench/video-director')}
                      className="mt-2 inline-flex items-center gap-1 text-sm text-brand-600 font-medium hover:text-brand-700"
                    >
                      去 AI 内容导演生成新内容 <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
