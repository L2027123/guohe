import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Key, User, CreditCard, AlertTriangle, Check, Eye, EyeOff, Loader2, X, ArrowLeft, ExternalLink } from 'lucide-react'
import { useStore } from '../store/useStore'
import { testAPIConnection } from '../utils/aiClient'

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnInfo = location.state
  const user = useStore((s) => s.user)
  const plan = useStore((s) => s.plan)
  const credits = useStore((s) => s.credits)
  const resetStore = useStore((s) => s.resetStore)

  // API Key 状态
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [keyStatus, setKeyStatus] = useState(Boolean(localStorage.getItem('contentos_api_key')))
  // 测试连接状态
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // null | { success, message }

  // 智谱 API Key 状态（截图识别用）
  const [zhipuKey, setZhipuKey] = useState('')
  const [showZhipuKey, setShowZhipuKey] = useState(false)
  const [zhipuSaved, setZhipuSaved] = useState(false)
  const [zhipuKeyStatus, setZhipuKeyStatus] = useState(Boolean(localStorage.getItem('zhipu_api_key')))

  const handleSaveZhipuKey = () => {
    if (zhipuKey.trim()) {
      localStorage.setItem('zhipu_api_key', zhipuKey.trim())
      setZhipuKey('')
      setZhipuKeyStatus(true)
      setZhipuSaved(true)
      setTimeout(() => setZhipuSaved(false), 2000)
    }
  }

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('contentos_api_key', apiKey.trim())
      setApiKey('')
      setKeyStatus(true)
      setSaved(true)
      setTestResult(null)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleTestConnection = async () => {
    const keyToTest = apiKey.trim() || localStorage.getItem('contentos_api_key')
    if (!keyToTest) {
      setTestResult({ success: false, message: '请先输入 API Key' })
      return
    }
    setTesting(true)
    setTestResult(null)
    const result = await testAPIConnection(keyToTest)
    setTestResult(result)
    setTesting(false)
  }

  const handleReset = () => {
    if (confirm('确定要重置所有数据吗？此操作不可恢复，将清空所有项目、内容、规则和表现记录。')) {
      resetStore()
      localStorage.removeItem('contentos_api_key')
      setKeyStatus(false)
      alert('数据已重置，页面即将刷新')
      window.location.reload()
    }
  }

  // 计划名称映射
  const planName = { free: '免费版', pro: '专业版', lifetime: '终身版' }[plan.tier] || '免费版'

  // 额度展示
  const remainingGenerate = credits.aiGenerate === Infinity ? '无限' : Math.max(0, credits.aiGenerate - (credits.used.aiGenerate || 0))
  const remainingDiagnosis = credits.aiDiagnosis === Infinity ? '无限' : Math.max(0, credits.aiDiagnosis - (credits.used.aiDiagnosis || 0))

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => {
              if (returnInfo?.from) {
                navigate(returnInfo.from, { state: returnInfo.fromState })
              } else if (window.history.length > 1) {
                navigate(-1)
              } else {
                navigate('/dashboard')
              }
            }}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">设置</h1>
        </div>
        <p className="text-sm text-gray-500">
          {returnInfo?.from ? (
            <>配置完成后可以返回，继续未完成的流程</>
          ) : (
            <>系统设置</>
          )}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* API Key 配置 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Key size={18} className="text-brand-500" />
              <h3 className="font-semibold text-gray-900">DeepSeek API Key</h3>
              {keyStatus ? (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium flex items-center gap-1">
                  <Check size={10} /> 已配置
                </span>
              ) : (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
                  需要配置
                </span>
              )}
            </div>
            <div className="mb-4 p-3 rounded-lg bg-amber-50/50 border border-amber-100 text-xs text-amber-800 leading-relaxed space-y-1.5">
              <div className="flex items-start gap-2">
                <span>1. 打开</span>
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:text-brand-700 underline inline-flex items-center gap-0.5 font-medium"
                >
                  platform.deepseek.com/api_keys
                  <ExternalLink size={11} />
                </a>
              </div>
              <div>2. 用手机号或 Google 账号登录（新用户送免费额度）</div>
              <div>3. 左侧菜单选择「API Keys」→ 点击「创建 API Key」</div>
              <div>4. 复制 sk- 开头的字符串，粘贴到下方保存</div>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              用于 AI 内容生成和风格分析，Key 只保存在你的浏览器中
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={keyStatus ? '已配置，输入新 Key 可替换' : '请输入 sk- 开头的 API Key'}
                  className="w-full px-3 py-2 pr-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                onClick={handleSaveKey}
                disabled={!apiKey.trim()}
                className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  saved
                    ? 'bg-emerald-500 text-white'
                    : apiKey.trim()
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saved ? <Check size={16} /> : '保存'}
              </button>
            </div>
            {saved && returnInfo?.from && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <button
                  onClick={() => navigate(returnInfo.from, { state: returnInfo.fromState })}
                  className="w-full py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  {returnInfo.returnLabel || '返回上一页'}
                  <ArrowLeft size={14} className="rotate-180" />
                </button>
              </div>
            )}
            {!saved && returnInfo?.from && !keyStatus && (
              <p className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400 text-center">
                暂不配置也可以先体验产品，之后随时可以回到此处设置
              </p>
            )}
            {!saved && returnInfo?.from && keyStatus && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <button
                  onClick={() => navigate(returnInfo.from, { state: returnInfo.fromState })}
                  className="w-full py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  {returnInfo.returnLabel || '返回上一页'}
                  <ArrowLeft size={14} className="rotate-180" />
                </button>
              </div>
            )}
            {/* 测试连接 */}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleTestConnection}
                disabled={testing || (!apiKey.trim() && !keyStatus)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {testing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    测试中...
                  </>
                ) : (
                  '测试 API 连接'
                )}
              </button>
              {testResult && (
                <span
                  className={`inline-flex items-center gap-1 text-sm font-medium ${
                    testResult.success ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {testResult.success ? (
                    <Check size={14} />
                  ) : (
                    <X size={14} />
                  )}
                  {testResult.message}
                </span>
              )}
            </div>
          </div>

          {/* 智谱 API Key 配置（截图识别用） */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Key size={18} className="text-brand-500" />
              <h3 className="font-semibold text-gray-900">智谱 API Key（截图识别）</h3>
              {zhipuKeyStatus ? (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium flex items-center gap-1">
                  <Check size={10} /> 已配置
                </span>
              ) : (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
                  需要配置
                </span>
              )}
            </div>
            <div className="mb-4 p-3 rounded-lg bg-amber-50/50 border border-amber-100 text-xs text-amber-800 leading-relaxed space-y-1.5">
              <div className="flex items-start gap-2">
                <span>1. 打开</span>
                <a
                  href="https://open.bigmodel.cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:text-brand-700 underline inline-flex items-center gap-0.5 font-medium"
                >
                  open.bigmodel.cn
                  <ExternalLink size={11} />
                </a>
              </div>
              <div>2. 手机号注册登录</div>
              <div>3. 左侧「API Keys」→ 创建 API Key</div>
              <div>4. 复制 Key 粘贴到下方保存（GLM-4V-Flash 永久免费）</div>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              用于截图识别文字（小红书/抖音截图 → 文字），Key 只保存在你的浏览器中
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type={showZhipuKey ? 'text' : 'password'}
                  value={zhipuKey}
                  onChange={(e) => setZhipuKey(e.target.value)}
                  placeholder={zhipuKeyStatus ? '已配置，输入新 Key 可替换' : '请输入智谱 API Key'}
                  className="w-full px-3 py-2 pr-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                />
                <button
                  onClick={() => setShowZhipuKey(!showZhipuKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showZhipuKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                onClick={handleSaveZhipuKey}
                disabled={!zhipuKey.trim()}
                className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  zhipuSaved
                    ? 'bg-emerald-500 text-white'
                    : zhipuKey.trim()
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {zhipuSaved ? <Check size={16} /> : '保存'}
              </button>
            </div>
          </div>

          {/* 用户信息 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <User size={18} className="text-brand-500" />
              <h3 className="font-semibold text-gray-900">用户信息</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[11px] text-gray-500 mb-1">用户名</div>
                <div className="text-gray-900">{user.name || '未设置'}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 mb-1">邮箱</div>
                <div className="text-gray-900">{user.email || '未设置'}</div>
              </div>
            </div>
          </div>

          {/* 计划与额度 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={18} className="text-brand-500" />
              <h3 className="font-semibold text-gray-900">计划与额度</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">当前套餐</span>
                <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 font-medium">{planName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">AI 生成剩余次数</span>
                <span className="text-gray-900 font-medium">{remainingGenerate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">AI 诊断剩余次数</span>
                <span className="text-gray-900 font-medium">{remainingDiagnosis}</span>
              </div>
            </div>
          </div>

          {/* 危险操作 */}
          <div className="bg-white rounded-xl border border-red-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-red-500" />
              <h3 className="font-semibold text-gray-900">危险操作</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                重置将清空所有项目、内容、规则和表现记录
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                重置所有数据
              </button>
            </div>
          </div>

          {/* 返回按钮 */}
          <button
            onClick={() => {
              if (returnInfo?.from) {
                navigate(returnInfo.from, { state: returnInfo.fromState })
              } else if (window.history.length > 1) {
                navigate(-1)
              } else {
                navigate('/dashboard')
              }
            }}
            className="w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors inline-flex items-center justify-center gap-1.5"
          >
            {returnInfo?.returnLabel || '返回'}
            <ArrowLeft size={14} className="rotate-180" />
          </button>
        </div>
      </div>
    </div>
  )
}
