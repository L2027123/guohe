import { getApiKey } from '../utils/apiKey'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Lightbulb,
  Loader2,
  X,
  Sparkles,
  Trash2,
  ArrowRight,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { callAI, classifyAIError } from '../utils/aiClient'

// AI 拆解爆款内容
async function analyzeViralContent(text, apiKey) {
  const prompt = `你是一名爆款内容分析专家。请拆解以下优秀内容的结构规律。

【待分析内容】
${text}

输出严格JSON格式（不要markdown包裹）：
{
  "titleFormula": "标题规律，30字以内",
  "hookStyle": "开头Hook方式，30字以内",
  "structurePattern": "内容结构规律，50字以内",
  "emotionalTrigger": "情绪触发点，30字以内",
  "ctaStyle": "CTA方式，30字以内",
  "summary": "一句话总结这条内容的爆款逻辑，50字以内"
}`

  return callAI(apiKey, prompt, { temperature: 0.4, max_tokens: 800 })
}

function parseViralResult(text) {
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()
  return JSON.parse(cleaned)
}

export default function Inspiration() {
  const navigate = useNavigate()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const allPatterns = useStore((s) => s.contentPatterns)
  const addContentPattern = useStore((s) => s.addContentPattern)
  const deleteContentPattern = useStore((s) => s.deleteContentPattern)

  const [input, setInput] = useState('')
  const [status, setStatus] = useState('idle') // idle | analyzing | done | error
  const [error, setError] = useState('')
  const [lastResult, setLastResult] = useState(null)

  const projectPatterns = useMemo(
    () => allPatterns.filter((p) => p.projectId === currentProjectId),
    [allPatterns, currentProjectId]
  )

  const handleAnalyze = async () => {
    if (!input.trim() || input.trim().length < 30) {
      setError('请粘贴至少 30 字的内容')
      return
    }

    const apiKey = getApiKey()
    if (!apiKey) {
      setError('请先配置 DeepSeek API Key')
      setStatus('error')
      return
    }

    setStatus('analyzing')
    setError('')
    try {
      const text = await analyzeViralContent(input.trim(), apiKey)
      const result = parseViralResult(text)

      // 保存到 contentPatterns
      addContentPattern(currentProjectId, {
        type: 'viral_structure',
        pattern: result.summary || '爆款模式',
        description: result.summary || '',
        deconstruction: {
          titleFormula: result.titleFormula || '',
          hookStyle: result.hookStyle || '',
          structurePattern: result.structurePattern || '',
          emotionalTrigger: result.emotionalTrigger || '',
          ctaStyle: result.ctaStyle || '',
        },
        source: 'user_upload',
        sourceText: input.trim().slice(0, 200),
        confidence: 0.85,
      })

      setLastResult(result)
      setStatus('done')
      setInput('')
    } catch (err) {
      const classified = classifyAIError(err)
      setError(classified.message)
      setStatus('error')
    }
  }

  const handleDelete = (id) => {
    deleteContentPattern(id)
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">灵感捕手</h1>
        <p className="text-sm text-gray-500 mt-1">
          粘贴优秀内容，AI 拆解爆款规律，生成时自动参考
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 使用说明 */}
          <div className="bg-gradient-to-br from-brand-50 to-purple-50 rounded-xl border border-brand-100 p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
                <Lightbulb size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-3">果核 爆款拆解</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1.5">你可以复制这些内容：</p>
                    <ul className="space-y-1 text-gray-700">
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-brand-500" />
                        小红书笔记
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-brand-500" />
                        TikTok 脚本
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-brand-500" />
                        公众号文章
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1.5">果核 会分析：</p>
                    <ul className="space-y-1 text-gray-700">
                      <li className="flex items-center gap-1.5">
                        <Sparkles size={11} className="text-purple-500" />
                        Hook（开头钩子）
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Sparkles size={11} className="text-purple-500" />
                        内容结构
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Sparkles size={11} className="text-purple-500" />
                        情绪触发
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Sparkles size={11} className="text-purple-500" />
                        CTA（行动号召）
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Sparkles size={11} className="text-purple-500" />
                        爆款规律
                      </li>
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  分析结果会自动保存，在生成内容时作为参考
                </p>
              </div>
            </div>
          </div>

          {/* 输入区 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={18} className="text-brand-600" />
              <h3 className="font-semibold text-gray-900">粘贴优秀内容</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              粘贴一篇你认为写得好的内容（自己的或别人的都可以），AI 会拆解它的标题规律、Hook 方式、内容结构、情绪触发和 CTA
            </p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="粘贴优秀内容正文...（至少 30 字）"
              rows={6}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:border-brand-400 resize-none mb-3"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {input.length} 字 · {input.length >= 30 ? '可以分析' : '至少 30 字'}
              </span>
              <button
                onClick={handleAnalyze}
                disabled={status === 'analyzing' || input.length < 30}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === 'analyzing' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    AI 拆解中...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    AI 拆解爆款规律
                  </>
                )}
              </button>
            </div>
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 mb-2">{error}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAnalyze}
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

          {/* 最近拆解结果 */}
          {status === 'done' && lastResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-emerald-600" />
                <h3 className="font-semibold text-gray-900">拆解完成，已保存到爆款模式库</h3>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-500 shrink-0 w-20">标题规律:</span>
                  <span className="text-gray-900">{lastResult.titleFormula}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 shrink-0 w-20">Hook 方式:</span>
                  <span className="text-gray-900">{lastResult.hookStyle}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 shrink-0 w-20">内容结构:</span>
                  <span className="text-gray-900">{lastResult.structurePattern}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 shrink-0 w-20">情绪触发:</span>
                  <span className="text-gray-900">{lastResult.emotionalTrigger}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 shrink-0 w-20">CTA 方式:</span>
                  <span className="text-gray-900">{lastResult.ctaStyle}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => navigate('/factory/pipeline')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                >
                  去生成内容 <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => {
                    setLastResult(null)
                    setStatus('idle')
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  继续添加下一篇
                </button>
              </div>
            </div>
          )}

          {/* 已保存的爆款模式列表 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                已学习的爆款模式（{projectPatterns.length}）
              </h3>
              {projectPatterns.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 font-medium">
                  生成时自动参考 Top 3
                </span>
              )}
            </div>

            {projectPatterns.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Lightbulb size={20} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-400 mb-1">暂无爆款模式</p>
                <p className="text-xs text-gray-400">
                  粘贴优秀内容，让 AI 拆解爆款规律
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {projectPatterns.map((p) => (
                  <div key={p.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {p.pattern}
                        </div>
                        {p.sourceText && (
                          <div className="text-xs text-gray-400 line-clamp-1">
                            来源：{p.sourceText}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1 text-gray-400 hover:text-red-500 shrink-0 ml-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {p.deconstruction && (
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        {p.deconstruction.titleFormula && (
                          <div className="text-gray-600">
                            <span className="text-gray-400">标题：</span>
                            {p.deconstruction.titleFormula}
                          </div>
                        )}
                        {p.deconstruction.hookStyle && (
                          <div className="text-gray-600">
                            <span className="text-gray-400">Hook：</span>
                            {p.deconstruction.hookStyle}
                          </div>
                        )}
                        {p.deconstruction.structurePattern && (
                          <div className="text-gray-600 col-span-2">
                            <span className="text-gray-400">结构：</span>
                            {p.deconstruction.structurePattern}
                          </div>
                        )}
                        {p.deconstruction.emotionalTrigger && (
                          <div className="text-gray-600">
                            <span className="text-gray-400">情绪：</span>
                            {p.deconstruction.emotionalTrigger}
                          </div>
                        )}
                        {p.deconstruction.ctaStyle && (
                          <div className="text-gray-600">
                            <span className="text-gray-400">CTA：</span>
                            {p.deconstruction.ctaStyle}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                      <span>置信度 {Math.round((p.confidence || 0) * 100)}%</span>
                      <span>·</span>
                      <span>{p.source === 'user_upload' ? '用户上传' : 'AI 提取'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 前往 Pipeline */}
          {projectPatterns.length > 0 && (
            <div className="bg-brand-50/50 rounded-xl p-5 text-center">
              <p className="text-sm text-gray-600 mb-3">
                已学习 {projectPatterns.length} 条爆款模式，生成内容时将自动参考 Top 3
              </p>
              <button
                onClick={() => navigate('/factory/pipeline')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
              >
                前往生成内容 <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
