import { getApiKey } from '../utils/apiKey'
import { useNavigate } from 'react-router-dom'
import { Target, Sparkles, ChevronRight, Filter, Search, Plus, X, Check, Loader2 } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { callAI, classifyAIError } from '../utils/aiClient'
import { trackEvent } from '../utils/tracker'
import { usePageDwellTracking } from '../utils/usePageDwellTracking'

const CATEGORIES = ['全部', '家居', '穿搭', '美妆', '干货', '美食', '旅行', '健身']

// v9：基于账号 DNA 的 AI 选题生成
async function generateTopicsViaAI(project, dna, apiKey) {
  const prompt = `你是一位擅长${project.platform || '小红书'}内容策划的专家。请基于以下账号信息生成 5 个选题。

【账号信息】
- 账号名称：${project.name}
- 平台：${project.platform}
- 领域：${project.category}
- 目标受众：${project.targetAudience || '未指定'}

【账号风格模型】
- 内容人格：${dna?.contentPersona || '未指定'}
- 目标用户：${dna?.audience || '未指定'}
- 标题套路：${dna?.titleFormula || '未指定'}
- 内容结构：${dna?.writingStructure || '未指定'}

请生成 5 个符合该账号风格的选题，简洁输出，每项不超过20字：
- title：选题标题（带 emoji，20 字以内）
- reason：推荐理由（15字以内）
- angle：切入角度（15字以内）
- matchScore：匹配度（0-100）

输出严格 JSON 数组（不要 markdown 包裹）：
[
  {"title":"","reason":"","angle":"","matchScore":90}
]`

  return callAI(apiKey, prompt, { temperature: 0.8, max_tokens: 1000 })
}

function parseTopicsResult(text) {
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()
  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) throw new Error('AI 返回格式错误')
  return parsed
}

export default function Topics() {
  const navigate = useNavigate()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const allTopics = useStore((s) => s.topics)
  const allProjects = useStore((s) => s.projects)
  const allStyleDNA = useStore((s) => s.styleDNA)
  const adoptTopic = useStore((s) => s.adoptTopic)
  const addTopic = useStore((s) => s.addTopic)

  const currentProject = useMemo(
    () => allProjects.find((p) => p.id === currentProjectId),
    [allProjects, currentProjectId]
  )
  const currentDNA = useMemo(
    () => allStyleDNA.find((d) => d.projectId === currentProjectId && d.status === 'active'),
    [allStyleDNA, currentProjectId]
  )

  usePageDwellTracking('Topics')
  useEffect(() => {
    trackEvent('view_topics')
  }, [])

  const [platform, setPlatform] = useState('全部')
  const [category, setCategory] = useState('全部')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCategory, setNewCategory] = useState('家居')
  const [isGenerating, setIsGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  // v9：默认只显示 3 条选题，避免首屏过载
  const [showAllTopics, setShowAllTopics] = useState(false)

  const handleGenerateAI = async () => {
    if (!currentProject) {
      setGenError('请先完成账号 Onboarding')
      return
    }
    const apiKey = getApiKey()
    if (!apiKey) {
      setGenError('请先在设置页面配置 DeepSeek API Key')
      return
    }
    setIsGenerating(true)
    setGenError('')
    try {
      const text = await generateTopicsViaAI(currentProject, currentDNA, apiKey)
      const topics = parseTopicsResult(text)
      trackEvent('topics_generate')
      topics.forEach((t) => {
        addTopic(currentProjectId, {
          title: t.title || '未命名选题',
          description: t.reason ? `【${t.angle || '推荐角度'}】${t.reason}` : '',
          matchScore: t.matchScore || 80,
          emoji: '✨',
          category: currentProject.category || '其他',
          styleDNAId: currentDNA?.id || null,
        })
      })
    } catch (err) {
      const classified = classifyAIError(err)
      setGenError(classified.message)
    }
    setIsGenerating(false)
  }

  const topics = useMemo(
    () => allTopics.filter((t) => t.projectId === currentProjectId),
    [allTopics, currentProjectId]
  )

  const filtered = useMemo(
    () => topics
      .filter((t) => category === '全部' || t.category === category)
      .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase())),
    [topics, category, search]
  )

  const pendingTopics = useMemo(
    () => filtered.filter((t) => t.status === 'pending'),
    [filtered]
  )
  const adoptedTopics = useMemo(
    () => filtered.filter((t) => t.status === 'adopted'),
    [filtered]
  )

  const handleAdopt = (topicId) => {
    adoptTopic(topicId)
    navigate('/factory/pipeline', { state: { topicId } })
  }

  const handleAdd = () => {
    if (!newTitle.trim()) return
    addTopic(currentProjectId, {
      title: newTitle.trim(),
      description: newDesc.trim(),
      matchScore: 80,
      emoji: '📌',
      category: newCategory,
    })
    setNewTitle('')
    setNewDesc('')
    setShowForm(false)
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">选题建议</h1>
            <p className="text-sm text-gray-500 mt-1">AI 推荐选题，采纳后开始生成内容</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isGenerating ? '生成中...' : 'AI 生成选题'}
            </button>
            {/* 手动新建为高级功能，已有选题后才显示 */}
            {topics.length > 0 && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                {showForm ? <X size={16} /> : <Plus size={16} />}
                {showForm ? '取消' : '新建选题'}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* 筛选栏 */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
              <Filter size={14} />
              <span>筛选：</span>
            </div>
            <div className="flex items-center gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    category === c
                      ? 'bg-brand-100 text-brand-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[180px] relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索选题..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:bg-white"
              />
            </div>
          </div>

          {/* 新建选题表单 */}
          {showForm && (
            <div className="bg-white rounded-xl border border-brand-200 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles size={16} className="text-brand-500" />
                新建选题
              </h3>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="选题标题，如：租房改造｜房东问我是不是换了套房"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
              />
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="选题描述（可选）"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400 resize-none"
              />
              <div className="flex items-center gap-3">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                >
                  {CATEGORIES.filter((c) => c !== '全部').map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                >
                  创建选题
                </button>
              </div>
            </div>
          )}

          {/* 已采纳选题 */}
          {adoptedTopics.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Check size={14} className="text-emerald-500" />
                已采纳 · 待生产 ({adoptedTopics.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {adoptedTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="bg-emerald-50/50 rounded-xl border border-emerald-200 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-lg shrink-0">
                        {topic.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{topic.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{topic.description}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/factory/pipeline', { state: { topicId: topic.id } })}
                      className="mt-3 w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                    >
                      进入流水线 <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 待采纳选题（默认显示 3 条，超出折叠） */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Target size={14} className="text-brand-500" />
              推荐选题 ({pendingTopics.length})
            </h3>
            {pendingTopics.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Target size={24} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-1">
                  {topics.length === 0 ? '点击「AI 生成选题」开始' : '暂无符合条件的选题'}
                </p>
                {genError && (
                  <div className="mt-4 text-left">
                    <p className="text-sm text-red-500 mb-3">{genError}</p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={handleGenerateAI}
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
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {(showAllTopics ? pendingTopics : pendingTopics.slice(0, 3)).map((topic) => (
                    <div
                      key={topic.id}
                      className="bg-white rounded-xl border border-gray-100 p-4 hover:border-brand-200 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg shrink-0">
                          {topic.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors">
                            {topic.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">{topic.description}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 font-medium">
                              匹配度 {topic.matchScore}%
                            </span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              {topic.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAdopt(topic.id)}
                        className="mt-3 w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-brand-600 transition-colors"
                      >
                        采纳选题 <ChevronRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {/* 查看更多 */}
                {pendingTopics.length > 3 && (
                  <button
                    onClick={() => setShowAllTopics(!showAllTopics)}
                    className="mt-3 w-full py-2.5 text-center text-xs text-gray-500 hover:text-brand-600 transition-colors"
                  >
                    {showAllTopics ? '收起' : `查看全部 ${pendingTopics.length} 条选题`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}