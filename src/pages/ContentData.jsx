import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Eye,
  Heart,
  Bookmark,
  MessageCircle,
  Share2,
  Trash2,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  TrendingUp,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { callAI, classifyAIError } from '../utils/aiClient'

async function reviewViaAI(record, apiKey) {
  const prompt = `你是一位内容运营专家。请对以下内容的表现数据进行复盘分析。

【内容信息】
- 标题：${record.title || '无'}
- 钩子：${record.hook || '无'}
- CTA：${record.cta || '无'}
- 发布时间：${record.publishedAt ? new Date(record.publishedAt).toLocaleString('zh-CN') : '未知'}

【表现数据】
- 浏览量：${record.metrics?.views || 0}
- 点赞：${record.metrics?.likes || 0}
- 收藏：${record.metrics?.saves || 0}
- 评论：${record.metrics?.comments || 0}
- 分享：${record.metrics?.shares || 0}
- 互动率：${((record.derivedMetrics?.engagementRate || 0) * 100).toFixed(2)}%
- 点赞率：${((record.derivedMetrics?.likeRate || 0) * 100).toFixed(2)}%
- 收藏率：${((record.derivedMetrics?.saveRate || 0) * 100).toFixed(2)}%

请从以下维度分析：
1. 表现评价（优秀/良好/一般/较差）
2. 优势分析
3. 不足分析
4. 优化建议

输出严格 JSON 格式（不要 markdown 包裹）：
{
  "rating": "良好",
  "highlights": ["优势1", "优势2"],
  "issues": ["不足1", "不足2"],
  "suggestions": ["建议1", "建议2"]
}
注意：简洁输出，每条不超过30字。`

  return callAI(apiKey, prompt, { temperature: 0.6, max_tokens: 1000 })
}

function parseReviewResult(text) {
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  const parsed = JSON.parse(cleaned)
  return {
    rating: typeof parsed.rating === 'string' ? parsed.rating : '',
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
  }
}

export default function ContentData() {
  const navigate = useNavigate()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const performanceRecords = useStore((s) => s.performanceRecords)
  const deletePerformanceRecord = useStore((s) => s.deletePerformanceRecord)
  const analyzePerformanceRecord = useStore((s) => s.analyzePerformanceRecord)
  const learnFromPerformance = useStore((s) => s.learnFromPerformance)

  const [sortBy, setSortBy] = useState('time')
  const [reviewStatus, setReviewStatus] = useState({}) // { [recordId]: 'loading' | 'error' }
  const [reviewError, setReviewError] = useState({})
  const [expandedAnalysis, setExpandedAnalysis] = useState(null)

  // 按项目过滤
  const projectRecords = useMemo(
    () => performanceRecords.filter((r) => r.projectId === currentProjectId),
    [performanceRecords, currentProjectId]
  )

  // 排序
  const sortedRecords = useMemo(() => {
    const arr = [...projectRecords]
    if (sortBy === 'views') {
      arr.sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0))
    } else if (sortBy === 'engagement') {
      arr.sort((a, b) => (b.derivedMetrics?.engagementRate || 0) - (a.derivedMetrics?.engagementRate || 0))
    } else {
      arr.sort((a, b) => (b.recordedAt || 0) - (a.recordedAt || 0))
    }
    return arr
  }, [projectRecords, sortBy])

  // 汇总数据
  const summary = useMemo(() => {
    const totalViews = projectRecords.reduce((sum, r) => sum + (r.metrics?.views || 0), 0)
    const totalLikes = projectRecords.reduce((sum, r) => sum + (r.metrics?.likes || 0), 0)
    const totalSaves = projectRecords.reduce((sum, r) => sum + (r.metrics?.saves || 0), 0)
    const totalComments = projectRecords.reduce((sum, r) => sum + (r.metrics?.comments || 0), 0)
    const totalShares = projectRecords.reduce((sum, r) => sum + (r.metrics?.shares || 0), 0)
    const totalEngagement = totalLikes + totalSaves + totalComments + totalShares
    const avgEngagementRate = projectRecords.length > 0
      ? +(projectRecords.reduce((sum, r) => sum + (r.derivedMetrics?.engagementRate || 0), 0) / projectRecords.length).toFixed(4)
      : 0
    return {
      totalViews,
      totalEngagement,
      avgEngagementRate,
      count: projectRecords.length,
    }
  }, [projectRecords])

  const handleDelete = (id) => {
    if (confirm('确定删除这条表现记录吗？')) {
      deletePerformanceRecord(id)
    }
  }

  const handleReview = async (record) => {
    const apiKey = localStorage.getItem('contentos_api_key')
    if (!apiKey) {
      setReviewStatus((prev) => ({ ...prev, [record.id]: 'error' }))
      setReviewError((prev) => ({ ...prev, [record.id]: '请先在设置页面配置 DeepSeek API Key' }))
      return
    }

    setReviewStatus((prev) => ({ ...prev, [record.id]: 'loading' }))
    setReviewError((prev) => ({ ...prev, [record.id]: '' }))

    try {
      const text = await reviewViaAI(record, apiKey)
      const parsed = parseReviewResult(text)
      analyzePerformanceRecord(record.id, parsed)
      // v9：复盘成功后触发学习，更新 styleRules.effectivenessScore
      learnFromPerformance(currentProjectId)
      setReviewStatus((prev) => ({ ...prev, [record.id]: 'idle' }))
      setExpandedAnalysis(record.id)
    } catch (err) {
      const classified = classifyAIError(err)
      setReviewError((prev) => ({ ...prev, [record.id]: classified.message }))
      setReviewStatus((prev) => ({ ...prev, [record.id]: 'error' }))
    }
  }

  const toggleAnalysis = (recordId) => {
    setExpandedAnalysis((prev) => (prev === recordId ? null : recordId))
  }

  const formatTime = (ts) => {
    if (!ts) return '未知'
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const formatRate = (rate) => `${((rate || 0) * 100).toFixed(2)}%`

  const hasApiKey = Boolean(localStorage.getItem('contentos_api_key'))

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">内容数据</h1>
        <p className="text-sm text-gray-500 mt-1">数据复盘与优化，发现增长机会</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* 空状态 */}
          {projectRecords.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <BarChart3 size={28} className="text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-medium mb-1">暂无表现数据</h3>
              <p className="text-sm text-gray-500">
                前往「内容资产」页面，为已发布内容录入表现数据
              </p>
            </div>
          ) : (
            <>
              {/* 汇总卡片 */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5">
                    <Eye size={12} />
                    总浏览
                  </div>
                  <div className="text-xl font-bold text-gray-900">{summary.totalViews.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5">
                    <TrendingUp size={12} />
                    总互动
                  </div>
                  <div className="text-xl font-bold text-gray-900">{summary.totalEngagement.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5">
                    <BarChart3 size={12} />
                    平均互动率
                  </div>
                  <div className="text-xl font-bold text-gray-900">{formatRate(summary.avgEngagementRate)}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5">
                    <CheckCircle2 size={12} />
                    内容数
                  </div>
                  <div className="text-xl font-bold text-gray-900">{summary.count}</div>
                </div>
              </div>

              {/* API Key 未配置提示 */}
              {!hasApiKey && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-amber-900">未配置 DeepSeek API Key</div>
                    <div className="text-amber-700 mt-0.5">AI 复盘功能需要 API Key，请前往「设置」页面配置</div>
                  </div>
                </div>
              )}

              {/* 排序栏 */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">排序：</span>
                {[
                  { key: 'time', label: '最新' },
                  { key: 'views', label: '浏览量' },
                  { key: 'engagement', label: '互动率' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      sortBy === opt.key
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* 表现记录列表 */}
              <div className="space-y-3">
                {sortedRecords.map((record) => {
                  const isReviewing = reviewStatus[record.id] === 'loading'
                  const hasError = reviewStatus[record.id] === 'error'
                  const hasAnalysis = record.status === 'analyzed' && record.analysis
                  const isExpanded = expandedAnalysis === record.id

                  return (
                    <div key={record.id} className="bg-white rounded-xl border border-gray-100 p-5">
                      {/* 标题行 */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {record.title || '未命名内容'}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            发布：{formatTime(record.publishedAt)} · 记录：{formatTime(record.recordedAt)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors ml-2 shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* 指标网格 */}
                      <div className="grid grid-cols-5 gap-2 mb-3">
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <Eye size={12} className="text-gray-400 mx-auto mb-0.5" />
                          <div className="text-[11px] text-gray-500">浏览</div>
                          <div className="text-sm font-semibold text-gray-900">{record.metrics?.views || 0}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <Heart size={12} className="text-gray-400 mx-auto mb-0.5" />
                          <div className="text-[11px] text-gray-500">点赞</div>
                          <div className="text-sm font-semibold text-gray-900">{record.metrics?.likes || 0}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <Bookmark size={12} className="text-gray-400 mx-auto mb-0.5" />
                          <div className="text-[11px] text-gray-500">收藏</div>
                          <div className="text-sm font-semibold text-gray-900">{record.metrics?.saves || 0}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <MessageCircle size={12} className="text-gray-400 mx-auto mb-0.5" />
                          <div className="text-[11px] text-gray-500">评论</div>
                          <div className="text-sm font-semibold text-gray-900">{record.metrics?.comments || 0}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <Share2 size={12} className="text-gray-400 mx-auto mb-0.5" />
                          <div className="text-[11px] text-gray-500">分享</div>
                          <div className="text-sm font-semibold text-gray-900">{record.metrics?.shares || 0}</div>
                        </div>
                      </div>

                      {/* 派生指标 */}
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                        <span>互动率 <span className="text-brand-600 font-medium">{formatRate(record.derivedMetrics?.engagementRate)}</span></span>
                        <span>点赞率 <span className="text-gray-700">{formatRate(record.derivedMetrics?.likeRate)}</span></span>
                        <span>收藏率 <span className="text-gray-700">{formatRate(record.derivedMetrics?.saveRate)}</span></span>
                        {record.platformUrl && (
                          <a
                            href={record.platformUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"
                          >
                            查看原文 <ExternalLink size={10} />
                          </a>
                        )}
                      </div>

                      {/* 错误提示 */}
                      {hasError && reviewError[record.id] && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mb-3">
                          <div className="flex items-start gap-2 mb-2">
                            <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                            <div className="text-xs text-red-700">{reviewError[record.id]}</div>
                          </div>
                          <button
                            onClick={() => navigate('/settings')}
                            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                          >
                            前往设置配置 API Key →
                          </button>
                        </div>
                      )}

                      {/* AI 复盘按钮 / 展开分析 */}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                        <button
                          onClick={() => handleReview(record)}
                          disabled={isReviewing}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isReviewing
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                          }`}
                        >
                          {isReviewing ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              AI 复盘中...
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} />
                              {hasAnalysis ? '重新复盘' : 'AI 复盘'}
                            </>
                          )}
                        </button>

                        {hasAnalysis && (
                          <button
                            onClick={() => toggleAnalysis(record.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isExpanded
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <CheckCircle2 size={12} />
                            {isExpanded ? '收起分析' : '查看分析'}
                          </button>
                        )}

                        {hasAnalysis && record.analysis?.rating && (
                          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 font-medium">
                            {record.analysis.rating}
                          </span>
                        )}
                      </div>

                      {/* 分析结果展开 */}
                      {hasAnalysis && isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                          {record.analysis.highlights?.length > 0 && (
                            <div>
                              <div className="text-[11px] font-medium text-emerald-600 mb-1">优势</div>
                              <ul className="space-y-1">
                                {record.analysis.highlights.map((h, i) => (
                                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                                    <span className="text-emerald-400 mt-0.5">•</span>
                                    {h}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {record.analysis.issues?.length > 0 && (
                            <div>
                              <div className="text-[11px] font-medium text-red-600 mb-1">不足</div>
                              <ul className="space-y-1">
                                {record.analysis.issues.map((issue, i) => (
                                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                                    <span className="text-red-400 mt-0.5">•</span>
                                    {issue}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {record.analysis.suggestions?.length > 0 && (
                            <div>
                              <div className="text-[11px] font-medium text-brand-600 mb-1">优化建议</div>
                              <ul className="space-y-1">
                                {record.analysis.suggestions.map((s, i) => (
                                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                                    <span className="text-brand-400 mt-0.5">•</span>
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {record.analysis.analyzedAt && (
                            <div className="text-[11px] text-gray-400 pt-2 border-t border-gray-50">
                              分析时间：{formatTime(record.analysis.analyzedAt)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
