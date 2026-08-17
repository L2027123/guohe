import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackEvent } from '../utils/tracker'
import { usePageDwellTracking } from '../utils/usePageDwellTracking'
import { smartRecognize } from '../utils/visionOCR'
import {
  Search,
  Camera,
  ChevronDown,
  Settings,
  Flame,
  ArrowRight,
  BookOpen,
  BarChart3,
  Dna,
  TrendingUp,
  Wand2,
  Eye,
  Edit3,
  X,
  Lightbulb,
  Target,
  Zap,
  ChevronRight,
} from 'lucide-react'

const MORE_LINKS = [
  { label: '创作工厂', path: '/factory/pipeline', icon: Wand2 },
  { label: '研究库', path: '/workbench/case-library', icon: BookOpen },
  { label: '风格DNA', path: '/factory/style-dna', icon: Dna },
  { label: '数据复盘', path: '/workbench/performance-review', icon: BarChart3 },
  { label: '设置', path: '/settings', icon: Settings },
]

export default function Landing() {
  const navigate = useNavigate()
  const [pastedText, setPastedText] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrPhase, setOcrPhase] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrMethod, setOcrMethod] = useState(null) // 'vision' | 'tesseract'
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  usePageDwellTracking('Landing')
  useEffect(() => {
    trackEvent('landing_view')
  }, [])

  const handleScreenshot = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrLoading(true)
    setOcrProgress(0)
    setError('')
    setShowPreview(false)

    setOcrPhase('vision')

    try {
      const { text, method } = await smartRecognize(file, (phase, pct) => {
        setOcrPhase(phase)
        setOcrProgress(pct)
      })
      setOcrMethod(method)

      if (!text || text.trim().length < 3) {
        setError('图片中没有识别到文字，请换一张更清晰的截图，或手动粘贴文案')
        setOcrLoading(false)
      } else {
        setPastedText(text.trim())
        setShowPreview(true)
      }
    } catch (err) {
      const msg = err.message || ''
      if (msg === 'NO_ZHIPU_KEY') {
        setError('截图识别需要智谱 API Key（免费），请在设置中配置，或手动粘贴文案')
      } else if (msg.includes('timeout') || msg.includes('超时')) {
        setError('网络超时，请检查网络后重试，或手动粘贴文案')
      } else if (msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
        setError('网络连接失败，请检查网络后重试，或手动粘贴文案')
      } else {
        setError('截图识别失败：' + (msg || '请手动粘贴文案'))
      }
    } finally {
      setOcrLoading(false)
      setOcrPhase(null)
      setOcrProgress(0)
      if (e.target) e.target.value = ''
    }
  }

  const handleAnalyze = () => {
    if (!pastedText.trim()) return
    trackEvent('click_start_analyze')
    navigate('/workbench/competitor-analyzer', { state: { quickInput: pastedText.trim() } })
  }

  const handleExample = () => {
    trackEvent('click_example')
    const exampleText = '30岁前必须知道的5个赚钱真相\n\n1. 存钱不如存认知\n2. 选对赛道比努力重要\n3. 赚钱的核心是信息差\n4. 人脉不是认识多少人而是多少人需要你\n5. 副业是你人生的B计划'
    navigate('/workbench/competitor-analyzer', { state: { quickInput: exampleText } })
  }

  const phaseLabel = () => {
    if (ocrPhase === 'vision') return `AI 识别中... ${ocrProgress}%`
    return '识别中...'
  }

  const phaseColor = () => 'text-brand-400'
  const phaseBar = () => 'bg-brand-500'

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-gray-800/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-sm font-bold">
            C
          </div>
          <span className="font-semibold text-[16px] tracking-tight">果核</span>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          设置
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-3 flex items-center gap-2">
            <Search size={28} className="text-brand-400" />
            果核
          </h1>
          <p className="text-sm text-gray-400 mb-8">30秒看透爆款设计逻辑</p>

          <textarea
            value={pastedText}
            onChange={(e) => {
              setPastedText(e.target.value)
              setShowPreview(false)
            }}
            placeholder="粘贴任意爆款标题+正文，AI自动拆解它的设计机关"
            rows={6}
            className="w-full px-4 py-3.5 rounded-xl bg-gray-900/60 border border-gray-700 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-brand-500 resize-none leading-relaxed text-left"
          />

          {/* 识别结果预览卡片 */}
          {showPreview && pastedText && (
            <div className="w-full mt-2 rounded-xl border border-brand-500/30 bg-brand-500/10 p-3 text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Eye size={14} className="text-brand-400" />
                  <span className="text-xs font-medium text-brand-300">
                    截图已识别，请确认或编辑后开始拆解
                  </span>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-gray-900/80 border border-gray-700 text-gray-200 text-xs resize-none focus:outline-none focus:border-brand-500 font-mono leading-relaxed"
              />
              <p className="text-[10px] text-gray-500 mt-1.5">
                如果识别不准，可以直接在上方编辑修正，再点「开始拆解」
              </p>
            </div>
          )}

          {error && (
            <p className="mt-2 text-xs text-red-400 self-start">{error}</p>
          )}

          {ocrLoading && (
            <div className="mt-2 self-start w-full">
              <p className={`text-xs ${phaseColor()}`}>{phaseLabel()}</p>
              <div className="mt-1 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${phaseBar()}`}
                  style={{ width: `${Math.max(ocrProgress, 3)}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 w-full">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrLoading}
              className="flex-1 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera size={16} />
              {ocrLoading ? '识别中...' : '上传截图'}
            </button>
            <button
              onClick={handleAnalyze}
              disabled={!pastedText.trim() || ocrLoading}
              className="flex-1 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-600/20"
            >
              <Search size={16} />
              开始拆解
              <ArrowRight size={16} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleScreenshot}
          />

          <div className="mt-10 w-full flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-500 whitespace-nowrap">不知道拆什么？</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <button
            onClick={handleExample}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900/60 border border-gray-700 hover:border-brand-500/50 hover:bg-gray-800 text-gray-300 hover:text-white text-sm transition-all"
          >
            <Flame size={15} className="text-amber-400" />
            先拆这个示例
          </button>

          {/* 示例拆解报告 */}
          <div className="mt-10 w-full text-left">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full bg-brand-500" />
              <span className="text-xs font-medium text-gray-400">拆解完长这样 ↓</span>
            </div>

            <div className="rounded-2xl bg-gray-900/60 border border-gray-800 overflow-hidden">
              {/* 案例标题 */}
              <div className="px-5 py-4 border-b border-gray-800/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">小红书爆款</span>
                  <span className="text-[10px] text-gray-600">12.5w 赞 · 3.2w 收藏</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-200">为什么劝普通女生一定要存钱？这3个真相没人告诉你</h3>
              </div>

              {/* 拆解结果 */}
              <div className="px-5 py-4 space-y-4">
                {/* 一句话总结 */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb size={13} className="text-brand-400" />
                    <span className="text-xs font-medium text-brand-300">一句话总结</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed pl-5">
                    用「三个真相」包装常识，把「存钱」从理财话题偷换成「人生选择权」话题，制造认知差
                  </p>
                </div>

                {/* 操作公式 */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Zap size={13} className="text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-300">操作公式</span>
                  </div>
                  <div className="pl-5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">反直觉结论</span>
                    <ChevronRight size={10} className="text-gray-600" />
                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">拆解3个真相</span>
                    <ChevronRight size={10} className="text-gray-600" />
                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">故事+金句</span>
                    <ChevronRight size={10} className="text-gray-600" />
                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">情绪号召</span>
                  </div>
                </div>

                {/* 关键机关 */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Target size={13} className="text-rose-400" />
                    <span className="text-xs font-medium text-rose-300">关键机关</span>
                  </div>
                  <div className="pl-5 space-y-1.5">
                    <div className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-brand-500 font-mono mt-0.5">01</span>
                      <span>标题用「为什么劝…一定要…」制造紧迫感，触发好奇</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-brand-500 font-mono mt-0.5">02</span>
                      <span>3个真相 = 结构化输出，降低阅读门槛，提升收藏率</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-brand-500 font-mono mt-0.5">03</span>
                      <span>反复强调「普通女生」建立身份认同，拉近距离</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="px-5 py-3 bg-gray-900/80 border-t border-gray-800/50">
                <button
                  onClick={handleExample}
                  className="w-full py-2.5 rounded-lg bg-brand-600/20 border border-brand-500/30 hover:bg-brand-600/30 text-brand-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  我也要拆一个
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12 w-full">
            <button
              onClick={() => setShowMore((v) => !v)}
              className="mx-auto inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Settings size={13} />
              更多功能
              <ChevronDown
                size={13}
                className={`transition-transform ${showMore ? 'rotate-180' : ''}`}
              />
            </button>

            {showMore && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MORE_LINKS.map((link) => {
                  const Icon = link.icon
                  return (
                    <button
                      key={link.path}
                      onClick={() => navigate(link.path)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-900/40 border border-gray-800 hover:border-gray-700 hover:bg-gray-900/70 text-gray-300 text-sm transition-all text-left"
                    >
                      <Icon size={16} className="text-gray-400 shrink-0" />
                      <span className="flex-1">{link.label}</span>
                      <ArrowRight size={14} className="text-gray-600" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center pb-8 px-6">
        <p className="text-xs text-gray-600">果核 © 2026 · 破解高手爆款，找到你的内容机会</p>
      </footer>
    </div>
  )
}
