import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { callAI, classifyAIError } from '../../utils/aiClient'
import { generateContentViaAI, parseAIResponse } from '../Pipeline'
import AIErrorBanner from '../../components/AIErrorBanner'
import UpgradePrompt from '../../components/UpgradePrompt'
import { buildAnalysisPrompt } from './analysisPrompt.mjs'
import { smartRecognize } from '../../utils/visionOCR'
import {
  Search,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Flame,
  RefreshCw,
  Save,
  X,
  Type,
  FileText,
  Link2,
  Target,
  Brain,
  AlertTriangle,
  Wand2,
  ChevronRight,
  TrendingUp,
  BookOpen,
  ChevronDown,
  Camera,
} from 'lucide-react'

// buildAnalysisPrompt 已提取到 ./analysisPrompt.mjs，供本组件与 batch-test.mjs 共用
const DOMAINS = [
  '健康养生', '职场干货', '母婴育儿', '美妆护肤', '美食',
  '家居生活', '情感心理', '财经理财', '教育学习', '科技数码', '其他',
]

// buildAnalysisPrompt 已提取到 ./analysisPrompt.mjs，供本组件与 batch-test.mjs 共用

// 渲染星级
function renderStars(n) {
  const num = Math.max(0, Math.min(5, n || 0))
  return '★'.repeat(num) + '☆'.repeat(5 - num)
}

export default function CompetitorAnalyzer() {
  const navigate = useNavigate()
  // store
  const currentProjectId = useStore((s) => s.currentProjectId)
  const projects = useStore((s) => s.projects)
  const addContentPattern = useStore((s) => s.addContentPattern)
  const createProject = useStore((s) => s.createProject)
  const allStyleDNA = useStore((s) => s.styleDNA)
  const allAccountMemory = useStore((s) => s.accountMemory)
  const hasCredit = useStore((s) => s.hasCredit)
  const consumeCredit = useStore((s) => s.consumeCredit)
  const getRemainingCredits = useStore((s) => s.getRemainingCredits)
  const addCredits = useStore((s) => s.addCredits)
  const credits = useStore((s) => s.credits)
  const addPerformanceRecord = useStore((s) => s.addPerformanceRecord)

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  )
  // 生成阶段才读 StyleDNA（分析阶段不读）
  const currentDNA = useMemo(
    () => allStyleDNA.find((d) => d.projectId === currentProjectId && d.status === 'active'),
    [allStyleDNA, currentProjectId]
  )
  // v11：生成阶段注入账号记忆
  const currentMemory = useMemo(
    () => allAccountMemory.find((m) => m.projectId === currentProjectId),
    [allAccountMemory, currentProjectId]
  )

  // ===== 从 Landing 快速输入 =====
  const location = useLocation()
  useEffect(() => {
    const quickInput = location.state?.quickInput
    if (quickInput) {
      // 尝试分离标题和正文（第一行作为标题，其余作为正文）
      const lines = quickInput.split('\n').filter(l => l.trim())
      if (lines.length > 1) {
        setTitle(lines[0].trim())
        setContent(lines.slice(1).join('\n'))
      } else {
        setTitle(quickInput)
      }
      // 自动触发分析
      setTimeout(() => handleAnalyze(quickInput), 100)
    }
  }, [location.state])

  // ===== 输入状态 =====
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [description, setDescription] = useState('')

  // ===== 分析结果 =====
  const [analysisResult, setAnalysisResult] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [showFullReport, setShowFullReport] = useState(false)

  // ===== 第四层：领域 + 生成 =====
  const [userDomain, setUserDomain] = useState('健康养生')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVersion, setGeneratedVersion] = useState(null)
  const [genError, setGenError] = useState('')

  const [copied, setCopied] = useState('')
  const hasApiKey = Boolean(localStorage.getItem('contentos_api_key'))

  // ===== CTA 区域状态 =====
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [createTopic, setCreateTopic] = useState('')

  // ===== 数据飞轮状态 =====
  const [showPerformanceForm, setShowPerformanceForm] = useState(false)
  const [perfViews, setPerfViews] = useState('')
  const [perfLikes, setPerfLikes] = useState('')
  const [perfComments, setPerfComments] = useState('')
  const [perfMetExpectation, setPerfMetExpectation] = useState('')
  const [perfSubmitted, setPerfSubmitted] = useState(false)

  // ===== 截图 OCR 状态 =====
  const [ocrStatus, setOcrStatus] = useState('idle') // idle | loading | done | error
  const [ocrError, setOcrError] = useState('')
  const [ocrPhase, setOcrPhase] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrMethod, setOcrMethod] = useState(null)
  const [showOcrPreview, setShowOcrPreview] = useState(false)

  // ===== 分享解锁状态 =====
  const [showShareUnlock, setShowShareUnlock] = useState(false)
  const [shareVerifyStatus, setShareVerifyStatus] = useState('idle') // idle | verifying | success | fail
  const [shareVerifyMsg, setShareVerifyMsg] = useState('')

  // ===== 小红书图文卡片 =====
  const [showXhsCard, setShowXhsCard] = useState(false)

  // 截图上传 → AI 视觉识别 → 预览编辑 → 填入文案
  const handleScreenshotUpload = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setOcrError('请选择图片文件')
      setOcrStatus('error')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setOcrError('图片不能超过 20MB')
      setOcrStatus('error')
      return
    }

    setOcrError('')
    setOcrStatus('loading')
    setShowOcrPreview(false)

    setOcrPhase('vision')

    try {
      const { text, method } = await smartRecognize(file, (phase, pct) => {
        setOcrPhase(phase)
        setOcrProgress(pct)
      })
      setOcrMethod(method)

      if (!text || text.trim().length < 3) {
        setOcrError('未能从截图中识别到文字，请换一张更清晰的截图或手动输入')
        setOcrStatus('error')
        return
      }

      const existing = content.trim()
      const newText = existing ? `${existing}\n\n${text.trim()}` : text.trim()
      setContent(newText)
      setOcrStatus('done')
      setShowOcrPreview(true)
    } catch (err) {
      const msg = err.message || ''
      if (msg === 'NO_ZHIPU_KEY') {
        setOcrError('截图识别需要智谱 API Key（免费），请在设置中配置，或手动输入文案')
      } else if (msg.includes('timeout') || msg.includes('超时')) {
        setOcrError('网络超时，请检查网络后重试，或手动输入文案')
      } else if (msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
        setOcrError('网络连接失败，请检查网络后重试')
      } else {
        setOcrError('截图识别失败：' + (msg || '请重试或手动输入'))
      }
      setOcrStatus('error')
    } finally {
      setOcrPhase(null)
      setOcrProgress(0)
    }
  }

  // ===== 分享解锁：上传小红书截图，检测水印并奖励 3 次拆解额度 =====
  const handleShareVerify = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setShareVerifyMsg('请上传图片')
      setShareVerifyStatus('fail')
      return
    }
    setShareVerifyStatus('verifying')
    setShareVerifyMsg('')
    try {
      const text = await smartRecognize(file).then(r => r.text)
      const hasWatermark =
        /由.*果核.*拆解/.test(text) ||
        /果核.*拆解/.test(text) ||
        /30秒看透爆款设计逻辑/.test(text) ||
        /mellifluous-cannoli-52443c/.test(text) ||
        /guohe/.test(text && text.toLowerCase && text.toLowerCase().length > 5) ||
        /果核/.test(text && text.length > 5)
      if (hasWatermark) {
        addCredits('competitorAnalyze', 3)
        setShareVerifyStatus('success')
        setShareVerifyMsg('解锁成功！获得 3 次免费拆解额度 🎉')
      } else {
        setShareVerifyStatus('fail')
        setShareVerifyMsg('未检测到「由 果核 拆解」水印，请确保截图包含水印区域后重试')
      }
    } catch (err) {
      setShareVerifyStatus('fail')
      setShareVerifyMsg('识别失败：' + (err.message || '请重试'))
    }
  }

  // ===== 拆解分析 =====
  const handleAnalyze = async (quickInput) => {
    // 支持 quickInput 直接传入（从 Landing 跳转）
    let analyzeTitle = title
    let analyzeContent = content
    if (quickInput) {
      const lines = quickInput.split('\n').filter(l => l.trim())
      if (lines.length > 1) {
        analyzeTitle = lines[0].trim()
        analyzeContent = lines.slice(1).join('\n')
      } else {
        analyzeTitle = quickInput
      }
    }
    if (!analyzeTitle.trim() && !analyzeContent.trim()) {
      setError('请至少输入标题或文案内容')
      return
    }
    setError('')
    setAnalysisResult(null)
    setSaved(false)
    setGeneratedVersion(null)
    setShowFullReport(false)

    const apiKey = localStorage.getItem('contentos_api_key')
    if (!apiKey) {
      setError('请先连接 AI 服务，再开始拆解')
      return
    }

    // 额度校验：免费体验限制
    if (!hasCredit('competitorAnalyze')) {
      setError('你的账号大脑已经建立，升级后可继续学习和生成。')
      return
    }

    setIsAnalyzing(true)
    try {
      // 注入用户账号数据，让 AI 判断账号适配度
      const accountSummary = {
        contentCount: currentMemory?.contentHistory?.length || 0,
        topPattern: currentMemory?.winningPatterns?.[0]?.pattern || '暂无',
        recentFailed: Array.isArray(currentMemory?.failedPatterns) ? currentMemory.failedPatterns.slice(0, 2).map(f => f.reason) : [],
        styleTag: currentDNA?.contentPersona || '未设置',
      }

      const text = await callAI(
        apiKey,
        buildAnalysisPrompt({ title: analyzeTitle, content: analyzeContent, description, accountSummary }),
        { temperature: 0.7, max_tokens: 4000, timeout: 60000 }
      )
      const parsed = parseAnalysisResult(text)
      if (parsed) {
        // 成功后再扣减额度
        consumeCredit('competitorAnalyze')
        setAnalysisResult(parsed)
      } else {
        setError('AI 返回格式异常，请重试')
      }
    } catch (err) {
      const errInfo = classifyAIError(err)
      setError(errInfo.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 两阶段 JSON 解析（兼容 markdown 包裹、尾逗号）
  const parseAnalysisResult = (text) => {
    try {
      let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[0].replace(/,(\s*[}\]])/g, '$1')
        return JSON.parse(jsonStr)
      }
      return null
    } catch {
      return null
    }
  }

  // ===== 保存到研究库（addContentPattern，不存 decisionReplay）=====
  const handleSave = () => {
    if (!analysisResult) return
    let projectId = currentProjectId
    if (!projectId) {
      // 无项目时自动创建默认账号（不阻断用户）
      projectId = createProject({
        name: '我的账号',
        platform: '小红书',
        category: userDomain || '通用',
      })
    }
    addContentPattern(projectId, {
      source: 'viral_reverse',
      sourceTitle: title,
      sourcePlatform: '通用', // 实验室不区分平台，保留字段兼容结构
      pattern: analysisResult.diagnosis?.mechanismTags?.join('+') || '爆款模式',
      // description 语义升级：保存「爆款机制说明」，优先 viralMechanism → killerMove → 空
      description:
        analysisResult.viralMechanism ||
        analysisResult.diagnosis?.killerMove ||
        '',
      deconstruction: analysisResult.deconstruction || {},
      decisionPrinciples: analysisResult.decisionPrinciples || [],
      viralMechanism: analysisResult.viralMechanism || '',
      transferability: analysisResult.transferability || {},
      notTransferable: analysisResult.notTransferable || [],
      fireScore: analysisResult.diagnosis?.fireScore || {},
      confidence: (analysisResult.transferability?.score || 3) / 5,
      // V1.1 新增字段
      killerMoveFormula: analysisResult.diagnosis?.killerMoveFormula || '',
      migrationExamples: analysisResult.migrationExamples || [],
    })
    setSaved(true)
  }

  // ===== 生成我的版本（复用 generateContentViaAI）=====
  const handleGenerateMyVersion = async () => {
    const apiKey = localStorage.getItem('contentos_api_key')
    if (!apiKey) {
      setGenError('请先连接 AI 服务')
      return
    }
    setIsGenerating(true)
    setGenError('')
    setGeneratedVersion(null)
    try {
      // 构造当前拆解的 pattern（注入生成）
      const currentPattern = {
        pattern: analysisResult.diagnosis?.mechanismTags?.join('+') || '',
        deconstruction: analysisResult.deconstruction || {},
        decisionPrinciples: analysisResult.decisionPrinciples || [],
        notTransferable: analysisResult.notTransferable || [],
      }
      const text = await generateContentViaAI(
        title,
        userDomain,
        apiKey,
        [],
        currentDNA,
        [currentPattern],
        currentMemory
      )
      const parsed = parseAIResponse(text)
      setGeneratedVersion(parsed)
    } catch (err) {
      setGenError(classifyAIError(err).message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setTitle('')
    setContent('')
    setDescription('')
    setAnalysisResult(null)
    setError('')
    setSaved(false)
    setGeneratedVersion(null)
    setGenError('')
  }

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  // ===== 数据飞轮：提交效果数据 =====
  const handlePerfSubmit = () => {
    if (!currentProjectId) return
    addPerformanceRecord(currentProjectId, {
      title: title || '未命名',
      metrics: {
        views: Number(perfViews) || 0,
        likes: Number(perfLikes) || 0,
        comments: Number(perfComments) || 0,
        saves: 0,
        shares: 0,
      },
      publishedAt: Date.now(),
    })
    setPerfSubmitted(true)
  }

  const diagnosis = analysisResult?.diagnosis
  const fireScore = diagnosis?.fireScore

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 */}
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 text-white flex items-center justify-center">
              <Flame size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">爆款实验室</h1>
              <p className="text-sm text-gray-500 mt-0.5">拆解爆款 → 还原高手决策 → 找到我的机会</p>
            </div>
          </div>
          {currentProject && (
            <div className="text-right">
              <div className="text-xs text-gray-400">当前账号</div>
              <div className="text-sm font-medium text-gray-700">
                {currentProject.name} · {currentProject.platform || '未设置'}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {!hasApiKey && <AIErrorBanner />}

          {/* 输入区 */}
          {!analysisResult && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-brand-600" />
                <h2 className="text-lg font-semibold text-gray-900">输入爆款内容</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Type className="w-4 h-4 inline mr-1" />
                    爆款标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：30岁前必须知道的5个赚钱真相"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      <FileText className="w-4 h-4 inline mr-1" />
                      文案/脚本内容
                    </label>

                    {/* 截图上传 OCR 按钮 */}
                    <label className="cursor-pointer">
                      {ocrStatus === 'loading' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium">
                          <Loader2 size={12} className="animate-spin" />
                          AI 识别中 {ocrProgress}%
                        </span>
                      ) : ocrStatus === 'done' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-600 text-xs font-medium">
                          <Check size={12} />
                          识别完成
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 text-gray-600 text-xs font-medium hover:bg-brand-50 hover:text-brand-600 transition-colors border border-gray-200">
                          <Camera size={12} />
                          📷 上传截图
                        </span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleScreenshotUpload(e.target.files[0])
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>

                  {/* 识别进度 */}
                  {ocrStatus === 'loading' && (
                    <div className="mb-2 text-[11px] px-2.5 py-1.5 rounded-md text-blue-600 bg-blue-50">
                      {`AI 识别中... ${ocrProgress}%`}
                      <div className="mt-1 w-full h-1 rounded-full overflow-hidden bg-white/60">
                        <div
                          className="h-full transition-all duration-200 bg-blue-500"
                          style={{ width: `${Math.max(ocrProgress, 3)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {ocrStatus === 'error' && ocrError && (
                    <div className="mb-2 text-[11px] text-red-500 bg-red-50 px-2.5 py-1.5 rounded-md">
                      {ocrError}
                    </div>
                  )}

                  {/* 识别结果预览（可编辑） */}
                  {showOcrPreview && content && (
                    <div className="mb-2 text-[11px] px-2.5 py-2 rounded-md border border-brand-200 bg-brand-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-brand-700">
                          ✅ 截图已识别，可在下方编辑修正
                        </span>
                        <button
                          onClick={() => setShowOcrPreview(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p className="text-gray-500 text-[10px]">
                        如识别不准，直接在下方文案框修改，确认无误后点「开始拆解」
                      </p>
                    </div>
                  )}

                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="粘贴爆款视频的完整文案或脚本内容..."
                    rows={6}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Link2 className="w-4 h-4 inline mr-1" />
                    视频描述/评论亮点
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="视频简介、评论区高频讨论、话题标签等..."
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm resize-none"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <X className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {/* 免费体验额度提示 */}
                <div className="text-[11px] text-gray-400 mb-2 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                    免费体验剩余：{getRemainingCredits('competitorAnalyze')}/{(credits.freeExperience?.competitorAnalyze ?? 1)}
                  </span>
                  <span>用完后升级 Pro 可无限拆解</span>
                  <button
                    onClick={() => {
                      setShowShareUnlock(true)
                      setShareVerifyStatus('idle')
                      setShareVerifyMsg('')
                    }}
                    className="text-brand-600 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    🎁 分享拆解报告到小红书，截图上传解锁 3 次
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleAnalyze()}
                    disabled={isAnalyzing || !hasApiKey}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        操盘手正在逆向分析...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        拆解这个爆款
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={isAnalyzing}
                    className="px-6 py-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
                  >
                    清空
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========== 四层结果展示 ========== */}
          {analysisResult && (
            <div className="space-y-6">
              {/* 操作栏 */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>拆解完成 · 操盘手级逆向分析</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAnalysisResult(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    拆解新爆款
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {saved ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        已保存到研究库
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        保存到研究库
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ===== 第一步：一句话总结 ===== */}
              <div className="bg-gradient-to-br from-amber-50 to-red-50 rounded-xl border-2 border-amber-200 p-6 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium mb-4">
                  <Check size={13} />
                  拆解完成
                </div>
                {diagnosis?.killerMove && (
                  <div className="mb-4">
                    <div className="text-[11px] text-amber-600 font-medium mb-2">💡 一句话总结</div>
                    <p className="text-lg text-gray-900 font-medium leading-relaxed">
                      {diagnosis.killerMove}
                    </p>
                  </div>
                )}
                {diagnosis?.killerMoveFormula && (
                  <div className="mb-4 p-3 bg-white rounded-lg border border-amber-200 inline-block">
                    <div className="text-[11px] text-orange-600 font-medium mb-1">操作公式</div>
                    <p className="text-sm text-gray-800 font-semibold tracking-wide">
                      {diagnosis.killerMoveFormula}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={() => setShowFullReport(!showFullReport)}
                    className="px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    {showFullReport ? '收起完整报告' : '看完整报告'}
                    <ChevronDown size={15} className={`transition-transform ${showFullReport ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className="px-5 py-2.5 rounded-full bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-60 flex items-center gap-2"
                  >
                    {saved ? <><Check size={16} /> 已保存</> : <><Save size={16} /> 保存</>}
                  </button>
                  <button
                    onClick={async () => {
                      if (!saved) handleSave()
                      navigate('/factory/pipeline', {
                        state: {
                          fromAnalyzer: true,
                          killerMove: diagnosis?.killerMove || '',
                          sacrifice: diagnosis?.sacrifice || '',
                          formula: diagnosis?.killerMoveFormula || '',
                          title: title || '',
                          sourceTitle: title || '',
                          deconstruction: analysisResult?.deconstruction || {},
                          decisionPrinciples: analysisResult?.decisionPrinciples || [],
                        },
                      })
                    }}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#a78bfa] text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Sparkles size={16} />
                    用这个逻辑创作
                  </button>
                </div>
              </div>

              {/* ===== 第二步：完整报告（可展开/收起） ===== */}
              {showFullReport && (
                <>
              {/* 原始输入展示 */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-xs text-gray-400 mb-2">分析样本</div>
                <div className="text-sm font-medium text-gray-900">{title}</div>
              </div>

              {/* 第一层：爆款诊断 */}
              {diagnosis && (
                <div className="bg-gradient-to-br from-amber-50 to-red-50 rounded-xl border-2 border-amber-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-semibold text-gray-900">爆款诊断</h3>
                  </div>

                  {/* 杀手锏 */}
                  {diagnosis.killerMove && (
                    <div className="mb-4">
                      <div className="text-[11px] text-amber-600 font-medium mb-1.5">爆款真正杀手锏</div>
                      <p className="text-base text-gray-900 font-medium leading-relaxed">
                        {diagnosis.killerMove}
                      </p>
                    </div>
                  )}

                  {/* V1.1：操作公式 */}
                  {diagnosis.killerMoveFormula && (
                    <div className="mb-4 p-3.5 bg-white rounded-lg border border-amber-200">
                      <div className="text-[11px] text-orange-600 font-medium mb-1.5 flex items-center gap-1">
                        <ChevronRight size={12} />
                        操作公式
                      </div>
                      <p className="text-sm text-gray-800 font-semibold leading-relaxed tracking-wide">
                        {diagnosis.killerMoveFormula}
                      </p>
                    </div>
                  )}

                  {/* 机制标签 */}
                  {diagnosis.mechanismTags?.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[11px] text-gray-500 font-medium mb-2">爆款机制</div>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(diagnosis.mechanismTags) ? diagnosis.mechanismTags : []).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-white text-amber-700 text-xs rounded-md border border-amber-200 font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 火指数 */}
                  {fireScore && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-[11px] text-gray-500 mb-1">传播性</div>
                        <div className="text-sm font-semibold text-green-600">{renderStars(fireScore.spread)}</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-[11px] text-gray-500 mb-1">可复制性</div>
                        <div className="text-sm font-semibold text-amber-600">{renderStars(fireScore.replicability)}</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-[11px] text-gray-500 mb-1">迁移难度</div>
                        <div className="text-sm font-semibold text-gray-700">{fireScore.difficulty || '-'}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 平台流量密码 */}
              {analysisResult.platformMetrics && (
                <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
                  <div className="flex items-center gap-2 text-purple-700 text-sm font-medium mb-2">
                    <span>🎯</span>
                    <span>平台流量密码</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 text-xs">{analysisResult.platformMetrics.platform || '未识别'}</span>
                  </div>
                  <p className="text-gray-700 text-sm">{analysisResult.platformMetrics.primaryMetric}</p>
                  <p className="text-gray-600 text-xs mt-1">⚡ {analysisResult.platformMetrics.howOptimized}</p>
                  <p className="text-purple-500 text-xs mt-1">📊 {analysisResult.platformMetrics.thresholdHint}</p>
                </div>
              )}

              {/* 选题时机 */}
              {analysisResult.timingAssessment && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-2">
                    <span>⏰</span>
                    <span>选题时机</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-xs">{analysisResult.timingAssessment.type || '未判断'}</span>
                  </div>
                  <p className="text-gray-700 text-sm">{analysisResult.timingAssessment.window}</p>
                  <p className="text-red-500 text-xs mt-1">⚠️ {analysisResult.timingAssessment.risk}</p>
                  <p className="text-gray-500 text-xs mt-1">💡 {analysisResult.timingAssessment.suggestion}</p>
                </div>
              )}

              {/* 账号适配 */}
              {analysisResult.accountFit && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium mb-2">
                    <span>👤</span>
                    <span>账号适配</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-xs">{analysisResult.accountFit.stage || '未判断'}</span>
                  </div>
                  <p className="text-gray-700 text-sm">{analysisResult.accountFit.matchHint}</p>
                  <p className="text-emerald-600 text-xs mt-1">💡 {analysisResult.accountFit.adjustment}</p>
                </div>
              )}

              {/* 第二层：高手为什么这么设计 */}
              {analysisResult.decisionReplay?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <h3 className="text-base font-semibold text-gray-900">高手为什么这么设计</h3>
                  </div>

                  <div className="space-y-3">
                    {(Array.isArray(analysisResult.decisionReplay) ? analysisResult.decisionReplay : []).map((item, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{item.position}</span>
                        </div>
                        <div className="ml-8 space-y-1.5 text-sm">
                          <div className="text-gray-700">
                            <span className="text-gray-400">为什么这样设计：</span>
                            {item.designIntent}
                          </div>
                          <div className="text-gray-600 text-xs">
                            <span className="text-gray-400">决策逻辑：</span>
                            {item.decisionLogic}
                          </div>
                          <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1.5 rounded mt-1.5">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                            <div className="flex-1">
                              {/* V1.1：tradeoffType 标签 */}
                              {item.tradeoffType && (
                                <span className={`mr-1.5 font-semibold ${
                                  item.tradeoffType === '主动设计'
                                    ? 'text-green-600'
                                    : 'text-red-500'
                                }`}>
                                  {item.tradeoffType === '主动设计' ? '🟢 主动设计' : '🔴 被动代价'}
                                </span>
                              )}
                              <span>取舍：{item.tradeoff}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 第三层：我能学什么 */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-brand-600" />
                  <h3 className="text-base font-semibold text-gray-900">我能学什么</h3>
                </div>

                {/* 可迁移原则 */}
                {analysisResult.decisionPrinciples?.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-green-600 font-medium mb-2">可迁移的原则</div>
                    <div className="space-y-2">
                      {(Array.isArray(analysisResult.decisionPrinciples) ? analysisResult.decisionPrinciples : []).map((p, i) => (
                        <div key={i} className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <div className="flex items-start gap-2">
                            <Check size={14} className="text-green-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{p.principle}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                适用：{p.applyCondition}
                              </div>
                              <div className="text-xs text-amber-600 mt-0.5">
                                代价：{p.tradeoff}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 不可复制 */}
                {analysisResult.notTransferable?.length > 0 && (
                  <div>
                    <div className="text-xs text-red-600 font-medium mb-2">不要直接抄这些</div>
                    <div className="space-y-1.5">
                      {(Array.isArray(analysisResult.notTransferable) ? analysisResult.notTransferable : []).map((n, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg">
                          <X size={14} className="text-red-500 mt-0.5 shrink-0" />
                          <span className="text-sm text-gray-700">{n}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 第四层：我的机会 */}
              <div className="bg-white rounded-xl border-2 border-brand-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-brand-600" />
                  <h3 className="text-base font-semibold text-gray-900">我的机会</h3>
                </div>

                {/* 领域选择 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">你的领域</label>
                  <select
                    value={userDomain}
                    onChange={(e) => setUserDomain(e.target.value)}
                    className="w-full md:w-64 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  >
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 mb-5">
                  {/* 推荐方向 */}
                  <div className="p-3 bg-brand-50 rounded-lg border border-brand-100">
                    <div className="text-xs text-brand-600 font-medium mb-1">推荐方向</div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      借用「{analysisResult.viralMechanism || '爆款机制'}」，迁移到「{userDomain}」领域使用。
                      保留决策逻辑，替换领域素材。
                    </div>
                  </div>

                  {/* 应该保留 */}
                  {analysisResult.decisionPrinciples?.length > 0 && (
                    <div>
                      <div className="text-xs text-green-600 font-medium mb-1.5">应该保留</div>
                      <ul className="space-y-1">
                        {(Array.isArray(analysisResult.decisionPrinciples) ? analysisResult.decisionPrinciples : []).map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <Check size={14} className="text-green-500 mt-0.5 shrink-0" />
                            {p.principle}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 应该替换 */}
                  {analysisResult.notTransferable?.length > 0 && (
                    <div>
                      <div className="text-xs text-amber-600 font-medium mb-1.5">应该替换</div>
                      <ul className="space-y-1">
                        {(Array.isArray(analysisResult.notTransferable) ? analysisResult.notTransferable : []).map((n, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <X size={14} className="text-amber-500 mt-0.5 shrink-0" />
                            {n} → 换成「{userDomain}」领域相关的内容
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* V1.1：具体迁移示例（migrationExamples） */}
                  {analysisResult.migrationExamples?.length > 0 && (
                    <div>
                      <div className="text-xs text-purple-600 font-medium mb-2 flex items-center gap-1">
                        <ChevronRight size={12} />
                        具体迁移示例
                      </div>
                      <div className="space-y-2">
                        {(Array.isArray(analysisResult.migrationExamples) ? analysisResult.migrationExamples : []).map((m, i) => (
                          <div key={i} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="text-xs space-y-1.5">
                              <div className="flex items-start gap-2">
                                <span className="w-16 shrink-0 text-gray-500 font-medium">原机制：</span>
                                <span className="text-gray-800">{m.originalMechanism}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-16 shrink-0 text-gray-500 font-medium flex items-center gap-0.5">
                                  换什么：<ChevronRight size={10} />
                                </span>
                                <span className="text-brand-700 font-medium">{m.replaceWith}</span>
                              </div>
                              <div className="flex items-start gap-2 pl-14">
                                <span className="text-xs text-gray-500 shrink-0">例：</span>
                                <span className="text-gray-700 italic">{m.example}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 风险提醒 */}
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                      <div className="text-xs text-gray-600 leading-relaxed">
                        不要直接复制原爆款文案。只迁移决策逻辑和结构，替换为你领域的素材，
                        否则会被判定为搬运。
                      </div>
                    </div>
                  </div>
                </div>

                {/* 生成按钮 */}
                <button
                  onClick={handleGenerateMyVersion}
                  disabled={isGenerating || !hasApiKey}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm font-medium"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      正在生成我的版本...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      生成我的版本
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {genError && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <X className="w-4 h-4" />
                    {genError}
                  </div>
                )}

                {/* 生成结果 */}
                {generatedVersion && (
                  <div className="mt-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-brand-500" />
                        我的版本
                      </h4>
                      <button
                        onClick={() => handleCopy(generatedVersion.body, 'version')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-gray-600 text-xs hover:bg-gray-100 border border-gray-200"
                      >
                        {copied === 'version' ? <Check size={12} /> : <Copy size={12} />}
                        {copied === 'version' ? '已复制' : '复制全文'}
                      </button>
                    </div>

                    {generatedVersion.title && (
                      <div className="mb-2">
                        <div className="text-[11px] text-gray-500 mb-0.5">标题</div>
                        <div className="p-2.5 bg-white rounded text-sm font-medium text-gray-900">
                          {generatedVersion.title}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-[11px] text-gray-500 mb-0.5">正文</div>
                      <pre className="p-2.5 bg-white rounded text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                        {generatedVersion.body}
                      </pre>
                    </div>

                    {currentDNA ? (
                      <div className="mt-2 text-[11px] text-green-600 flex items-center gap-1">
                        <Check size={11} />
                        已融合你的内容模型（StyleDNA）
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-gray-400">
                        通用语气版 · 建立内容模型后生成会更像你的风格
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ===== CTA 区域 ===== */}
              <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-200">
                <div className="flex flex-wrap items-center gap-3">
                  {/* 保存到研究库 */}
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className="px-5 py-2.5 rounded-full bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-60 flex items-center gap-2"
                  >
                    {saved ? (
                      <><Check size={16} /> 已保存</>
                    ) : (
                      <><Save size={16} /> 保存到研究库</>
                    )}
                  </button>
                  {saved && (
                    <Link
                      to="/workbench/case-library"
                      className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <BookOpen size={14} />
                      去研究库查看
                    </Link>
                  )}

                  <div className="flex-1" />

                  {/* 一键生成小红书图文卡片 */}
                  <button
                    onClick={() => setShowXhsCard(true)}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm shadow-rose-200"
                  >
                    <BookOpen size={16} />
                    📱 一键小红书卡片
                  </button>

                  {/* 去创作工厂深度生成 */}
                  <button
                    onClick={async () => {
                      if (!saved) handleSave()
                      navigate('/factory/pipeline', {
                        state: {
                          fromAnalyzer: true,
                          killerMove: diagnosis?.killerMove || '',
                          sacrifice: diagnosis?.sacrifice || '',
                          formula: diagnosis?.killerMoveFormula || '',
                          title: title || '',
                          sourceTitle: title || '',
                          deconstruction: analysisResult?.deconstruction || {},
                          decisionPrinciples: analysisResult?.decisionPrinciples || [],
                        },
                      })
                    }}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#a78bfa] text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm shadow-brand-200"
                  >
                    <Sparkles size={16} />
                    🏭 去创作工厂深度生成
                  </button>

                  {/* 用 killerMove 创作 */}
                  <button
                    onClick={() => setShowCreateInput(!showCreateInput)}
                    className="px-5 py-2.5 rounded-full bg-white border border-brand-300 text-brand-600 text-sm font-medium hover:bg-brand-50 transition-colors flex items-center gap-2"
                  >
                    <Wand2 size={16} />
                    ✍️ 快速改写
                    <ChevronDown size={14} className={`transition-transform ${showCreateInput ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* 创作工厂副文案 */}
                <p className="mt-2 text-xs text-gray-500 pl-2">
                  🏭 基于这个 killerMove，用完整的 6 步导演流程生成你的版本
                </p>

                {/* 创作输入区 */}
                {showCreateInput && (
                  <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
                    <input
                      value={createTopic}
                      onChange={(e) => setCreateTopic(e.target.value)}
                      placeholder="你想写什么主题？"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                    />
                    <button
                      onClick={() => {
                        if (createTopic.trim()) {
                          setTitle(createTopic.trim())
                        }
                        handleGenerateMyVersion()
                      }}
                      disabled={isGenerating || !hasApiKey}
                      className="mt-3 w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-600 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <><Loader2 size={16} className="animate-spin" /> 正在生成...</>
                      ) : (
                        <><Sparkles size={16} /> 生成我的版本</>
                      )}
                    </button>
                    {genError && (
                      <div className="mt-2 text-sm text-red-600">{genError}</div>
                    )}
                    {generatedVersion && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        {generatedVersion.title && (
                          <div className="font-medium text-gray-900 mb-1">{generatedVersion.title}</div>
                        )}
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{generatedVersion.body}</pre>
                      </div>
                    )}
                  </div>
                )}

                {/* 数据飞轮：保存后可填写效果数据 */}
                {saved && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowPerformanceForm(!showPerformanceForm)}
                      className="text-sm text-gray-600 hover:text-brand-600 flex items-center gap-1.5 transition-colors"
                    >
                      <TrendingUp size={14} />
                      📊 发布后来填写效果数据，解锁 AI 优化建议
                      <ChevronDown size={14} className={`transition-transform ${showPerformanceForm ? 'rotate-180' : ''}`} />
                    </button>

                    {showPerformanceForm && (
                      <div className="mt-3 p-4 bg-white rounded-xl border border-gray-200">
                        {perfSubmitted ? (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <Check size={16} />
                            已记录，AI 会根据效果优化拆解模型
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">阅读量</label>
                                <input
                                  type="number"
                                  value={perfViews}
                                  onChange={(e) => setPerfViews(e.target.value)}
                                  placeholder="阅读量"
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">点赞</label>
                                <input
                                  type="number"
                                  value={perfLikes}
                                  onChange={(e) => setPerfLikes(e.target.value)}
                                  placeholder="点赞"
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">评论</label>
                                <input
                                  type="number"
                                  value={perfComments}
                                  onChange={(e) => setPerfComments(e.target.value)}
                                  placeholder="评论"
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                                />
                              </div>
                            </div>
                            <div className="mb-3">
                              <label className="text-xs text-gray-500 mb-1 block">是否达到预期</label>
                              <select
                                value={perfMetExpectation}
                                onChange={(e) => setPerfMetExpectation(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                              >
                                <option value="">请选择</option>
                                <option value="yes">是</option>
                                <option value="no">否</option>
                              </select>
                            </div>
                            <button
                              onClick={handlePerfSubmit}
                              className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                            >
                              提交效果数据
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 额度不足提示 */}
                {!hasCredit('competitorAnalyze') && (
                  <div className="mt-3">
                    <UpgradePrompt scenario="competitor" />
                  </div>
                )}
              </div>

              {/* ===== 拆解报告水印（分享时包含） ===== */}
              <div
                id="guohe-watermark"
                className="mt-6 rounded-2xl overflow-hidden text-center py-5 px-6 shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                }}
              >
                <div className="text-sm font-semibold text-white mb-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: '#7C3AED' }}>
                  🔍 由 果核 拆解
                </div>
                <div className="text-xs text-gray-800 mt-2 font-medium">30秒看透爆款设计逻辑</div>
                <div className="text-[10px] text-gray-500 mt-1 font-mono tracking-tight">mellifluous-cannoli-52443c.netlify.app</div>
              </div>

              {/* 软墙：拆解成功后提示额度 + 升级 */}
              <UpgradePrompt scenario="competitor" />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== 分享解锁弹窗 ===== */}
      {showShareUnlock && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowShareUnlock(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  🎁 分享解锁
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  分享拆解报告到小红书，截图上传，解锁 3 次免费拆解
                </p>
              </div>
              <button
                onClick={() => setShowShareUnlock(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* 步骤说明 */}
            <div className="bg-brand-50 rounded-xl border border-brand-100 p-4 mb-4 text-sm space-y-2">
              <div className="flex gap-2">
                <span className="text-brand-600 font-bold shrink-0">①</span>
                <p className="text-gray-700">保存拆解报告截图，保证底部「由 果核 拆解」紫色水印完整可见</p>
              </div>
              <div className="flex gap-2">
                <span className="text-brand-600 font-bold shrink-0">②</span>
                <p className="text-gray-700">发布到小红书，文案建议带话题 #果核AI拆解 #爆款拆解</p>
              </div>
              <div className="flex gap-2">
                <span className="text-brand-600 font-bold shrink-0">③</span>
                <p className="text-gray-700">上传发布后的笔记截图（含水印部分），自动识别后立即解锁</p>
              </div>
            </div>

            {/* 上传区域 */}
            <div>
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-brand-400 transition-colors">
                  {shareVerifyStatus === 'verifying' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={28} className="animate-spin text-brand-500" />
                      <span className="text-sm text-gray-500">🔄 OCR 识别中，请稍候（首次会下载识别引擎约 20MB）</span>
                    </div>
                  ) : shareVerifyStatus === 'success' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Check size={32} className="text-green-500" />
                      <span className="text-sm font-medium text-green-600">{shareVerifyMsg}</span>
                    </div>
                  ) : shareVerifyStatus === 'fail' ? (
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle size={28} className="text-red-400" />
                      <span className="text-sm text-red-500 font-medium">{shareVerifyMsg}</span>
                      <span className="text-xs text-gray-400 mt-1">点击此处重新选择图片</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Camera size={28} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">📷 点击上传小红书截图</span>
                      <span className="text-xs text-gray-400">支持 JPG / PNG，建议包含底部紫色水印区</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={shareVerifyStatus === 'verifying' || shareVerifyStatus === 'success'}
                  onChange={(e) => {
                    handleShareVerify(e.target.files[0])
                    e.target.value = ''
                  }}
                />
              </label>
            </div>

            {/* 成功后关闭按钮 */}
            {shareVerifyStatus === 'success' && (
              <button
                onClick={() => setShowShareUnlock(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                开始拆解
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== 小红书图文卡片弹窗（竖版截图分享） ===== */}
      {showXhsCard && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowXhsCard(false)}
        >
          <div className="my-8" onClick={(e) => e.stopPropagation()}>
            <div
              id="xhs-card-preview"
              className="bg-white shadow-2xl overflow-hidden relative"
              style={{
                width: 380,
                maxWidth: '100%',
                aspectRatio: '3 / 4',
              }}
            >
              {/* 顶部渐变头图 */}
              <div
                className="px-6 pt-6 pb-5"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #F59E0B 100%)',
                }}
              >
                <div className="text-white/90 text-[11px] font-medium tracking-wider mb-2">果核 AI · 爆款拆解笔记</div>
                <div className="text-white font-bold text-[22px] leading-tight pr-2 line-clamp-3">
                  {title || '爆款拆解 · 标题'}
                </div>
              </div>

              {/* 内容主体 */}
              <div className="px-5 py-5 space-y-4 h-[calc(100%-200px)] overflow-y-auto">
                {/* 杀手锏 */}
                {diagnosis?.killerMove && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                    <div className="text-[10px] text-purple-600 font-bold tracking-wider mb-1.5 uppercase">
                      💎 KILLER MOVE · 杀手锏
                    </div>
                    <p className="text-sm text-gray-800 font-medium leading-relaxed">
                      {diagnosis.killerMove}
                    </p>
                  </div>
                )}

                {/* 操作公式 */}
                {diagnosis?.killerMoveFormula && (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <div className="text-[10px] text-amber-600 font-bold tracking-wider mb-1.5 uppercase">
                      📐 操作公式
                    </div>
                    <p className="text-sm text-gray-800 font-semibold leading-relaxed">
                      {diagnosis.killerMoveFormula}
                    </p>
                  </div>
                )}

                {/* 牺牲 */}
                {diagnosis?.sacrifice && (
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <div className="text-[10px] text-red-600 font-bold tracking-wider mb-1.5 uppercase">
                      ⚖️ 取舍 · SACRIFICE
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {diagnosis.sacrifice}
                    </p>
                  </div>
                )}

                {/* 3 个位置分析 */}
                {analysisResult?.positionAnalysis && (
                  <div className="space-y-2.5">
                    <div className="text-[10px] text-gray-500 font-bold tracking-wider uppercase">
                      📍 3 个关键位置
                    </div>
                    {analysisResult.positionAnalysis[0] && (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-[10px] text-gray-400 font-medium mb-0.5">位置 1 · {analysisResult.positionAnalysis[0].position}</div>
                        <div className="text-xs text-gray-700 leading-relaxed">
                          <span className="text-gray-400 text-[10px] mr-1">原文：</span>
                          {analysisResult.positionAnalysis[0].quote}
                        </div>
                        {analysisResult.positionAnalysis[0].whyItWorks && (
                          <div className="text-xs text-purple-600 leading-relaxed mt-1">
                            <span className="text-[10px] mr-1">💡 效果：</span>
                            {analysisResult.positionAnalysis[0].whyItWorks}
                          </div>
                        )}
                      </div>
                    )}
                    {analysisResult.positionAnalysis[1] && (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-[10px] text-gray-400 font-medium mb-0.5">位置 2 · {analysisResult.positionAnalysis[1].position}</div>
                        <div className="text-xs text-gray-700 leading-relaxed">
                          <span className="text-gray-400 text-[10px] mr-1">原文：</span>
                          {analysisResult.positionAnalysis[1].quote}
                        </div>
                        {analysisResult.positionAnalysis[1].whyItWorks && (
                          <div className="text-xs text-purple-600 leading-relaxed mt-1">
                            <span className="text-[10px] mr-1">💡 效果：</span>
                            {analysisResult.positionAnalysis[1].whyItWorks}
                          </div>
                        )}
                      </div>
                    )}
                    {analysisResult.positionAnalysis[2] && (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-[10px] text-gray-400 font-medium mb-0.5">位置 3 · {analysisResult.positionAnalysis[2].position}</div>
                        <div className="text-xs text-gray-700 leading-relaxed">
                          <span className="text-gray-400 text-[10px] mr-1">原文：</span>
                          {analysisResult.positionAnalysis[2].quote}
                        </div>
                        {analysisResult.positionAnalysis[2].whyItWorks && (
                          <div className="text-xs text-purple-600 leading-relaxed mt-1">
                            <span className="text-[10px] mr-1">💡 效果：</span>
                            {analysisResult.positionAnalysis[2].whyItWorks}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 底部水印 */}
              <div
                className="absolute bottom-0 left-0 right-0 px-5 py-3.5 text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.95), rgba(167, 139, 250, 0.95))',
                }}
              >
                <div className="text-white text-xs font-bold inline-flex items-center gap-1.5 mb-0.5">
                  🔍 由 果核 拆解 · 30秒看透爆款设计逻辑
                </div>
                <div className="text-white/80 text-[9px] font-mono tracking-tight">
                  mellifluous-cannoli-52443c.netlify.app
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setShowXhsCard(false)}
                className="px-5 py-2 rounded-full bg-white/90 border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  alert('请截图保存这个卡片，然后到小红书发布～')
                }}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm shadow-rose-200"
              >
                📱 截图保存到小红书
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
