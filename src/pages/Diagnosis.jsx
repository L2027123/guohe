import { getApiKey } from '../utils/apiKey'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  Sparkles,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Stethoscope,
  KeyRound,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { callAI, classifyAIError } from '../utils/aiClient'
import { trackEvent } from '../utils/tracker'

const PLATFORMS = ['小红书', 'TikTok', 'YouTube', '其他']

async function diagnoseViaAI(formData, snapshot, apiKey) {
  const prompt = `你是一位资深的社交媒体账号诊断专家。请根据以下账号信息进行诊断。

【账号信息】
- 账号名称：${formData.accountName}
- 平台类型：${formData.platform}
- 账号定位：${formData.positioning}
- 粉丝数量：${formData.followers}
- 近期内容表现：${formData.recentPerformance}

【账号当前数据快照】
- 已归档内容数：${snapshot.assetsCount}
- 风格规则数：${snapshot.rulesCount}
- 已确认规则数：${snapshot.confirmedRulesCount}
- 表现记录数：${snapshot.performanceCount}
- 平均浏览量：${snapshot.avgViews}
- 平均互动率：${snapshot.avgEngagementRate}
- 训练阶段：${snapshot.learningStage}

请诊断，输出严格 JSON 格式（不要 markdown 包裹）：
{
  "summary": "30字以内的诊断结论",
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["问题1", "问题2"],
  "strategies": ["建议1", "建议2"]
}
注意：每个数组最多2条，每条不超过30字，先给结论。`

  return callAI(apiKey, prompt, { temperature: 0.6, max_tokens: 800 })
}

function parseDiagnosisResult(text) {
  let cleaned = text.trim()
  // 兼容 markdown 包裹
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
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    strategies: Array.isArray(parsed.strategies) ? parsed.strategies : [],
  }
}

export default function Diagnosis() {
  const navigate = useNavigate()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const accountDiagnoses = useStore((s) => s.accountDiagnoses)
  const addAccountDiagnosis = useStore((s) => s.addAccountDiagnosis)
  const deleteAccountDiagnosis = useStore((s) => s.deleteAccountDiagnosis)
  const assets = useStore((s) => s.assets)
  const styleRules = useStore((s) => s.styleRules)
  const performanceRecords = useStore((s) => s.performanceRecords)

  // 表单状态
  const [formData, setFormData] = useState({
    accountName: '',
    platform: '小红书',
    positioning: '',
    followers: '',
    recentPerformance: '',
  })
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  // 当前项目的诊断历史
  const projectDiagnoses = useMemo(
    () => accountDiagnoses.filter((d) => d.projectId === currentProjectId),
    [accountDiagnoses, currentProjectId]
  )

  // 从 store 数据计算 snapshot
  const snapshot = useMemo(() => {
    const projectAssets = assets.filter((a) => a.projectId === currentProjectId)
    const projectRules = styleRules.filter((r) => r.projectId === currentProjectId)
    const projectPerfs = performanceRecords.filter((p) => p.projectId === currentProjectId)
    const confirmedRules = projectRules.filter((r) => r.confirmed)
    const avgViews = projectPerfs.length > 0
      ? Math.round(projectPerfs.reduce((sum, p) => sum + (p.metrics?.views || 0), 0) / projectPerfs.length)
      : 0
    const avgEngagementRate = projectPerfs.length > 0
      ? +(projectPerfs.reduce((sum, p) => sum + (p.derivedMetrics?.engagementRate || 0), 0) / projectPerfs.length).toFixed(4)
      : 0
    const learningStage = confirmedRules.length >= 10 ? '成熟期' : confirmedRules.length >= 5 ? '成长期' : '建立认知'
    return {
      assetsCount: projectAssets.length,
      rulesCount: projectRules.length,
      confirmedRulesCount: confirmedRules.length,
      performanceCount: projectPerfs.length,
      avgViews,
      avgEngagementRate,
      learningStage,
    }
  }, [assets, styleRules, performanceRecords, currentProjectId])

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleDiagnose = async () => {
    const apiKey = getApiKey()
    if (!apiKey) {
      setError('请先在设置页面配置 DeepSeek API Key')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const text = await diagnoseViaAI(formData, snapshot, apiKey)
      const parsed = parseDiagnosisResult(text)
      setResult(parsed)
      trackEvent('diagnosis_success')
      setStatus('idle')
    } catch (err) {
      const classified = classifyAIError(err)
      setError(classified.message)
      setStatus('error')
    }
  }

  const handleSave = () => {
    if (!result || !currentProjectId) return
    addAccountDiagnosis(currentProjectId, {
      summary: result.summary,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      strategies: result.strategies,
      snapshot,
    })
    setResult(null)
    // 重置表单
    setFormData({
      accountName: '',
      platform: '小红书',
      positioning: '',
      followers: '',
      recentPerformance: '',
    })
  }

  const handleDelete = (id) => {
    if (confirm('确定删除这条诊断记录吗？')) {
      deleteAccountDiagnosis(id)
    }
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const hasApiKey = Boolean(getApiKey())

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">账号诊断</h1>
        <p className="text-sm text-gray-500 mt-1">AI 帮你找出账号问题</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* API Key 未配置提示 */}
          {!hasApiKey && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <KeyRound size={18} className="text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-amber-900">未配置 DeepSeek API Key</div>
                <div className="text-amber-700 mt-0.5">请先前往「设置」页面配置 API Key 后再进行诊断</div>
              </div>
            </div>
          )}

          {/* 诊断表单 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope size={18} className="text-brand-500" />
              <h3 className="font-semibold text-gray-900">填写账号信息</h3>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">账号名称</label>
                  <input
                    value={formData.accountName}
                    onChange={(e) => handleInputChange('accountName', e.target.value)}
                    placeholder="如：生活研究所"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">平台类型</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => handleInputChange('platform', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">账号定位</label>
                  <input
                    value={formData.positioning}
                    onChange={(e) => handleInputChange('positioning', e.target.value)}
                    placeholder="如：家居改造 / 穿搭分享"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">粉丝数量</label>
                  <input
                    type="number"
                    value={formData.followers}
                    onChange={(e) => handleInputChange('followers', e.target.value)}
                    placeholder="如：12000"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">
                  近期内容表现 <span className="text-gray-400">（选填）</span>
                </label>
                <textarea
                  value={formData.recentPerformance}
                  onChange={(e) => handleInputChange('recentPerformance', e.target.value)}
                  placeholder="如：平均浏览 3000，点赞 200"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400 resize-none"
                />
              </div>

              {/* 数据快照预览 */}
              <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-[11px] text-gray-500">归档内容</div>
                  <div className="text-sm font-semibold text-gray-900">{snapshot.assetsCount}</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-500">风格规则</div>
                  <div className="text-sm font-semibold text-gray-900">{snapshot.rulesCount}</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-500">已确认</div>
                  <div className="text-sm font-semibold text-gray-900">{snapshot.confirmedRulesCount}</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-500">表现记录</div>
                  <div className="text-sm font-semibold text-gray-900">{snapshot.performanceCount}</div>
                </div>
              </div>

              <button
                onClick={handleDiagnose}
                disabled={status === 'loading' || !formData.accountName.trim()}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  status === 'loading' || !formData.accountName.trim()
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                }`}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    AI 诊断中...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    开始 AI 诊断
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {status === 'error' && error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                <div className="text-sm text-red-700">{error}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDiagnose}
                  className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700"
                >
                  重新尝试
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                >
                  前往设置配置 API Key
                </button>
              </div>
            </div>
          )}

          {/* 诊断结果（结论先行，限制每类最多 2 条） */}
          {result && (
            <div className="bg-white rounded-xl border border-brand-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <h3 className="font-semibold text-gray-900">诊断结果</h3>
                </div>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700"
                >
                  保存到历史
                </button>
              </div>

              {/* 总结（结论先行） */}
              {result.summary && (
                <div className="p-3 bg-brand-50 rounded-lg">
                  <div className="text-[11px] text-brand-600 font-medium mb-1">结论</div>
                  <div className="text-sm text-gray-900 leading-relaxed">{result.summary}</div>
                </div>
              )}

              {/* 优势（最多 2 条） */}
              {result.strengths.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    优势
                  </div>
                  <ul className="space-y-1.5">
                    {result.strengths.slice(0, 2).map((s, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 问题（最多 2 条） */}
              {result.weaknesses.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-red-500" />
                    问题
                  </div>
                  <ul className="space-y-1.5">
                    {result.weaknesses.slice(0, 2).map((w, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">•</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 建议（最多 2 条） */}
              {result.strategies.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-brand-500" />
                    下一步建议
                  </div>
                  <ul className="space-y-1.5">
                    {result.strategies.slice(0, 2).map((st, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-brand-400 mt-0.5">•</span>
                        {st}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 诊断历史 */}
          {projectDiagnoses.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Activity size={14} className="text-brand-500" />
                诊断历史 ({projectDiagnoses.length})
              </h3>
              {projectDiagnoses.map((diag) => (
                <div key={diag.id} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">{formatTime(diag.createdAt)}</div>
                    <button
                      onClick={() => handleDelete(diag.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {diag.summary && (
                    <div className="p-2.5 bg-gray-50 rounded-lg text-sm text-gray-900">
                      {diag.summary}
                    </div>
                  )}

                  {diag.strengths.length > 0 && (
                    <div>
                      <div className="text-[11px] font-medium text-emerald-600 mb-1">优势</div>
                      <div className="text-xs text-gray-700">{diag.strengths.join('；')}</div>
                    </div>
                  )}

                  {diag.weaknesses.length > 0 && (
                    <div>
                      <div className="text-[11px] font-medium text-red-600 mb-1">问题</div>
                      <div className="text-xs text-gray-700">{diag.weaknesses.join('；')}</div>
                    </div>
                  )}

                  {diag.strategies.length > 0 && (
                    <div>
                      <div className="text-[11px] font-medium text-brand-600 mb-1">建议</div>
                      <div className="text-xs text-gray-700">{diag.strategies.join('；')}</div>
                    </div>
                  )}

                  {/* 快照 */}
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-2 border-t border-gray-50">
                    <span>归档 {diag.snapshot?.assetsCount || 0}</span>
                    <span>规则 {diag.snapshot?.rulesCount || 0}</span>
                    <span>已确认 {diag.snapshot?.confirmedRulesCount || 0}</span>
                    <span>表现 {diag.snapshot?.performanceCount || 0}</span>
                    <span>阶段 {diag.snapshot?.learningStage || '建立认知'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
