import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { usePageDwellTracking } from '../utils/usePageDwellTracking'
import {
  Lightbulb,
  Settings,
  BarChart3,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Minus,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Dna,
  FileText,
  Sparkles,
  ShieldCheck,
  Rocket,
  MessageSquare,
  X,
  Send,
  Search,
  Target,
  Radar,
  Brain,
  Clapperboard,
  Package,
  Calendar,
} from 'lucide-react'

/* ============ 子组件 ============ */

function ModeToggle({ mode, onChange }) {
  return (
    <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
      <button
        onClick={() => onChange('novice')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
          mode === 'novice'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        今日任务
      </button>
      <button
        onClick={() => onChange('pro')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
          mode === 'pro'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        数据概览
      </button>
    </div>
  )
}

function QuickCard({ icon: Icon, title, desc, color, onClick }) {
  const colorMap = {
    purple: 'bg-brand-50 text-brand-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:border-gray-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        <span className="font-semibold text-gray-900">{title}</span>
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  )
}

function TaskItem({ text, tag, tagColor, done, onToggle }) {
  const tagStyles = {
    purple: 'bg-brand-50 text-brand-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-gray-100 text-gray-500',
  }
  return (
    <div
      className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 cursor-pointer group"
      onClick={onToggle}
    >
      <div
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          done
            ? 'bg-gray-900 border-gray-900'
            : 'border-gray-300 group-hover:border-gray-900'
        }`}
      >
        {done && <Check size={12} className="text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {text}
        </span>
      </div>
      <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-md font-medium ${tagStyles[tagColor]}`}>
        {tag}
      </span>
    </div>
  )
}

function MetricCard({ label, value, change, trend }) {
  const trendIcon =
    trend === 'up' ? <ArrowUpRight size={14} /> :
    trend === 'down' ? <ArrowDownRight size={14} /> :
    <Minus size={14} />
  const trendColor =
    trend === 'up' ? 'text-emerald-600' :
    trend === 'down' ? 'text-red-500' :
    'text-gray-400'

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
      <div className="text-xs text-gray-500 mb-1.5">{label}</div>
      <div className="text-[28px] font-semibold text-gray-900 tabular leading-tight">{value}</div>
      <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
        {trendIcon}
        <span>{change}</span>
      </div>
    </div>
  )
}

function ContentRow({ emoji, title, meta, stat, statColor }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-900 truncate">{title}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">{meta}</div>
      </div>
      <span className={`text-sm font-semibold tabular shrink-0 ${statColor || 'text-gray-900'}`}>
        {stat}
      </span>
    </div>
  )
}

function DiagnosisRow({ status, title, desc }) {
  const config = {
    danger: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
    success: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
  }
  const cfg = config[status]
  const Icon = cfg.icon
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-gray-50 last:border-0">
      <div className={`mt-0.5 w-6 h-6 rounded-full ${cfg.bg} ${cfg.color} flex items-center justify-center shrink-0 border ${cfg.border}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  )
}

/* ============ 主页面 ============ */

export default function Dashboard() {
  const [mode, setMode] = useState('novice')
  const [toggledTasks, setToggledTasks] = useState({})
  const navigate = useNavigate()
  usePageDwellTracking('Dashboard')

  // v9：真实 store 数据（带 fallback mock）
  const currentProjectId = useStore((s) => s.currentProjectId)
  const projects = useStore((s) => s.projects)
  const allStyleDNA = useStore((s) => s.styleDNA)
  const allStyleRules = useStore((s) => s.styleRules)
  const allAssets = useStore((s) => s.assets)
  const allAccountDiagnoses = useStore((s) => s.accountDiagnoses)
  const allTopics = useStore((s) => s.topics)
  const allPerformanceRecords = useStore((s) => s.performanceRecords)
  const allContents = useStore((s) => s.contents)
  const allPatterns = useStore((s) => s.contentPatterns)

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  )
  const currentDNA = useMemo(
    () => allStyleDNA.find((d) => d.projectId === currentProjectId && d.status === 'active'),
    [allStyleDNA, currentProjectId]
  )
  const projectRules = useMemo(
    () => allStyleRules.filter((r) => r.projectId === currentProjectId),
    [allStyleRules, currentProjectId]
  )
  const unconfirmedCount = projectRules.filter((r) => !r.confirmed).length
  const projectAssets = useMemo(
    () => allAssets.filter((a) => a.projectId === currentProjectId),
    [allAssets, currentProjectId]
  )
  const projectDiagnoses = useMemo(
    () => allAccountDiagnoses.filter((d) => d.projectId === currentProjectId),
    [allAccountDiagnoses, currentProjectId]
  )
  const projectTopics = useMemo(
    () => allTopics.filter((t) => t.projectId === currentProjectId),
    [allTopics, currentProjectId]
  )
  const projectRecords = useMemo(
    () => allPerformanceRecords.filter((r) => r.projectId === currentProjectId),
    [allPerformanceRecords, currentProjectId]
  )
  const projectContents = useMemo(
    () => allContents.filter((c) => c.projectId === currentProjectId),
    [allContents, currentProjectId]
  )
  const projectPatterns = useMemo(
    () => allPatterns.filter((p) => p.projectId === currentProjectId),
    [allPatterns, currentProjectId]
  )

  // v9：动态生成今日待办（基于真实状态）
  const tasks = useMemo(() => {
    const list = []
    if (!currentDNA) {
      list.push({ id: 'dna', text: '完成账号建模，让 AI 学习你的风格', tag: '风格学习', tagColor: 'purple' })
    }
    if (unconfirmedCount > 0) {
      list.push({ id: 'rules', text: `确认 ${unconfirmedCount} 条 AI 学习规则`, tag: '规则确认', tagColor: 'blue' })
    }
    if (projectTopics.length === 0) {
      list.push({ id: 'topics', text: '生成第一批 AI 选题', tag: '选题建议', tagColor: 'purple' })
    }
    if (projectDiagnoses.length === 0) {
      list.push({ id: 'diagnosis', text: '完成账号诊断', tag: '账号诊断', tagColor: 'red' })
    }
    if (list.length === 0) {
      list.push({ id: 'pipeline', text: '基于已有选题，生成内容草稿', tag: '内容生成', tagColor: 'blue' })
    }
    return list
  }, [currentDNA, unconfirmedCount, projectTopics.length, projectDiagnoses.length])

  const toggleTask = (id) => {
    setToggledTasks((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const doneCount = tasks.filter(t => toggledTasks[t.id]).length
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 100

  // 反馈弹窗状态
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackData, setFeedbackData] = useState({ feel: '', problem: '', suggestion: '' })
  const [feedbackSent, setFeedbackSent] = useState(false)

  // 新用户引导：是否显示「开始创作」hero
  // 新用户 = 还没有产出任何内容
  const isNewUser = projectContents.length === 0
  // 真正首次进入：连 DNA 和选题都没有（最需要引导的状态）
  const isFreshUser = !currentDNA && projectTopics.length === 0 && projectContents.length === 0
  // 首次访问标记（localStorage 记录是否已经看过 Dashboard）
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    try {
      return !localStorage.getItem('contentos_dashboard_visited')
    } catch {
      return false
    }
  })
  const markVisited = () => {
    try {
      localStorage.setItem('contentos_dashboard_visited', '1')
      setIsFirstVisit(false)
    } catch {
      // 忽略存储错误
    }
  }

  // AI 内容导演：4 步创作主线
  const productionSteps = [
    { icon: Dna, title: '账号理解', desc: 'AI 已读懂你的风格', done: !!currentDNA, path: '/factory/style-dna' },
    { icon: Target, title: '选题规划', desc: '找到本周该拍什么', done: projectTopics.length > 0, path: '/factory/topics' },
    { icon: Clapperboard, title: '视频制作包', desc: '生成可拍摄的视频方案', done: projectContents.length > 0, path: '/workbench/video-director' },
    { icon: Package, title: '发布复盘', desc: '归档内容，记录数据', done: projectAssets.length > 0 || projectRecords.length > 0, path: '/factory/assets' },
  ]

  // 「开始创作」直达导演选择
  const startCreation = () => {
    markVisited()
    navigate('/workbench/director')
  }

  // 提交反馈
  const submitFeedback = () => {
    try {
      const raw = localStorage.getItem('contentos_feedbacks')
      const list = raw ? JSON.parse(raw) : []
      list.push({ ...feedbackData, createdAt: Date.now() })
      localStorage.setItem('contentos_feedbacks', JSON.stringify(list))
      setFeedbackSent(true)
      setTimeout(() => {
        setShowFeedback(false)
        setFeedbackSent(false)
        setFeedbackData({ feel: '', problem: '', suggestion: '' })
      }, 1500)
    } catch {
      // 忽略存储错误
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">
          {isNewUser ? '开始使用' : '工作台'}
        </h1>
        {/* 新用户暂不需要数据概览，隐藏切换 */}
        {!isNewUser && <ModeToggle mode={mode} onChange={setMode} />}
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        {mode === 'novice' ? (
          <div className="max-w-5xl mx-auto space-y-5">
            {/* 渐进式拆解引导：0 条→大卡片，1-2 条→小提示，3+条→消失 */}
            {allPatterns.length === 0 && (
              <div className="bg-gradient-to-br from-amber-500 to-red-500 rounded-2xl p-6 text-white flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white/80 mb-1">第一步</div>
                  <h2 className="text-xl font-bold">拆解一条爆款，让 AI 学习你的领域</h2>
                  <p className="text-sm text-white/80 mt-1">粘贴爆款文案或上传截图，30 秒出拆解报告</p>
                </div>
                <button
                  onClick={() => navigate('/workbench/competitor-analyzer')}
                  className="px-5 py-2.5 bg-white text-red-600 rounded-lg text-sm font-bold hover:bg-white/90 transition-colors whitespace-nowrap shrink-0"
                >
                  去拆解 →
                </button>
              </div>
            )}
            {allPatterns.length > 0 && allPatterns.length < 3 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-amber-800">
                  已拆解 {allPatterns.length} 条，继续积累风格 DNA（建议拆解 3 条以上）
                </span>
                <button
                  onClick={() => navigate('/workbench/competitor-analyzer')}
                  className="text-sm text-brand-600 font-medium hover:underline whitespace-nowrap"
                >
                  继续拆解 →
                </button>
              </div>
            )}

            {/* 新用户引导 Hero：确认 AI 是否理解你的账号 */}
            {isNewUser && (
              <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-8 text-white relative overflow-hidden">
                {/* 装饰光斑 */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 pointer-events-none" />

                <div className="relative">
                  {/* 标签 */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-medium mb-4">
                    {isFirstVisit ? (
                      <>
                        <Sparkles size={11} />
                        欢迎使用 · 先确认 AI 是否懂你
                      </>
                    ) : (
                      <>
                        <Calendar size={11} />
                        继续 · 确认 AI 是否懂你
                      </>
                    )}
                  </div>

                  {/* 核心标题 */}
                  <h2 className="text-2xl font-bold mb-2">确认 AI 是否理解你的账号</h2>
                  <p className="text-sm text-white/80 mb-6 max-w-md leading-relaxed">
                    先确认 AI 的理解是否准确，再开始内容生产
                  </p>

                  {/* 3 张状态卡片 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* 你的账号画像 */}
                    <div
                      onClick={() => navigate('/workbench/account-brain')}
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:bg-white/15 transition-all border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Brain size={16} className="text-white/80" />
                        {currentDNA ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-medium">已分析</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">待分析</span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-white mb-1">你的账号画像</div>
                      <div className="text-[11px] text-white/60 mb-2.5">
                        {currentDNA ? 'AI 已生成你的风格模型' : 'AI 还没分析过你的账号'}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-white font-medium">
                        {currentDNA ? '查看分析' : '去分析'}
                        <ArrowRight size={11} />
                      </span>
                    </div>

                    {/* AI 正在学习你的内容风格 */}
                    <div
                      onClick={() => navigate('/factory/style-dna')}
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:bg-white/15 transition-all border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Dna size={16} className="text-white/80" />
                        {currentDNA ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-medium">v{currentDNA.version}</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">未建立</span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-white mb-1">AI 在学习你的风格</div>
                      <div className="text-[11px] text-white/60 mb-2.5">
                        {currentDNA ? '查看 AI 学到了什么' : '上传内容让 AI 学习'}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-white font-medium">
                        {currentDNA ? '查看' : '开始建立'}
                        <ArrowRight size={11} />
                      </span>
                    </div>

                    {/* 找到你的爆款规律 */}
                    <div
                      onClick={() => navigate('/workbench/opportunity-radar')}
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:bg-white/15 transition-all border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Radar size={16} className="text-white/80" />
                        {projectTopics.length > 0 || projectPatterns.length > 0 ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-medium">已发现</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">未开始</span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-white mb-1">找到你的爆款规律</div>
                      <div className="text-[11px] text-white/60 mb-2.5">
                        {projectTopics.length > 0 || projectPatterns.length > 0 ? '查看已发现的规律' : '拆解同行爆款'}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-white font-medium">
                        {projectTopics.length > 0 || projectPatterns.length > 0 ? '查看' : '开始发现'}
                        <ArrowRight size={11} />
                      </span>
                    </div>
                  </div>

                  {/* 确认后进入内容生产 */}
                  {currentDNA && (
                    <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs text-white/70">AI 已理解你的账号，可以开始内容生产了</span>
                      <button
                        onClick={startCreation}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-brand-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-all"
                      >
                        <Rocket size={13} />
                        开始创作
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* v9：账号概览（新用户简化展示，老用户完整展示） */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              {isNewUser ? (
                /* 新用户：只展示 3 个关键状态，降低认知负担 */
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">账号</div>
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {currentProject?.name || '未创建'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">AI 风格学习</div>
                    <div className={`text-sm font-medium ${currentDNA ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {currentDNA ? `已学习 v${currentDNA.version}` : '待学习'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">待办任务</div>
                    <div className="text-sm font-semibold text-gray-900 tabular">
                      {tasks.length} <span className="text-[11px] font-normal text-gray-400">项</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* 老用户：完整 6 列概览 */
                <div className="grid grid-cols-6 gap-4">
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">账号</div>
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {currentProject?.name || '未创建'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">平台</div>
                    <div className="text-sm text-gray-700">{currentProject?.platform || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">领域</div>
                    <div className="text-sm text-gray-700">{currentProject?.category || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">AI 风格学习</div>
                    <div className={`text-sm font-medium ${currentDNA ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {currentDNA ? '已学习风格' : '未学习'}
                    </div>
                    {currentDNA && (
                      <div className="text-[10px] text-gray-400 mt-0.5">版本 v{currentDNA.version}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">规则数量</div>
                    <div className="text-sm font-semibold text-gray-900 tabular">{projectRules.length}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">待确认规则</div>
                    <div className="text-sm font-semibold text-amber-500 tabular">{unconfirmedCount}</div>
                  </div>
                </div>
              )}
            </div>

            {/* V3：AI 视频生产路径 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">从灵感到内容</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: Radar, title: '找到爆款规律', desc: projectTopics.length > 0 || projectPatterns.length > 0 ? '已发现方向' : '发现机会', path: '/workbench/opportunity-radar', done: projectTopics.length > 0 || projectPatterns.length > 0 },
                  { icon: Brain, title: '账号画像', desc: currentDNA ? `风格 v${currentDNA.version}` : '匹配定位', path: '/workbench/account-brain', done: !!currentDNA },
                  { icon: Clapperboard, title: '把灵感变成内容', desc: projectContents.length > 0 ? `${projectContents.length} 条内容方案` : '生成内容', path: '/workbench/video-director', done: projectContents.length > 0 },
                  { icon: Package, title: '内容资产', desc: projectAssets.length > 0 || projectRecords.length > 0 ? `${projectRecords.length} 条复盘` : '复盘优化', path: '/workbench/assets-center', done: projectAssets.length > 0 || projectRecords.length > 0 },
                ].map((step, i) => (
                  <div
                    key={i}
                    onClick={() => navigate(step.path)}
                    className={`relative bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                      step.done ? 'border-brand-200' : 'border-gray-100'
                    }`}
                  >
                    {/* 步骤编号 */}
                    <div className={`absolute -top-2 -left-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      step.done ? 'bg-emerald-500 text-white' : 'bg-brand-600 text-white'
                    }`}>
                      {step.done ? <Check size={11} /> : i + 1}
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                      step.done ? 'bg-brand-50 text-brand-600' : 'bg-gray-50 text-gray-400'
                    }`}>
                      <step.icon size={16} />
                    </div>
                    <div className="text-xs font-medium text-gray-900 mb-0.5">{step.title}</div>
                    <div className={`text-[10px] ${step.done ? 'text-brand-600' : 'text-gray-400'}`}>
                      {step.desc}
                    </div>
                    {/* 连接线 */}
                    {i < 3 && (
                      <div className="absolute top-1/2 -right-2 w-3 h-px bg-gray-200" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 快捷入口（新用户紧凑展示，老用户卡片展示） */}
            {isNewUser ? (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-gray-400 shrink-0 mr-1">更多入口</span>
                  <button
                    onClick={() => navigate('/factory/style-dna')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-brand-50 hover:text-brand-600 text-xs text-gray-700 transition-colors"
                  >
                    <Settings size={13} />
                    AI 学习我的风格
                  </button>
                  <button
                    onClick={() => navigate('/factory/assets')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-xs text-gray-700 transition-colors"
                  >
                    <ShieldCheck size={13} />
                    内容资产
                  </button>
                  <button
                    onClick={() => navigate('/data-center/diagnosis')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 text-xs text-gray-700 transition-colors"
                  >
                    <BarChart3 size={13} />
                    账号诊断
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <QuickCard
                  icon={Settings}
                  title="AI 学习我的风格"
                  desc="查看和管理账号风格模型"
                  color="purple"
                  onClick={() => navigate('/factory/style-dna')}
                />
                <QuickCard
                  icon={ShieldCheck}
                  title="内容资产"
                  desc="已生成内容的归档与管理"
                  color="blue"
                  onClick={() => navigate('/factory/assets')}
                />
                <QuickCard
                  icon={BarChart3}
                  title="账号诊断"
                  desc="诊断账号健康度，获取优化建议"
                  color="green"
                  onClick={() => navigate('/data-center/diagnosis')}
                />
              </div>
            )}

            {/* 两栏 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 今日待办 */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">今日待办</h3>
                  <span className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">查看全部</span>
                </div>
                {tasks.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">所有任务已完成 👏</p>
                ) : (
                  tasks.map(t => (
                    <TaskItem
                      key={t.id}
                      text={t.text}
                      tag={t.tag}
                      tagColor={t.tagColor}
                      done={toggledTasks[t.id] || false}
                      onToggle={() => toggleTask(t.id)}
                    />
                  ))
                )}
                <div className="mt-4">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-gray-400 mt-2">
                    今日进度 {doneCount}/{tasks.length}，继续加油 👏
                  </div>
                </div>
              </div>

              {/* AI 推荐选题 */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">AI 推荐选题</h3>
                  <span
                    className="text-xs text-brand-600 cursor-pointer hover:text-brand-700 font-medium"
                    onClick={() => navigate('/factory/topics')}
                  >
                    去选题 →
                  </span>
                </div>
                {projectTopics.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">暂无 AI 推荐选题，去生成第一批内容</p>
                ) : (
                  projectTopics.slice(0, 3).map(t => (
                    <ContentRow
                      key={t.id}
                      emoji={t.emoji || '📌'}
                      title={t.title}
                      meta={`匹配度 ${t.matchScore || 0}%`}
                      stat={`${t.matchScore || 0}%`}
                      statColor="text-brand-600"
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-5">
            {/* 核心指标 */}
            <div className="grid grid-cols-4 gap-4">
              {projectRecords.length === 0 ? (
                <>
                  <MetricCard label="总浏览量" value="暂无数据" change="" trend="up" />
                  <MetricCard label="互动率" value="暂无数据" change="" trend="up" />
                  <MetricCard label="表现记录" value="暂无数据" change="" trend="up" />
                  <MetricCard label="内容产出" value={projectAssets.length} change="" trend="up" />
                </>
              ) : (
                <>
                  <MetricCard
                    label="总浏览量"
                    value={projectRecords.reduce((s, r) => s + (r.metrics?.views || 0), 0).toLocaleString()}
                    change={`${projectRecords.length} 条记录`}
                    trend="up"
                  />
                  <MetricCard
                    label="平均互动率"
                    value={`${(projectRecords.reduce((s, r) => s + (r.metrics?.likes || 0) + (r.metrics?.comments || 0) + (r.metrics?.saves || 0) + (r.metrics?.shares || 0), 0) / Math.max(projectRecords.reduce((s, r) => s + (r.metrics?.views || 0), 0), 1) * 100).toFixed(1)}%`}
                    change="基于真实数据"
                    trend="up"
                  />
                  <MetricCard
                    label="表现记录"
                    value={projectRecords.length}
                    change="条"
                    trend="up"
                  />
                  <MetricCard
                    label="内容产出"
                    value={projectAssets.length}
                    change="篇"
                    trend="up"
                  />
                </>
              )}
            </div>

            {/* 两栏 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 近期表现最佳 */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">近期表现最佳</h3>
                  <span className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">查看全部</span>
                </div>
                <div className="flex gap-1 mb-3">
                  {['阅读量', '互动', '涨粉'].map((tab, i) => (
                    <button
                      key={tab}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        i === 0
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                {projectAssets.length === 0 || projectRecords.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">发布内容后自动生成</p>
                ) : (
                  projectAssets
                    .map(a => {
                      const record = projectRecords.find(r => r.assetId === a.id || r.contentId === a.contentId)
                      const views = record?.metrics?.views || 0
                      const likes = (record?.metrics?.likes || 0) + (record?.metrics?.comments || 0) + (record?.metrics?.saves || 0)
                      return { ...a, views, likes }
                    })
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 3)
                    .map(a => (
                      <ContentRow
                        key={a.id}
                        emoji="📄"
                        title={a.title || '未命名'}
                        meta={`${a.views.toLocaleString()} 浏览 · ${a.likes} 互动`}
                        stat={a.views.toLocaleString()}
                      />
                    ))
                )}
              </div>

              {/* 账号诊断摘要 */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">账号诊断摘要</h3>
                  <span
                    className="text-xs text-red-500 cursor-pointer hover:text-red-600 font-medium"
                    onClick={() => navigate('/data-center/diagnosis')}
                  >
                    查看详情 →
                  </span>
                </div>
                {projectDiagnoses.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400">完成账号诊断后生成</p>
                  </div>
                ) : (
                  <>
                    {projectDiagnoses[0].weaknesses?.map((w, i) => (
                      <DiagnosisRow key={`w-${i}`} status="danger" title="内容问题" desc={w} />
                    ))}
                    {projectDiagnoses[0].strengths?.map((s, i) => (
                      <DiagnosisRow key={`s-${i}`} status="success" title="账号优势" desc={s} />
                    ))}
                    {projectDiagnoses[0].strategies?.map((st, i) => (
                      <DiagnosisRow key={`st-${i}`} status="warning" title="优化建议" desc={st} />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Beta 用户反馈 */}
        <div className="max-w-5xl mx-auto mt-6">
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 font-medium">Beta</span>
              <span className="text-sm text-gray-500">正在使用 果核 Beta 版</span>
            </div>
            <button
              onClick={() => setShowFeedback(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <MessageSquare size={15} />
              反馈问题
            </button>
          </div>
        </div>
      </div>

      {/* 反馈弹窗 */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowFeedback(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            {feedbackSent ? (
              <div className="text-center py-6">
                <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">反馈已提交</p>
                <p className="text-xs text-gray-500 mt-1">感谢你的反馈，我们会持续优化</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">反馈问题</h3>
                  <button onClick={() => setShowFeedback(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">使用感受</label>
                    <textarea
                      value={feedbackData.feel}
                      onChange={e => setFeedbackData({ ...feedbackData, feel: e.target.value })}
                      placeholder="整体使用感受如何？"
                      rows={2}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-brand-400 focus:outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">遇到的问题</label>
                    <textarea
                      value={feedbackData.problem}
                      onChange={e => setFeedbackData({ ...feedbackData, problem: e.target.value })}
                      placeholder="遇到了什么问题或 bug？"
                      rows={2}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-brand-400 focus:outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">建议功能</label>
                    <textarea
                      value={feedbackData.suggestion}
                      onChange={e => setFeedbackData({ ...feedbackData, suggestion: e.target.value })}
                      placeholder="希望增加什么功能？"
                      rows={2}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-brand-400 focus:outline-none resize-none"
                    />
                  </div>
                  <button
                    onClick={submitFeedback}
                    disabled={!feedbackData.feel && !feedbackData.problem && !feedbackData.suggestion}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={15} />
                    提交反馈
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
