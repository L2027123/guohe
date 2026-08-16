import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dna,
  Sparkles,
  Check,
  X,
  Edit3,
  Trash2,
  Plus,
  Wand2,
  Loader2,
  Upload,
  FileText,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Activity,
  BarChart3,
  Brain,
  Stethoscope,
  TrendingUp,
  Camera,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { callAI, classifyAIError } from '../utils/aiClient'
import { trackEvent } from '../utils/tracker'
import { usePageDwellTracking } from '../utils/usePageDwellTracking'
import { recognizeImage, isOCRFirstInit } from '../utils/ocr'

const CATEGORIES = ['内容人格', '标题套路', '结构习惯', '视觉风格', '用户偏好']
const CATEGORY_COLORS = {
  '内容人格': 'bg-purple-50 text-purple-600 border-purple-200',
  '标题套路': 'bg-pink-50 text-pink-600 border-pink-200',
  '结构习惯': 'bg-blue-50 text-blue-600 border-blue-200',
  '视觉风格': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  '用户偏好': 'bg-amber-50 text-amber-600 border-amber-200',
  // 兼容旧分类
  '标题公式': 'bg-pink-50 text-pink-600 border-pink-200',
  '写作结构': 'bg-blue-50 text-blue-600 border-blue-200',
  '高频表达': 'bg-amber-50 text-amber-600 border-amber-200',
  '钩子策略': 'bg-indigo-50 text-indigo-600 border-indigo-200',
  'CTA策略': 'bg-teal-50 text-teal-600 border-teal-200',
}

const SOURCE_LABELS = {
  'AI分析样本': '样本分析',
  '表现复盘': '表现复盘',
  '手动添加': '手动添加',
}

// v9：真实 AI 分析样本生成风格规则
async function analyzeSamplesViaAI(project, dna, samples, apiKey) {
  const samplesText = samples.map((s, i) => `【样本${i + 1}】\n${s.text || s}`).join('\n\n')

  const prompt = `你是一名内容风格分析专家。分析以下用户的历史内容样本，提取TA的风格规则。

【账号信息】
- 账号名称：${project.name}
- 平台：${project.platform}
- 领域：${project.category}
- 目标受众：${project.targetAudience || '未指定'}

【当前风格模型】
- 内容人格：${dna?.contentPersona || '未指定'}
- 内容结构：${dna?.writingStructure || '未指定'}
- 标题套路：${dna?.titleFormula || '未指定'}
- 视觉风格：${dna?.visualStyle || '未指定'}
- 目标用户：${dna?.audience || '未指定'}
- 常用表达：${dna?.frequentExpressions?.join('、') || '未指定'}

【历史内容样本】
${samplesText}

输出严格JSON数组（不要markdown包裹）：
[
  {"category":"内容人格","rule":"具体规则","confidence":0.9},
  {"category":"标题套路","rule":"具体规则","confidence":0.85},
  {"category":"结构习惯","rule":"具体规则","confidence":0.85},
  {"category":"视觉风格","rule":"具体规则","confidence":0.8},
  {"category":"用户偏好","rule":"具体规则","confidence":0.75}
]`

  return callAI(apiKey, prompt, { temperature: 0.4, max_tokens: 1000 })
}

function parseRulesResult(text) {
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()
  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) throw new Error('AI 返回格式错误')
  return parsed
}

/* ============ 模块1: 训练状态卡片 ============ */
function TrainingStatCard({ icon: Icon, label, value, sub, color }) {
  const colorMap = {
    purple: 'bg-brand-50 text-brand-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={16} />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-gray-900 tabular leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

/* ============ 模块2: 已确认规则项（简洁展示） ============ */
function ConfirmedRuleItem({ rule, onUnconfirm }) {
  const catColor = CATEGORY_COLORS[rule.category] || 'bg-gray-50 text-gray-600 border-gray-200'
  return (
    <div className="flex items-start gap-2 py-2 group">
      <button
        onClick={() => onUnconfirm(rule.id)}
        className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 hover:bg-emerald-600 transition-colors"
        title="点击取消确认"
      >
        <Check size={10} className="text-white" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-relaxed">{rule.rule}</p>
        <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${catColor}`}>
          {rule.category}
        </span>
      </div>
    </div>
  )
}

/* ============ 模块3: 待确认规则卡片（完整 CRUD） ============ */
function RuleCard({ rule, onConfirm, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [editCategory, setEditCategory] = useState(rule.category)
  const [editRule, setEditRule] = useState(rule.rule)

  const catColor = CATEGORY_COLORS[rule.category] || 'bg-gray-50 text-gray-600 border-gray-200'
  const sourceLabel = SOURCE_LABELS[rule.source] || rule.source || 'AI分析'

  const handleSave = () => {
    onEdit(rule.id, { category: editCategory, rule: editRule })
    setEditing(false)
  }

  const handleCancel = () => {
    setEditCategory(rule.category)
    setEditRule(rule.rule)
    setEditing(false)
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3 transition-all">
      {editing ? (
        <div className="space-y-2">
          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-gray-200 text-xs focus:outline-none focus:border-brand-400"
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
            {/* 兼容旧分类 */}
            {!CATEGORIES.includes(rule.category) && <option>{rule.category}</option>}
          </select>
          <textarea
            value={editRule}
            onChange={(e) => setEditRule(e.target.value)}
            rows={2}
            className="w-full px-2 py-1.5 rounded-md border border-gray-200 text-sm focus:outline-none focus:border-brand-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-2.5 py-1 bg-brand-600 text-white rounded-md text-xs font-medium hover:bg-brand-700"
            >
              保存
            </button>
            <button
              onClick={handleCancel}
              className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <button
            onClick={() => onConfirm(rule.id)}
            className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0 hover:border-emerald-400 transition-colors"
            title="点击确认"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${catColor}`}>
                {rule.category}
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                {rule.source === '表现复盘' && <TrendingUp size={9} />}
                {sourceLabel}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{rule.rule}</p>
            <div className="flex items-center gap-1 mt-1.5">
              <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    rule.confidence >= 0.85 ? 'bg-emerald-400' : rule.confidence >= 0.7 ? 'bg-amber-400' : 'bg-gray-300'
                  }`}
                  style={{ width: `${rule.confidence * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 tabular">{Math.round(rule.confidence * 100)}%</span>
            </div>
            {/* v9：AI 学习数据展示（learnFromPerformance 产出） */}
            {rule.effectivenessScore > 0 && (
              <div className="flex items-center gap-2.5 mt-1.5 text-[10px] text-gray-400">
                <span className="flex items-center gap-0.5">
                  <TrendingUp size={9} />
                  效果 {rule.effectivenessScore}
                </span>
                <span>·</span>
                <span>使用 {rule.usageCount || 0} 次</span>
                <span>·</span>
                <span>互动率 {((rule.avgEngagementRate || 0) * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="编辑"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={() => onDelete(rule.id)}
              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
              title="删除"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============ 模块4: 样本上传器（截图优先 + 文本备用） ============ */
function SampleUploader({ onAnalyze, isAnalyzing }) {
  const [samples, setSamples] = useState([])
  const [input, setInput] = useState('')
  const [ocrStatus, setOcrStatus] = useState('idle') // idle | analyzing | error
  const [ocrError, setOcrError] = useState('')
  const [ocrPhase, setOcrPhase] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [showTextInput, setShowTextInput] = useState(false)
  const fileInputRef = useRef(null)

  const handleScreenshot = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setOcrError('请选择图片文件')
      setOcrStatus('error')
      return
    }

    setOcrStatus('analyzing')
    setOcrError('')
    setOcrPhase(isOCRFirstInit() ? 'init' : 'ocr')
    setOcrProgress(0)
    try {
      const text = await recognizeImage(file, (phase, pct) => {
        setOcrPhase(phase)
        setOcrProgress(pct)
      })

      if (!text || text.trim().length < 10) {
        setOcrError('未能从截图中识别到足够文字，请确保截图清晰或手动粘贴')
        setOcrStatus('error')
        return
      }

      setSamples([...samples, { id: Date.now(), text: text.trim(), isScreenshot: true }])
      setOcrStatus('idle')
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('timeout') || msg.includes('超时')) {
        setOcrError('网络加载识别引擎超时，请检查网络后重试，或手动粘贴')
      } else if (msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
        setOcrError('网络连接失败，请检查网络后重试')
      } else {
        setOcrError('截图识别失败：' + (msg || '请重试或手动粘贴'))
      }
      setOcrStatus('error')
    } finally {
      setOcrPhase(null)
      setOcrProgress(0)
    }

    // 清空 input，允许重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAdd = () => {
    if (!input.trim()) return
    setSamples([...samples, { id: Date.now(), text: input.trim() }])
    setInput('')
  }

  const handleRemove = (id) => {
    setSamples(samples.filter((s) => s.id !== id))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <Camera size={16} className="text-brand-500" />
        上传内容截图
      </h3>
      <p className="text-xs text-gray-500 mb-4">截图你发布过的笔记，AI 自动识别文字并分析风格</p>

      {/* 截图上传区 */}
      <div className="mb-4">
        {ocrStatus === 'analyzing' ? (
          <div className={`p-3 rounded-lg ${ocrPhase === 'init' ? 'bg-amber-50' : 'bg-brand-50'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Loader2 size={16} className={`animate-spin ${ocrPhase === 'init' ? 'text-amber-500' : 'text-brand-500'}`} />
              <span className={`text-xs ${ocrPhase === 'init' ? 'text-amber-700' : 'text-brand-700'}`}>
                {ocrPhase === 'init'
                  ? `首次加载识别字库（约15MB）... ${ocrProgress}%`
                  : `正在识别文字... ${ocrProgress}%`}
              </span>
            </div>
            <div className="w-full h-1 rounded-full overflow-hidden bg-white/70">
              <div
                className={`h-full transition-all duration-200 ${ocrPhase === 'init' ? 'bg-amber-500' : 'bg-brand-500'}`}
                style={{ width: `${Math.max(ocrProgress, 3)}%` }}
              />
            </div>
          </div>
        ) : (
          <label className="block">
            <div className="border-2 border-dashed border-brand-200 rounded-xl p-4 bg-brand-50/30 hover:bg-brand-50/50 cursor-pointer transition-colors text-center">
              <Camera size={24} className="mx-auto text-brand-400 mb-1.5" />
              <div className="text-sm text-brand-700 font-medium">点击上传截图</div>
              <div className="text-[11px] text-gray-400 mt-0.5">支持 JPG/PNG，上传后自动识别</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScreenshot}
            />
          </label>
        )}
        {ocrError && (
          <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} />
            {ocrError}
          </div>
        )}
      </div>

      {/* 已上传样本列表 */}
      {samples.length > 0 && (
        <div className="mb-3 space-y-2">
          {samples.map((s) => (
            <div key={s.id} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg">
              {s.isScreenshot ? (
                <Camera size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              ) : (
                <FileText size={14} className="text-gray-400 mt-0.5 shrink-0" />
              )}
              <p className="text-xs text-gray-600 flex-1 line-clamp-2">{s.text}</p>
              {s.isScreenshot && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium shrink-0">
                  截图
                </span>
              )}
              <button
                onClick={() => handleRemove(s.id)}
                className="p-0.5 text-gray-400 hover:text-red-500 shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 手动输入（折叠） */}
      <div className="mb-3">
        <button
          onClick={() => setShowTextInput(!showTextInput)}
          className="text-xs text-gray-400 hover:text-brand-600 transition-colors"
        >
          {showTextInput ? '收起手动输入' : '或者手动粘贴文字 →'}
        </button>
        {showTextInput && (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴笔记正文..."
            rows={3}
            className="w-full mt-2 px-3 py-2 rounded-lg border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:border-brand-400 resize-none"
          />
        )}
        {showTextInput && input.trim() && (
          <button
            onClick={handleAdd}
            className="mt-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200"
          >
            添加到样本
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">已上传 {samples.length} 篇样本</span>
        <button
          onClick={() => onAnalyze(samples)}
          disabled={samples.length === 0 || isAnalyzing}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 disabled:opacity-40"
        >
          {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
          {isAnalyzing ? '分析中...' : 'AI 分析风格'}
        </button>
      </div>
    </div>
  )
}

/* ============ 模块4: 训练入口卡片 ============ */
function TrainingEntry({ icon: Icon, title, desc, color, onClick, badge }) {
  const colorMap = {
    purple: 'bg-brand-50 text-brand-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-gray-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={16} />
        </div>
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </div>
  )
}

/* ============ 主页面 ============ */
export default function StyleDNA() {
  const navigate = useNavigate()
  usePageDwellTracking('StyleDNA')
  useEffect(() => {
    trackEvent('view_style_dna')
  }, [])
  const currentProjectId = useStore((s) => s.currentProjectId)
  const projects = useStore((s) => s.projects)
  const allAssets = useStore((s) => s.assets)
  const allStyleRules = useStore((s) => s.styleRules)
  const allPerformanceRecords = useStore((s) => s.performanceRecords)
  const addStyleRules = useStore((s) => s.addStyleRules)
  const updateStyleRule = useStore((s) => s.updateStyleRule)
  const confirmStyleRule = useStore((s) => s.confirmStyleRule)
  const deleteStyleRule = useStore((s) => s.deleteStyleRule)
  const clearStyleRules = useStore((s) => s.clearStyleRules)
  const addStyleRule = useStore((s) => s.addStyleRule)
  const saveStyleDNA = useStore((s) => s.saveStyleDNA)
  const allStyleDNA = useStore((s) => s.styleDNA)

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  )
  const currentDNA = useMemo(
    () => allStyleDNA.find((d) => d.projectId === currentProjectId && d.status === 'active'),
    [allStyleDNA, currentProjectId]
  )

  const projectAssets = useMemo(
    () => allAssets.filter((a) => a.projectId === currentProjectId),
    [allAssets, currentProjectId]
  )

  const projectRecords = useMemo(
    () => allPerformanceRecords.filter((r) => r.projectId === currentProjectId),
    [allPerformanceRecords, currentProjectId]
  )

  const projectRules = useMemo(
    () => allStyleRules.filter((r) => r.projectId === currentProjectId),
    [allStyleRules, currentProjectId]
  )

  const confirmedRules = useMemo(
    () => projectRules.filter((r) => r.confirmed),
    [projectRules]
  )

  const unconfirmedRules = useMemo(
    () => projectRules.filter((r) => !r.confirmed),
    [projectRules]
  )

  // 模块1: 训练阶段
  const trainingPhase = useMemo(() => {
    const count = projectRecords.length
    if (count <= 5) return { label: '建立认知', color: 'amber', desc: `${count}/5 篇表现反馈` }
    if (count <= 20) return { label: '形成模型', color: 'blue', desc: `${count}/20 篇 · AI 正在建模` }
    return { label: '成熟模型', color: 'green', desc: `${count} 篇 · 账号模型成熟` }
  }, [projectRecords.length])

  // 模块2: 已确认规则按分类分组
  const confirmedByCategory = useMemo(() => {
    const groups = {}
    // 先按预定义分类排序
    CATEGORIES.forEach((cat) => {
      const rules = confirmedRules.filter((r) => r.category === cat)
      if (rules.length > 0) groups[cat] = rules
    })
    // 再补充其他分类（兼容旧数据）
    confirmedRules.forEach((r) => {
      if (!groups[r.category] && !CATEGORIES.includes(r.category)) {
        const rules = confirmedRules.filter((rule) => rule.category === r.category)
        groups[r.category] = rules
      }
    })
    return groups
  }, [confirmedRules])

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [showUploader, setShowUploader] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCategory, setNewCategory] = useState('内容人格')
  const [newRule, setNewRule] = useState('')
  // v9：DNA 维度默认折叠，避免首屏过载
  const [showAllDimensions, setShowAllDimensions] = useState(false)
  // 风格版本管理 state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPersona, setNewPersona] = useState('')
  const [newStructure, setNewStructure] = useState('')
  const [newVisual, setNewVisual] = useState('')
  const [newAudience, setNewAudience] = useState('')
  const [newTitleFormula, setNewTitleFormula] = useState('')
  const [newExpressions, setNewExpressions] = useState('')

  const projectDNAVersions = useMemo(
    () => allStyleDNA.filter((d) => d.projectId === currentProjectId).sort((a, b) => (b.version || 0) - (a.version || 0)),
    [allStyleDNA, currentProjectId]
  )

  const handleSetActive = (d) => {
    saveStyleDNA(currentProjectId, {
      contentPersona: d.contentPersona,
      writingStructure: d.writingStructure,
      visualStyle: d.visualStyle,
      audience: d.audience,
      titleFormula: d.titleFormula,
      frequentExpressions: d.frequentExpressions || [],
      topicPreference: d.topicPreference,
      hookPreference: d.hookPreference,
      contentStructurePreference: d.contentStructurePreference,
    })
  }

  const handleArchiveDNA = (d) => {
    if (!confirm(`确定归档 v${d.version} 吗？`)) return
    saveStyleDNA(currentProjectId, {
      ...d,
      contentPersona: d.contentPersona || '',
      writingStructure: d.writingStructure || '',
      visualStyle: d.visualStyle || '',
      audience: d.audience || '',
      titleFormula: d.titleFormula || '',
      status: 'archived',
    })
  }

  const handleCreateVersion = () => {
    if (!newPersona.trim() && !newStructure.trim() && !newAudience.trim()) {
      alert('至少填写一项风格字段（内容人设、写作结构或目标受众）')
      return
    }
    const exprArr = newExpressions
      .split(/[、,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    saveStyleDNA(currentProjectId, {
      contentPersona: newPersona.trim(),
      writingStructure: newStructure.trim(),
      visualStyle: newVisual.trim(),
      audience: newAudience.trim(),
      titleFormula: newTitleFormula.trim(),
      frequentExpressions: exprArr,
      source: 'manual',
    })
    setNewPersona('')
    setNewStructure('')
    setNewVisual('')
    setNewAudience('')
    setNewTitleFormula('')
    setNewExpressions('')
    setShowCreateForm(false)
  }

  const handleAnalyze = async (samples) => {
    setIsAnalyzing(true)
    setAnalyzeError('')
    try {
      const apiKey = localStorage.getItem('contentos_api_key')
      if (!apiKey) {
        setAnalyzeError('请先在设置页面配置 DeepSeek API Key')
        setIsAnalyzing(false)
        return
      }
      const text = await analyzeSamplesViaAI(currentProject, currentDNA, samples, apiKey)
      const rules = parseRulesResult(text)
      addStyleRules(currentProjectId, rules.map(r => ({
        category: r.category || '内容人格',
        rule: r.rule || '',
        source: 'AI分析样本',
        confidence: r.confidence || 0.8,
      })))
      setShowUploader(false)
    } catch (err) {
      const classified = classifyAIError(err)
      setAnalyzeError(classified.message)
    }
    setIsAnalyzing(false)
  }

  const handleAddRule = () => {
    if (!newRule.trim()) return
    addStyleRule(currentProjectId, {
      category: newCategory,
      rule: newRule.trim(),
      source: '手动添加',
      confidence: 1.0,
      confirmed: true,
    })
    setNewRule('')
    setShowAddForm(false)
  }

  const handleClearAll = () => {
    if (confirm('确定清空当前项目的所有风格规则？')) {
      clearStyleRules(currentProjectId)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 */}
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">AI 在学习你的内容风格</h1>
            <p className="text-sm text-gray-500 mt-1">
              {currentProject ? `当前账号：${currentProject.name}` : '让 AI 学会你的风格'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-center">
              <div className="text-lg font-semibold text-emerald-600 tabular">{confirmedRules.length}</div>
              <div className="text-[10px] text-gray-400">已确认</div>
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div className="text-center">
              <div className="text-lg font-semibold text-amber-500 tabular">{unconfirmedRules.length}</div>
              <div className="text-[10px] text-gray-400">待确认</div>
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-700 tabular">{projectRules.length}</div>
              <div className="text-[10px] text-gray-400">总规则</div>
            </div>
            {projectRules.length > 0 && (
              <button
                onClick={handleClearAll}
                className="ml-2 text-xs text-red-400 hover:text-red-500"
              >
                清空
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* 模块 1: 账号训练状态 */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <Activity size={15} className="text-brand-500" />
              AI 学习进度
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <TrainingStatCard
                icon={FileText}
                label="训练样本"
                value={projectAssets.length}
                sub="已归档内容"
                color="purple"
              />
              <TrainingStatCard
                icon={BarChart3}
                label="表现反馈"
                value={projectRecords.length}
                sub="已记录表现"
                color="blue"
              />
              <TrainingStatCard
                icon={ShieldCheck}
                label="已学习规则"
                value={projectRules.length}
                sub={`${confirmedRules.length} 条已确认`}
                color="green"
              />
              <TrainingStatCard
                icon={Brain}
                label="训练阶段"
                value={trainingPhase.label}
                sub={trainingPhase.desc}
                color={trainingPhase.color}
              />
            </div>
          </div>

          {/* 模块 1.2: 风格版本管理 */}
          <div className="rounded-2xl bg-[#1a1a2e] p-4 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/20 flex items-center justify-center">
                  <Dna size={15} className="text-[#a78bfa]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">风格版本管理</h3>
                  <p className="text-[11px] text-gray-400">Pipeline 会使用 active 版本作为生成依据</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-gradient-to-r from-[#7C3AED] to-[#a78bfa] hover:opacity-90 transition-opacity"
              >
                <Plus size={12} />
                创建新版本
              </button>
            </div>

            {/* 创建新版本表单 */}
            {showCreateForm && (
              <div className="mb-4 p-4 rounded-xl bg-[#252540] border border-[#7C3AED]/30 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">内容人设 <span className="text-gray-500">（表达风格）</span></label>
                    <textarea
                      value={newPersona}
                      onChange={(e) => setNewPersona(e.target.value)}
                      placeholder="如：30+职场辣妈，用朋友聊天的语气，带点俏皮的吐槽"
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7C3AED] resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">写作结构</label>
                    <textarea
                      value={newStructure}
                      onChange={(e) => setNewStructure(e.target.value)}
                      placeholder="如：痛点开场 → 给出3个具体步骤 → 结尾加鼓励金句"
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7C3AED] resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">视觉风格</label>
                    <input
                      type="text"
                      value={newVisual}
                      onChange={(e) => setNewVisual(e.target.value)}
                      placeholder="如：明亮暖色调，6张拼图，手写字贴纸点缀"
                      className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">目标受众</label>
                    <input
                      type="text"
                      value={newAudience}
                      onChange={(e) => setNewAudience(e.target.value)}
                      placeholder="如：25-35岁职场女性，想平衡工作与自我成长"
                      className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">标题公式</label>
                    <input
                      type="text"
                      value={newTitleFormula}
                      onChange={(e) => setNewTitleFormula(e.target.value)}
                      placeholder="如：「数字+痛点+反常识」例：3个让你越忙越穷的习惯"
                      className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">常用表达 <span className="text-gray-500">（逗号分隔）</span></label>
                    <input
                      type="text"
                      value={newExpressions}
                      onChange={(e) => setNewExpressions(e.target.value)}
                      placeholder="如：姐妹们、绝绝子、亲测有效、建议收藏"
                      className="w-full px-3 py-2 rounded-lg bg-[#1a1a2e] border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7C3AED]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateVersion}
                    className="px-4 py-1.5 rounded-full text-xs font-medium text-white bg-gradient-to-r from-[#7C3AED] to-[#a78bfa] hover:opacity-90"
                  >
                    创建并设为 active
                  </button>
                </div>
              </div>
            )}

            {/* 版本列表 */}
            {projectDNAVersions.length === 0 ? (
              <div className="py-8 text-center">
                <Dna size={32} className="mx-auto text-gray-600 mb-2" />
                <p className="text-sm text-gray-400">你还没有创建风格模型，Pipeline 将使用默认设置。</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-[#a78bfa] hover:text-white font-medium transition-colors"
                >
                  立即创建 →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {projectDNAVersions.map((d) => (
                  <div
                    key={d.id}
                    className={`p-4 rounded-xl transition-all ${
                      d.status === 'active'
                        ? 'bg-[#252540] border-2 border-[#7C3AED]'
                        : 'bg-[#20203a] border border-gray-700/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-white">v{d.version || 1}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              d.status === 'active'
                                ? 'bg-[#7C3AED] text-white'
                                : 'bg-gray-700 text-gray-300'
                            }`}
                          >
                            {d.status === 'active' ? 'Active · 当前使用' : 'Archived'}
                          </span>
                          {d.source && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700/70 text-gray-300">
                              {SOURCE_LABELS[d.source] || d.source}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500">
                            {d.createdAt ? new Date(d.createdAt).toLocaleDateString('zh-CN') : ''}
                          </span>
                        </div>
                        {d.contentPersona && (
                          <p className="text-xs text-gray-300 line-clamp-1 mb-0.5">
                            <span className="text-gray-500">人设：</span>{d.contentPersona}
                          </p>
                        )}
                        {d.audience && (
                          <p className="text-xs text-gray-400 line-clamp-1 mb-0.5">
                            <span className="text-gray-500">受众：</span>{d.audience}
                          </p>
                        )}
                        {d.titleFormula && (
                          <p className="text-xs text-gray-400 line-clamp-1">
                            <span className="text-gray-500">标题：</span>{d.titleFormula}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {d.status !== 'active' && (
                          <button
                            onClick={() => handleSetActive(d)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#7C3AED] hover:bg-[#6326cc] text-white transition-colors"
                          >
                            设为当前版本
                          </button>
                        )}
                        {d.status === 'active' ? (
                          <button
                            onClick={() => handleArchiveDNA(d)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                          >
                            归档
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveDNA(d)}
                            disabled
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-800 text-gray-600 cursor-not-allowed"
                          >
                            已归档
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 模块 1.5: AI 账号风格 DNA（v9：展示 onboarding 生成的六维度） */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-1.5">
                <Dna size={15} className="text-brand-500" />
                AI 学到的内容风格
              </h3>
              {currentDNA && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">
                  v{currentDNA.version} · 已生成
                </span>
              )}
            </div>
            {currentDNA ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {/* 默认只显示 3 个核心维度 */}
                  <div className="p-3 bg-purple-50/50 rounded-lg">
                    <div className="text-[11px] text-gray-400 mb-1">表达风格</div>
                    <div className="text-sm text-gray-700 leading-relaxed">{currentDNA.contentPersona || '—'}</div>
                  </div>
                  <div className="p-3 bg-pink-50/50 rounded-lg">
                    <div className="text-[11px] text-gray-400 mb-1">标题套路</div>
                    <div className="text-sm text-gray-700 leading-relaxed">{currentDNA.titleFormula || '—'}</div>
                  </div>
                  <div className="p-3 bg-amber-50/50 rounded-lg">
                    <div className="text-[11px] text-gray-400 mb-1">目标用户</div>
                    <div className="text-sm text-gray-700 leading-relaxed">{currentDNA.audience || '—'}</div>
                  </div>
                  {/* 折叠的维度 */}
                  {showAllDimensions && (
                    <>
                      <div className="p-3 bg-blue-50/50 rounded-lg">
                        <div className="text-[11px] text-gray-400 mb-1">内容结构</div>
                        <div className="text-sm text-gray-700 leading-relaxed">{currentDNA.writingStructure || '—'}</div>
                      </div>
                      <div className="p-3 bg-emerald-50/50 rounded-lg">
                        <div className="text-[11px] text-gray-400 mb-1">视觉偏好</div>
                        <div className="text-sm text-gray-700 leading-relaxed">{currentDNA.visualStyle || '—'}</div>
                      </div>
                      <div className="p-3 bg-indigo-50/50 rounded-lg">
                        <div className="text-[11px] text-gray-400 mb-1">常用表达</div>
                        <div className="text-sm text-gray-700 leading-relaxed">
                          {currentDNA.frequentExpressions?.length > 0
                            ? currentDNA.frequentExpressions.join('、')
                            : '—'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowAllDimensions(!showAllDimensions)}
                  className="mt-3 text-xs text-gray-500 hover:text-brand-600 transition-colors"
                >
                  {showAllDimensions ? '收起' : '查看全部 6 个维度'}
                </button>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">尚未生成风格模型</p>
                <p className="text-xs text-gray-400 mt-1">完成 Onboarding 或在下方上传样本分析</p>
              </div>
            )}
          </div>

          {/* 模块 2: AI 已经学会 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-emerald-500" />
                AI 已经学会
              </h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 border border-gray-200"
              >
                {showAddForm ? <X size={12} /> : <Plus size={12} />}
                {showAddForm ? '取消' : '添加规则'}
              </button>
            </div>

            {/* 手动添加规则表单 */}
            {showAddForm && (
              <div className="mb-4 p-3 bg-brand-50/30 rounded-lg border border-brand-100 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">分类</span>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="px-2.5 py-1.5 rounded-md border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  placeholder="输入风格规则，如：标题必须包含数字"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddRule}
                    disabled={!newRule.trim()}
                    className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40"
                  >
                    添加并确认
                  </button>
                </div>
              </div>
            )}

            {confirmedRules.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">AI 还没学会规则，上传样本后会自动生成</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(confirmedByCategory).map(([cat, rules]) => (
                  <div key={cat}>
                    <div className="text-[11px] font-medium text-gray-500 mb-1.5">{cat}</div>
                    <div className="divide-y divide-gray-50">
                      {rules.map((rule) => (
                        <ConfirmedRuleItem
                          key={rule.id}
                          rule={rule}
                          onUnconfirm={confirmStyleRule}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                    <ShieldCheck size={11} />
                    {confirmedRules.length} 条规则会在生成内容时优先应用
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 模块 3: 待确认学习 */}
          {unconfirmedRules.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <Sparkles size={15} className="text-brand-500" />
                  待确认学习
                </h3>
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {unconfirmedRules.length} 条待确认
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
                <p className="text-xs text-amber-700">
                  确认后规则才会用于内容生成
                </p>
              </div>

              <div className="space-y-2">
                {unconfirmedRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onConfirm={confirmStyleRule}
                    onEdit={updateStyleRule}
                    onDelete={deleteStyleRule}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 模块 4: 训练入口 */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <Brain size={15} className="text-brand-500" />
              训练入口
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <TrainingEntry
                icon={Upload}
                title="上传内容截图"
                desc="截图你发过的笔记，AI 自动识别并分析风格"
                color="purple"
                onClick={() => setShowUploader(!showUploader)}
              />
              <TrainingEntry
                icon={BarChart3}
                title="复盘表现数据"
                desc="记录内容表现，AI 从数据中学习"
                color="blue"
                onClick={() => navigate('/data-center/content-data')}
              />
              <TrainingEntry
                icon={Stethoscope}
                title="运行账号诊断"
                desc="AI 全面体检账号，发现优化方向"
                color="green"
                onClick={() => navigate('/data-center/diagnosis')}
              />
            </div>

            {/* 样本上传区（可折叠） */}
            {showUploader && (
              <div className="mt-4">
                <SampleUploader onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
                {analyzeError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 mb-2">{analyzeError}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setAnalyzeError(''); setShowUploader(true) }}
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
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
